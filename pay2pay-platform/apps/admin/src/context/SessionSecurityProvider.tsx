import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import axios from "axios";
import { SessionLockScreenOverlay } from "@/components/security/SessionLockScreenOverlay";
import { SessionWarningDialog } from "@/components/security/SessionWarningDialog";
import { getApiBaseUrl } from "@/lib/api-config";
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
  lockedAt: number | null;
  lockSession: () => void;
  stayActive: () => void;
  unlockSession: (pin?: string) => Promise<{ success: boolean; message?: string }>;
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
  biometric_enabled: false,
};

const SessionSecurityContext = createContext<SessionSecurityContextType | undefined>(undefined);

// Portal-specific login routes for redirect on token expiry
const PORTAL_LOGIN_MAP: Record<string, string> = {
  RETAILER: "/login",
  DIST: "/login",
  SD: "/login",
  ADMIN: "/login",
  SUPER_ADMIN: "/login",
};

export const SessionSecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState>("ACTIVE");
  const [lockedAt, setLockedAt] = useState<number | null>(null);
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

    const role = (typeof window !== "undefined" ? localStorage.getItem("pay2pay_user_role") : null) || "ADMIN";
    const loginPath = PORTAL_LOGIN_MAP[role.toUpperCase()] || "/login";
    window.location.replace(`${loginPath}?reason=${reason}`);
  };

  // Initialize & Check Lock Persistence on Mount (Prevents Bypass via Refresh / URL Navigate)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const now = Date.now();
      const sessionStart = Number(localStorage.getItem("p2p_session_start_time") || now);

      // Check 24-Hour Expiration on load
      if (now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        terminateSessionAndRedirect("session_expired_24h");
        return;
      }

      const isSavedLocked = localStorage.getItem("p2p_session_locked") === "true";
      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || now);
      const savedLockedAt = Number(localStorage.getItem("p2p_session_locked_at") || now);
      const elapsedMs = now - savedLastActive;

      // Check 15-Minute Inactivity on load
      if (elapsedMs >= MAX_INACTIVITY_LOGOUT_MS) {
        terminateSessionAndRedirect("inactivity_timeout");
        return;
      }

      const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;
      if (isSavedLocked || elapsedMs >= lockTimeoutMs) {
        setSessionState("LOCKED");
        setLockedAt(savedLockedAt);
        localStorage.setItem("p2p_session_locked", "true");
      } else {
        lastActivityRef.current = savedLastActive;
      }
    }
  }, []);

  // Multi-Tab Sync Broadcast Channel
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("p2p_session_lock_channel");
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "BROADCAST_LOCK") {
          setSessionState("LOCKED");
          setLockedAt(event.data?.lockedAt || Date.now());
        } else if (event.data?.type === "BROADCAST_UNLOCK") {
          setSessionState("ACTIVE");
          setLockedAt(null);
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

  // Reset idle timer on legitimate user activity
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
    ];

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [sessionState]);

  // Tab Blur / Window Focus Timestamp Idle Check
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

  // Main Idle & Session Lifetime Poller
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
        }
        const remaining = Math.max(0, Math.ceil((MAX_INACTIVITY_LOGOUT_MS - idleMs) / 1000));
        setRemainingWarningSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [sessionState, securitySettings, isProcessingTx]);

  // Lock Session Action
  const lockSession = () => {
    const lockTime = Date.now();
    setSessionState("LOCKED");
    setLockedAt(lockTime);
    try {
      localStorage.setItem("p2p_session_locked", "true");
      localStorage.setItem("p2p_session_locked_at", String(lockTime));
    } catch (e) {}

    soundSystem.playLockChime();
    logAuditEvent("SESSION_LOCKED");

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "BROADCAST_LOCK", lockedAt: lockTime });
    }
  };

  // Stay Active Action
  const stayActive = () => {
    setSessionState("ACTIVE");
    setLockedAt(null);
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.removeItem("p2p_session_locked");
      localStorage.setItem("p2p_session_last_active", String(now));
    } catch (e) {}
  };

  // ── Database-Backed Backend PIN Verification ──
  const unlockSession = async (pin?: string) => {
    const inputPin = pin?.trim() || "";

    // 1. Strict 4-digit format check
    if (!/^\d{4}$/.test(inputPin)) {
      soundSystem.playLoginFailure();
      return { success: false, message: "PIN must be exactly 4 numeric digits." };
    }

    try {
      let token: string | null = null;
      if (typeof window !== "undefined") {
        token =
          localStorage.getItem("p2p_access_token") ||
          localStorage.getItem("pay2pay_token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("pay2pay_access_token") ||
          localStorage.getItem("pay2pay_auth_token") ||
          document.cookie
            .split("; ")
            .find((row) =>
              row.startsWith("p2p_access_token=") ||
              row.startsWith("pay2pay_auth_token=") ||
              row.startsWith("pay2pay_access_token=") ||
              row.startsWith("auth_token=")
            )
            ?.split("=")[1] ||
          null;
      }

      const baseUrl = getApiBaseUrl();
      const response = await axios.post(
        `${baseUrl}/auth/security/unlock`,
        {
          pin: inputPin,
          mpin: inputPin,
          device_info: typeof navigator !== "undefined" ? `${navigator.platform} - ${navigator.userAgent}` : "Web Device",
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 8000,
        }
      );

      if (response.data && (response.data.success === true || response.data.unlocked === true || response.data.status === "UNLOCKED")) {
        setSessionState("ACTIVE");
        setLockedAt(null);
        soundSystem.playUnlockChime();
        const now = Date.now();
        lastActivityRef.current = now;
        try {
          localStorage.removeItem("p2p_session_locked");
          localStorage.removeItem("p2p_session_locked_at");
          localStorage.setItem("p2p_session_last_active", String(now));
        } catch (e) {}

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: "BROADCAST_UNLOCK" });
        }

        return { success: true };
      }

      soundSystem.playLoginFailure();
      return {
        success: false,
        message: response.data?.message || response.data?.detail || "Invalid Security PIN. Please verify against your database registered PIN.",
      };
    } catch (err: any) {
      soundSystem.playLoginFailure();
      if (err.response?.status === 401 || err.response?.status === 400 || err.response?.status === 403) {
        const serverMsg = err.response?.data?.detail || err.response?.data?.message;
        return { success: false, message: serverMsg || "Incorrect Security PIN. Please enter your valid 4-digit PIN registered with your account." };
      }

      if (err.response?.status === 429) {
        const serverMsg = err.response?.data?.detail || err.response?.data?.message;
        return {
          success: false,
          message: serverMsg || "Too many unsuccessful attempts. Please try again later.",
        };
      }

      return {
        success: false,
        message: err.response?.data?.detail || "Unable to reach database security service. Please try again.",
      };
    }
  };

  // Update Security Settings Action
  const updateSettings = async (newSettings: Partial<SecuritySettings>) => {
    const updated = { ...securitySettings, ...newSettings };
    setSecuritySettings(updated);
  };

  // Log Audit Event Helper
  const logAuditEvent = async (eventType: string, details?: any) => {
    try {
      const baseUrl = getApiBaseUrl();
      await axios.post(`${baseUrl}/session/audit`, {
        event_type: eventType,
        device_info: `${navigator.platform} - ${navigator.userAgent}`,
        details,
      });
    } catch (e) {
      // Non-blocking audit log
    }
  };

  return (
    <SessionSecurityContext.Provider
      value={{
        sessionState,
        remainingWarningSeconds,
        securitySettings,
        lockedAt,
        lockSession,
        stayActive,
        unlockSession,
        updateSettings,
        isProcessingTx,
        setProcessingTx,
      }}
    >
      {/* Background Page Layer — Blurred & Disabled when Locked */}
      <div
        className={
          sessionState === "LOCKED"
            ? "filter blur-xl pointer-events-none select-none transition-all duration-500"
            : "transition-all duration-300"
        }
      >
        {children}
      </div>

      {/* Security Lock Overlay — Rendered outside blur layer at z-index: 99999 */}
      <SessionLockScreenOverlay />

      {/* Inactivity Security Warning Dialog — Rendered when 60s remain before 15m auto-logout */}
      <SessionWarningDialog />
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
