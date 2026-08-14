import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import axios from "axios";
import { SessionLockScreenOverlay } from "@/components/security/SessionLockScreenOverlay";
import { normalizeUserRole, resolvePortalRoute } from "@/lib/portal-resolver";
import { getApiBaseUrl } from "@/lib/api-config";

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

const DEFAULT_SETTINGS: SecuritySettings = {
  auto_lock_enabled: true,
  idle_timeout_minutes: 15,
  warning_seconds: 15,
  lock_on_minimize: false,
  lock_on_sleep: true,
  biometric_enabled: false,
};

const SessionSecurityContext = createContext<SessionSecurityContextType | undefined>(undefined);

// Web Audio API Audio Chime Synthesizer
const playLockChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (err) {
    console.warn("Lock Audio Chime Error:", err);
  }
};

export const SessionSecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState>("ACTIVE");
  const [remainingWarningSeconds, setRemainingWarningSeconds] = useState<number>(15);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [isProcessingTx, setProcessingTx] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize & Check Lock Persistence on Mount (Prevents Bypass via Refresh / URL Navigate)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSavedLocked = localStorage.getItem("p2p_session_locked") === "true";
      const savedLastActiveStr = localStorage.getItem("p2p_session_last_active");
      const now = Date.now();

      if (!savedLastActiveStr) {
        localStorage.setItem("p2p_session_last_active", String(now));
        lastActivityRef.current = now;
        return;
      }

      const savedLastActive = Number(savedLastActiveStr);
      const elapsedMs = now - savedLastActive;
      const timeoutMs = securitySettings.idle_timeout_minutes * 60 * 1000;

      if (isSavedLocked || elapsedMs >= timeoutMs) {
        setSessionState("LOCKED");
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
        } else if (event.data?.type === "BROADCAST_UNLOCK") {
          setSessionState("ACTIVE");
          lastActivityRef.current = Date.now();
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
    ];

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [sessionState]);

  // Tab Blur / Window Focus Timestamp Idle Check
  useEffect(() => {
    const checkIdleOnFocusOrVisibility = () => {
      if (sessionState === "LOCKED") return;
      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || lastActivityRef.current);
      const elapsedMs = Date.now() - savedLastActive;
      const timeoutMs = securitySettings.idle_timeout_minutes * 60 * 1000;

      if (localStorage.getItem("p2p_session_locked") === "true" || elapsedMs >= timeoutMs) {
        lockSession();
      }
    };

    document.addEventListener("visibilitychange", checkIdleOnFocusOrVisibility);
    window.addEventListener("focus", checkIdleOnFocusOrVisibility);
    return () => {
      document.removeEventListener("visibilitychange", checkIdleOnFocusOrVisibility);
      window.removeEventListener("focus", checkIdleOnFocusOrVisibility);
    };
  }, [sessionState, securitySettings]);

  // Main Idle Check Poller (1 Minute Inactivity)
  useEffect(() => {
    if (!securitySettings.auto_lock_enabled || securitySettings.idle_timeout_minutes <= 0) {
      return;
    }

    const checkInterval = setInterval(() => {
      if (sessionState === "LOCKED") return;

      const idleMs = Date.now() - lastActivityRef.current;
      const timeoutMs = securitySettings.idle_timeout_minutes * 60 * 1000;
      const warningMs = timeoutMs - securitySettings.warning_seconds * 1000;

      if (idleMs >= timeoutMs) {
        lockSession();
      } else if (idleMs >= warningMs) {
        if (sessionState !== "WARNING") {
          setSessionState("WARNING");
        }
        const remaining = Math.max(0, Math.ceil((timeoutMs - idleMs) / 1000));
        setRemainingWarningSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [sessionState, securitySettings]);

  const [lockedAt, setLockedAt] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("p2p_session_locked_at");
      return saved ? Number(saved) : null;
    }
    return null;
  });

  // Lock Session Action
  const lockSession = () => {
    const now = Date.now();
    setSessionState("LOCKED");
    setLockedAt(now);
    try {
      localStorage.setItem("p2p_session_locked", "true");
      localStorage.setItem("p2p_session_locked_at", String(now));
    } catch (e) {}

    playLockChime();
    logAuditEvent("SESSION_LOCKED");

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
      localStorage.setItem("p2p_session_last_active", String(now));
    } catch (e) {}
  };

  // ── Database-Backed Backend PIN Verification ──
  const unlockSession = async (pin?: string) => {
    const inputPin = pin?.trim() || "";

    // 1. Strict 4-digit format check
    if (!/^\d{4}$/.test(inputPin)) {
      return { success: false, message: "PIN must be exactly 4 numeric digits." };
    }

    try {
      const token =
        typeof document !== "undefined"
          ? document.cookie
              .split("; ")
              .find((row) => row.startsWith("p2p_access_token=") || row.startsWith("pay2pay_auth_token="))
              ?.split("=")[1]
          : null;

      const response = await axios.post(
        `${getApiBaseUrl()}/auth/security/unlock`,
        {
          pin: inputPin,
          device_info: typeof navigator !== "undefined" ? `${navigator.platform} - ${navigator.userAgent}` : "Web Device",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "Bearer dev-test-token",
          },
          timeout: 8000,
        }
      );

      if (response.data && response.data.success === true && response.data.unlocked === true) {
        setSessionState("ACTIVE");
        setLockedAt(null);
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

      return {
        success: false,
        message: response.data?.message || "Invalid security PIN",
      };
    } catch (err: any) {
      // Check Auth Expiry (HTTP 401 Unauthorized with expired session)
      if (err.response?.status === 401 && err.response?.data?.detail?.includes("expired")) {
        const rawRole = localStorage.getItem("p2p_user_role") || "RETAILER";
        const portalConfig = resolvePortalRoute(rawRole);
        window.location.href = portalConfig.login;
        return { success: false, message: "Authentication session expired. Redirecting to login..." };
      }

      const serverMsg = err.response?.data?.detail || err.response?.data?.message;

      if (err.response?.status === 429) {
        return {
          success: false,
          message: serverMsg || "Too many unsuccessful attempts. Please try again later.",
        };
      }

      if (err.response?.status === 401) {
        return {
          success: false,
          message: serverMsg || "Invalid security PIN",
        };
      }

      // FAIL CLOSED for API or DB errors
      return {
        success: false,
        message: "Unable to verify security PIN. Please try again.",
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
      await axios.post(`${getApiBaseUrl()}/session/audit`, {
        event_type: eventType,
        device_info: `${navigator.platform} - ${navigator.userAgent}`,
        details,
      });
    } catch (e) {
      // Audit log fallback
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
