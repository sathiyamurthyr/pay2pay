"use client";

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

export const hasAuthToken = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const token =
      localStorage.getItem("pay2pay_auth_token") ||
      localStorage.getItem("pay2pay_access_token") ||
      (document.cookie.includes("pay2pay_auth_token") ? "cookie_token" : "") ||
      (document.cookie.includes("p2p_access_token") ? "cookie_token" : "");
    return Boolean(token && token.trim() !== "");
  } catch (e) {
    return false;
  }
};

export const isPublicAuthRoute = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const path = (window.location.pathname || "").toLowerCase();
    return (
      path.includes("/login") ||
      path.includes("/register") ||
      path.includes("/forgot") ||
      path.includes("/reset-password") ||
      path === "/"
    );
  } catch (e) {
    return true;
  }
};

const SessionSecurityContext = createContext<SessionSecurityContextType | undefined>(undefined);

// Portal-specific login routes for redirect on token expiry
const PORTAL_LOGIN_MAP: Record<string, string> = {
  RETAILER: "/retailer/login",
  DIST: "/dist/login",
  SD: "/sd/login",
  ADMIN: "/admin/login",
  SUPER_ADMIN: "/super-admin/login",
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

    const role = (typeof window !== "undefined" ? localStorage.getItem("pay2pay_user_role") : null) || "RETAILER";
    const loginPath = PORTAL_LOGIN_MAP[role.toUpperCase()] || "/retailer/login";
    window.location.replace(`${loginPath}?reason=${reason}`);
  };

  // Initialize & Check Lock Persistence on Mount (Prevents Bypass via Refresh / URL Navigate)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // On public login/auth pages or if user has no token, NEVER lock
      if (isPublicAuthRoute() || !hasAuthToken()) {
        try {
          localStorage.removeItem("p2p_session_locked");
          localStorage.removeItem("p2p_session_locked_at");
        } catch (e) {}
        setSessionState("ACTIVE");
        setLockedAt(null);
        return;
      }

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
          if (!isPublicAuthRoute() && hasAuthToken()) {
            setSessionState("LOCKED");
            setLockedAt(event.data?.lockedAt || Date.now());
          }
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
      if (isPublicAuthRoute() || !hasAuthToken()) return;
      const now = Date.now();
      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || lastActivityRef.current);
      const elapsed = now - savedLastActive;

      // Absolute 24h lifetime expiry
      const sessionStart = Number(localStorage.getItem("p2p_session_start_time") || now);
      if (now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        terminateSessionAndRedirect("session_expired_24h");
        return;
      }

      // Inactivity 15m logout
      if (elapsed >= MAX_INACTIVITY_LOGOUT_MS) {
        terminateSessionAndRedirect("inactivity_timeout");
        return;
      }

      // Auto-lock idle check
      const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;
      if (elapsed >= lockTimeoutMs && sessionState !== "LOCKED") {
        lockSession();
      }
    };

    window.addEventListener("focus", checkIdleOnFocusOrVisibility);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkIdleOnFocusOrVisibility();
      }
    });

    return () => {
      window.removeEventListener("focus", checkIdleOnFocusOrVisibility);
    };
  }, [securitySettings, sessionState]);

  // Active Timer Tick for Idle Detection & 60s Warning Countdown
  useEffect(() => {
    if (isPublicAuthRoute() || !hasAuthToken()) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const sessionStart = Number(localStorage.getItem("p2p_session_start_time") || now);

      // Check 24 Hour Lifetime
      if (now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        terminateSessionAndRedirect("session_expired_24h");
        return;
      }

      const elapsedMs = now - lastActivityRef.current;
      const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;

      // Don't auto-lock if currently processing an active financial transaction
      if (isProcessingTx) {
        lastActivityRef.current = now;
        return;
      }

      if (sessionState === "ACTIVE") {
        // Check if within 60s warning window before auto-lock
        if (securitySettings.auto_lock_enabled && elapsedMs >= lockTimeoutMs - WARNING_LEAD_MS) {
          const remaining = Math.max(0, Math.ceil((lockTimeoutMs - elapsedMs) / 1000));
          setRemainingWarningSeconds(remaining);
          setSessionState("WARNING");
          soundSystem.playWarningSound();
        }
      } else if (sessionState === "WARNING") {
        const remaining = Math.max(0, Math.ceil((lockTimeoutMs - elapsedMs) / 1000));
        setRemainingWarningSeconds(remaining);

        if (elapsedMs >= lockTimeoutMs) {
          lockSession();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, securitySettings, isProcessingTx]);

  // Explicit Lock Session Action
  const lockSession = () => {
    if (isPublicAuthRoute() || !hasAuthToken()) return;

    const now = Date.now();
    setSessionState("LOCKED");
    setLockedAt(now);

    try {
      localStorage.setItem("p2p_session_locked", "true");
      localStorage.setItem("p2p_session_locked_at", String(now));
    } catch (e) {}

    soundSystem.playLockSound();
    logAuditEvent("SESSION_LOCKED", { timestamp: now });

    // Broadcast lock to other tabs
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "BROADCAST_LOCK", lockedAt: now });
    }
  };

  // Stay Active / Dismiss Inactivity Warning
  const stayActive = () => {
    handleUserActivity();
    setSessionState("ACTIVE");
    soundSystem.playSuccessSound();
  };

  // Unlock Session using 4-digit PIN
  const unlockSession = async (pin?: string): Promise<{ success: boolean; message?: string }> => {
    if (!pin || pin.length < 4) {
      return { success: false, message: "Please enter your valid 4-digit PIN." };
    }

    try {
      const baseUrl = getApiBaseUrl();
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("pay2pay_auth_token") || localStorage.getItem("pay2pay_access_token")
          : null;

      const response = await axios.post(
        `${baseUrl}/api/v1/auth/verify-pin`,
        { pin },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          timeout: 8000,
        }
      );

      if (response.data?.success || response.data?.valid || response.status === 200) {
        setSessionState("ACTIVE");
        setLockedAt(null);
        lastActivityRef.current = Date.now();

        try {
          localStorage.removeItem("p2p_session_locked");
          localStorage.removeItem("p2p_session_locked_at");
          localStorage.setItem("p2p_session_last_active", String(Date.now()));
        } catch (e) {}

        soundSystem.playUnlockSound();
        logAuditEvent("SESSION_UNLOCKED", { method: "PIN" });

        // Broadcast unlock to other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: "BROADCAST_UNLOCK" });
        }

        return { success: true };
      } else {
        soundSystem.playErrorSound();
        return {
          success: false,
          message: response.data?.message || response.data?.detail || "Invalid security PIN. Please try again.",
        };
      }
    } catch (err: any) {
      soundSystem.playErrorSound();
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Incorrect security PIN. Access denied.";
      return { success: false, message: errorMsg };
    }
  };

  // Update Security Settings
  const updateSettings = async (newSettings: Partial<SecuritySettings>) => {
    const updated = { ...securitySettings, ...newSettings };
    setSecuritySettings(updated);

    try {
      localStorage.setItem("p2p_security_settings", JSON.stringify(updated));
    } catch (e) {}

    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem("pay2pay_auth_token");
      if (token) {
        await axios.put(`${baseUrl}/api/v1/users/me/security-settings`, updated, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {}
  };

  // Audit Logging Helper
  const logAuditEvent = (event_type: string, metadata: Record<string, any>) => {
    try {
      const baseUrl = getApiBaseUrl();
      const token =
        typeof window !== "undefined" ? localStorage.getItem("pay2pay_auth_token") : null;
      if (token) {
        axios.post(
          `${baseUrl}/api/v1/compliance/audit-logs`,
          { event_type, metadata, timestamp: new Date().toISOString() },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      }
    } catch (e) {}
  };

  const isProtectedSessionLocked = sessionState === "LOCKED" && !isPublicAuthRoute() && hasAuthToken();
  const isProtectedWarning = sessionState === "WARNING" && !isPublicAuthRoute() && hasAuthToken();

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
      {/* Background Page Layer — Blurred & Disabled ONLY when Locked on protected authenticated route */}
      <div
        className={
          isProtectedSessionLocked
            ? "filter blur-xl pointer-events-none select-none transition-all duration-500"
            : "transition-all duration-300"
        }
      >
        {children}
      </div>

      {/* Security Lock Overlay — Rendered only on protected routes for authenticated sessions */}
      {isProtectedSessionLocked && <SessionLockScreenOverlay />}

      {/* Inactivity Security Warning Dialog — Rendered when 60s remain before auto-lock */}
      {isProtectedWarning && <SessionWarningDialog />}
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
