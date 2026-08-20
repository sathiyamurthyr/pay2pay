import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import axios from "axios";
import { soundSystem } from "@/lib/audio-engine";

export interface SecuritySettings {
  auto_lock_enabled: boolean;
  idle_timeout_minutes: number;
  warning_seconds: number;
  lock_on_minimize: boolean;
  lock_on_sleep: boolean;
  biometric_enabled: boolean;
}

export type SessionState = "ACTIVE" | "WARNING" | "LOCKED";

interface SessionSecurityContextType {
  sessionState: SessionState;
  remainingWarningSeconds: number;
  securitySettings: SecuritySettings;
  lockSession: () => void;
  stayActive: () => void;
  unlockSession: (mpin?: string, biometricAssertion?: string) => Promise<{ success: boolean; message?: string }>;
  updateSettings: (newSettings: Partial<SecuritySettings>) => Promise<void>;
  isProcessingTx: boolean;
  setProcessingTx: (processing: boolean) => void;
}

// ── Security Threshold Constants ──────────────────────────────
export const MAX_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 Hours Absolute Max Lifetime
export const MAX_INACTIVITY_LOGOUT_MS = 15 * 60 * 1000;     // 15 Minutes Inactivity Auto-Logout
export const AUTO_LOCK_IDLE_MS = 5 * 60 * 1000;             // 5 Minutes Idle Screen Lock
export const WARNING_LEAD_MS = 60 * 1000;                   // 60 Seconds Inactivity Warning Window

const DEFAULT_SETTINGS: SecuritySettings = {
  auto_lock_enabled: true,
  idle_timeout_minutes: 5,
  warning_seconds: 60,
  lock_on_minimize: false,
  lock_on_sleep: true,
  biometric_enabled: true,
};

const PORTAL_LOGIN_MAP: Record<string, string> = {
  RETAILER: "/retailer/login",
  DIST: "/dist/login",
  SD: "/sd/login",
  ADMIN: "/admin/login",
  SUPER_ADMIN: "/super-admin/login",
};

const DEFAULT_RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

const SessionSecurityContext = createContext<SessionSecurityContextType | undefined>(undefined);

export const SessionSecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState>("ACTIVE");
  const [remainingWarningSeconds, setRemainingWarningSeconds] = useState<number>(60);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [isProcessingTx, setProcessingTx] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // ── Terminate Session and Force Redirect to Login ──────────────
  const terminateSessionAndRedirect = (reason: "inactivity_timeout" | "session_expired_24h") => {
    if (typeof window === "undefined") return;

    // Clear all cookies
    const cookiesToClear = [
      "p2p_access_token",
      "pay2pay_access_token",
      "pay2pay_auth_token",
      "p2p_user_role",
      "pay2pay_user_role",
    ];
    cookiesToClear.forEach((cookieName) => {
      document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    // Clear session storage tokens
    try {
      localStorage.removeItem("pay2pay_access_token");
      localStorage.removeItem("pay2pay_auth_token");
      localStorage.removeItem("p2p_session_locked");
      localStorage.removeItem("p2p_session_locked_at");
      localStorage.removeItem("p2p_session_last_active");
      localStorage.removeItem("p2p_session_start_time");
      localStorage.removeItem("pay2pay_user_data");
      localStorage.removeItem("user_info");
    } catch (e) {}

    soundSystem.playWarningSound();
    logAuditEvent("SESSION_TERMINATED", { reason });

    const role = (typeof window !== "undefined" ? localStorage.getItem("pay2pay_user_role") : null) || "SD";
    const loginPath = PORTAL_LOGIN_MAP[role.toUpperCase()] || "/sd/login";
    window.location.replace(`${loginPath}?reason=${reason}`);
  };

  // Initialize & Check Lock Persistence on Mount (Prevents Bypass via Refresh / URL Navigate)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const now = Date.now();
      const sessionStart = Number(localStorage.getItem("p2p_session_start_time") || now);

      if (now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        terminateSessionAndRedirect("session_expired_24h");
        return;
      }

      const isSavedLocked = localStorage.getItem("p2p_session_locked") === "true";
      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || now);
      const elapsedMs = now - savedLastActive;

      if (elapsedMs >= MAX_INACTIVITY_LOGOUT_MS) {
        terminateSessionAndRedirect("inactivity_timeout");
        return;
      }

      const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;
      if (isSavedLocked || elapsedMs >= lockTimeoutMs) {
        setSessionState("LOCKED");
        localStorage.setItem("p2p_session_locked", "true");
      } else {
        lastActivityRef.current = savedLastActive;
      }
    }
  }, []);

  // Initialize BroadcastChannel for Multi-Tab Synchronization
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("p2p_session_lock_channel");
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "BROADCAST_LOCK") {
          setSessionState("LOCKED");
        } else if (event.data?.type === "BROADCAST_UNLOCK") {
          setSessionState("ACTIVE");
          lastActivityRef.current = Date.now();
        } else if (event.data?.type === "BROADCAST_TERMINATE") {
          terminateSessionAndRedirect(event.data?.reason || "inactivity_timeout");
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  // Reset idle timer on user interaction
  const handleUserActivity = () => {
    if (sessionState === "LOCKED") return;

    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem("p2p_session_last_active", String(now));
    } catch (e) {}

    if (sessionState === "WARNING") {
      setSessionState("ACTIVE");
    }
  };

  // Attach User Activity Event Listeners
  useEffect(() => {
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
      "input",
      "change",
    ];

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [sessionState]);

  // Window Visibility and Focus Check
  useEffect(() => {
    const checkIdleOnFocusOrVisibility = () => {
      const now = Date.now();
      const sessionStart = Number(localStorage.getItem("p2p_session_start_time") || now);

      if (now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        terminateSessionAndRedirect("session_expired_24h");
        return;
      }

      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || lastActivityRef.current);
      const elapsedMs = now - savedLastActive;

      if (elapsedMs >= MAX_INACTIVITY_LOGOUT_MS) {
        terminateSessionAndRedirect("inactivity_timeout");
        return;
      }

      const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;
      if (localStorage.getItem("p2p_session_locked") === "true" || elapsedMs >= lockTimeoutMs) {
        if (sessionState !== "LOCKED") {
          lockSession();
        }
      }
    };

    document.addEventListener("visibilitychange", checkIdleOnFocusOrVisibility);
    window.addEventListener("focus", checkIdleOnFocusOrVisibility);
    return () => {
      document.removeEventListener("visibilitychange", checkIdleOnFocusOrVisibility);
      window.removeEventListener("focus", checkIdleOnFocusOrVisibility);
    };
  }, [sessionState, securitySettings]);

  // Main Idle Check Poller
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (isProcessingTx) return;

      const now = Date.now();
      const startTime = Number(localStorage.getItem("p2p_session_start_time") || now);
      const totalSessionMs = now - startTime;

      // 1. Hard 24-Hour Session Lifetime Expiration
      if (totalSessionMs >= MAX_SESSION_LIFETIME_MS) {
        terminateSessionAndRedirect("session_expired_24h");
        return;
      }

      // 2. 15-Minute Inactivity Auto-Logout
      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || lastActivityRef.current);
      const idleMs = now - savedLastActive;

      if (idleMs >= MAX_INACTIVITY_LOGOUT_MS) {
        terminateSessionAndRedirect("inactivity_timeout");
        return;
      }

      // 3. Screen Lock Trigger (Default 5 Minutes)
      const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;
      if (securitySettings.auto_lock_enabled && idleMs >= lockTimeoutMs && sessionState !== "LOCKED") {
        lockSession();
      }

      // 4. Inactivity Warning Window (60s before 15-minute logout)
      const warningStartMs = MAX_INACTIVITY_LOGOUT_MS - WARNING_LEAD_MS;
      if (idleMs >= warningStartMs && sessionState !== "LOCKED") {
        if (sessionState !== "WARNING") {
          setSessionState("WARNING");
          soundSystem.playWarningSound();
          logAuditEvent("TIMEOUT_WARNING");
        }
        const remaining = Math.max(0, Math.ceil((MAX_INACTIVITY_LOGOUT_MS - idleMs) / 1000));
        setRemainingWarningSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [sessionState, securitySettings, isProcessingTx]);

  // Lock Session Action
  const lockSession = () => {
    setSessionState("LOCKED");
    logAuditEvent("SESSION_LOCKED");
    soundSystem.playLockChime();

    try {
      localStorage.setItem("p2p_session_locked", "true");
      localStorage.setItem("p2p_session_locked_at", String(Date.now()));
    } catch (e) {}

    // Broadcast Lock to all other tabs
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "BROADCAST_LOCK" });
    }
  };

  // Stay Active Action
  const stayActive = () => {
    setSessionState("ACTIVE");
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.removeItem("p2p_session_locked");
      localStorage.setItem("p2p_session_last_active", String(now));
    } catch (e) {}
  };

  // Unlock Session API Action
  const unlockSession = async (mpin?: string, biometricAssertion?: string) => {
    try {
      const res = await axios.post("/api/v1/session/unlock", {
        retailer_id: DEFAULT_RETAILER_ID,
        tenant_id: DEFAULT_TENANT_ID,
        mpin,
        biometric_assertion: biometricAssertion,
        device_info: `${navigator.platform} - ${navigator.userAgent}`,
      });

      if (res.data.status === "UNLOCKED") {
        setSessionState("ACTIVE");
        lastActivityRef.current = Date.now();

        // Restore scroll position
        const savedScroll = sessionStorage.getItem("p2p_saved_scroll_y");
        if (savedScroll) {
          window.scrollTo(0, parseInt(savedScroll, 10));
        }

        // Broadcast Unlock to all other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: "BROADCAST_UNLOCK" });
        }

        return { success: true };
      }

      return { success: false, message: res.data.message || "Failed to unlock session." };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Invalid MPIN. Please try again.";
      return { success: false, message: errorMsg };
    }
  };

  // Update Security Settings Action
  const updateSettings = async (newSettings: Partial<SecuritySettings>) => {
    const updated = { ...securitySettings, ...newSettings };
    setSecuritySettings(updated);

    try {
      await axios.put("/api/v1/session/settings", {
        retailer_id: DEFAULT_RETAILER_ID,
        tenant_id: DEFAULT_TENANT_ID,
        ...updated,
      });
    } catch (e) {
      console.warn("Failed to persist security settings to backend:", e);
    }
  };

  // Log Audit Event Helper
  const logAuditEvent = async (eventType: string, details?: any) => {
    try {
      await axios.post("/api/v1/session/audit", {
        retailer_id: DEFAULT_RETAILER_ID,
        tenant_id: DEFAULT_TENANT_ID,
        event_type: eventType,
        device_info: `${navigator.platform} - ${navigator.userAgent}`,
        details,
      });
    } catch (e) {
      console.warn("Audit log ping error:", e);
    }
  };

  return (
    <SessionSecurityContext.Provider
      value={{
        sessionState,
        remainingWarningSeconds,
        securitySettings,
        lockSession,
        stayActive,
        unlockSession,
        updateSettings,
        isProcessingTx,
        setProcessingTx,
      }}
    >
      {children}
    </SessionSecurityContext.Provider>
  );
};

export const useSessionSecurity = () => {
  const context = useContext(SessionSecurityContext);
  if (!context) {
    throw new Error("useSessionSecurity must be used within a SessionSecurityProvider");
  }
  return context;
};
