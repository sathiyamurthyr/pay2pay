"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import axios from "axios";
import { apiClient } from "@/lib/api";
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
  lockSession: () => Promise<void> | void;
  stayActive: () => void;
  unlockSession: (pin?: string) => Promise<{ success: boolean; message?: string }>;
  updateSettings: (newSettings: Partial<SecuritySettings>) => Promise<void>;
  isProcessingTx: boolean;
  setProcessingTx: (processing: boolean) => void;
}

// ── Security Threshold Constants ──────────────────────────────
export const MAX_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days (Matches 30-day token lifetime)
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

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const port = window.location.port;
    const path = window.location.pathname;
    const host = window.location.hostname.toLowerCase();
    const isAdminHost = host.startsWith("admin.") || host.includes("admin.smspay.store") || host.includes("admin.near4you.store") || host.includes("admin.pay2pay.in");
    const isSuperAdminHost = port === "4003" || host.startsWith("super-admin.") || host.startsWith("superadmin.");
    const isRetailerHost = host.startsWith("retailer.");

    let portTokenKey: string | null = null;
    if (port === "4001" || isRetailerHost || path.startsWith("/retailer")) {
      portTokenKey = "p2p_retailer_token";
    } else if (port === "4002" || isAdminHost || path.startsWith("/admin")) {
      portTokenKey = "p2p_admin_token";
    } else if (isSuperAdminHost || path.startsWith("/super-admin")) {
      portTokenKey = "p2p_super_admin_token";
    }

    if (portTokenKey) {
      const specificLs = localStorage.getItem(portTokenKey);
      if (specificLs && specificLs.trim() !== "" && !isJwtExpired(specificLs)) return specificLs.trim();

      const cookies = document.cookie.split("; ");
      const specificCookie = cookies.find((row) => row.startsWith(`${portTokenKey}=`));
      if (specificCookie) {
        const val = specificCookie.split("=")[1]?.trim();
        if (val && !isJwtExpired(val)) return val;
      }
    }

    // Comprehensive scan: find any valid non-expired token
    const candidateKeys = [
      "p2p_admin_token",
      "p2p_retailer_token",
      "p2p_super_admin_token",
      "p2p_access_token",
      "pay2pay_access_token",
      "pay2pay_auth_token",
      "p2p_sales_token",
      "pay2pay_sales_token",
      "access_token",
      "token",
      "p2p_token",
    ];

    const cookies = document.cookie.split("; ");
    for (const k of candidateKeys) {
      const lsVal = localStorage.getItem(k)?.trim();
      if (lsVal && lsVal.length > 10 && !isJwtExpired(lsVal)) {
        return lsVal;
      }
      const cMatch = cookies.find((row) => row.startsWith(`${k}=`));
      if (cMatch) {
        const cVal = cMatch.split("=")[1]?.trim();
        if (cVal && cVal.length > 10 && !isJwtExpired(cVal)) {
          return cVal;
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const isJwtExpired = (token?: string | null): boolean => {
  if (!token) return true;
  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    const parsed = JSON.parse(jsonPayload);
    if (typeof parsed.exp === "number") {
      return parsed.exp * 1000 <= Date.now() + 5000;
    }
    return false;
  } catch {
    return false;
  }
};

export const hasAuthToken = (): boolean => {
  const token = getAuthToken();
  return Boolean(token && !isJwtExpired(token));
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
  const terminateSessionAndRedirect = (reason: "inactivity_timeout" | "session_expired_24h" | "session_expired") => {
    if (typeof window === "undefined") return;

    // Clear all cookies
    const cookiesToClear = [
      "p2p_access_token",
      "pay2pay_access_token",
      "pay2pay_auth_token",
      "p2p_sales_token",
      "pay2pay_sales_token",
      "p2p_admin_token",
      "p2p_retailer_token",
      "p2p_super_admin_token",
      "p2p_sd_token",
      "p2p_dist_token",
      "p2p_token",
      "pay2pay_token",
      "p2p_user_role",
      "pay2pay_user_role",
      "p2p_session_locked",
      "p2p_session_id",
      "p2p_destination",
      "token",
      "access_token",
    ];
    cookiesToClear.forEach((cookieName) => {
      document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      try {
        document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      } catch {}
    });

    // Clear session storage tokens
    try {
      localStorage.removeItem("p2p_access_token");
      localStorage.removeItem("pay2pay_access_token");
      localStorage.removeItem("pay2pay_auth_token");
      localStorage.removeItem("p2p_sales_token");
      localStorage.removeItem("pay2pay_sales_token");
      localStorage.removeItem("p2p_admin_token");
      localStorage.removeItem("p2p_retailer_token");
      localStorage.removeItem("p2p_super_admin_token");
      localStorage.removeItem("p2p_sd_token");
      localStorage.removeItem("p2p_dist_token");
      localStorage.removeItem("p2p_token");
      localStorage.removeItem("pay2pay_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("p2p_session_locked");
      localStorage.removeItem("p2p_session_locked_at");
      localStorage.removeItem("p2p_session_last_active");
      localStorage.removeItem("p2p_session_start_time");
      localStorage.removeItem("pay2pay_user_data");
      localStorage.removeItem("user_info");
      sessionStorage.clear();
    } catch (e) {}

    soundSystem.playWarningSound();
    logAuditEvent("SESSION_TERMINATED", { reason });

    const currentPath = window.location.pathname;
    const host = window.location.hostname.toLowerCase();
    const isAdminHost = host.startsWith("admin.") || host.includes("admin.smspay.store") || host.includes("admin.near4you.store") || host.includes("admin.pay2pay.in");
    const isSuperAdminHost = window.location.port === "4003" || host.startsWith("super-admin.") || host.startsWith("superadmin.");

    let loginPath = "/retailer/login";
    if (isAdminHost || currentPath.startsWith("/admin")) loginPath = "/admin/login";
    else if (isSuperAdminHost || currentPath.startsWith("/super-admin")) loginPath = "/super-admin/login";
    else if (currentPath.startsWith("/sd")) loginPath = "/sd/login";
    else if (currentPath.startsWith("/dist")) loginPath = "/dist/login";

    window.location.replace(`${loginPath}?reason=${reason}&redirect=${encodeURIComponent(currentPath)}`);
  };

  // Initialize & Check Lock Persistence on Mount (Prevents Bypass via Refresh / URL Navigate)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // On public login/auth pages, NEVER lock and clear lock flags
      if (isPublicAuthRoute()) {
        try {
          localStorage.removeItem("p2p_session_locked");
          localStorage.removeItem("p2p_session_locked_at");
        } catch (e) {}
        setSessionState("ACTIVE");
        setLockedAt(null);
        return;
      }

      const currentToken = getAuthToken();
      if (!currentToken) {
        setSessionState("ACTIVE");
        setLockedAt(null);
        return;
      }

      // Check if JWT token is expired on mount
      if (isJwtExpired(currentToken)) {
        terminateSessionAndRedirect("session_expired");
        return;
      }

      const now = Date.now();
      let sessionStart = Number(localStorage.getItem("p2p_session_start_time"));
      if (!sessionStart || isNaN(sessionStart) || sessionStart <= 0 || now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        sessionStart = now;
        localStorage.setItem("p2p_session_start_time", String(now));
      }

      const isSavedLocked = localStorage.getItem("p2p_session_locked") === "true";
      // On page load / refresh, anchor last active timestamp to current time so active refresh is never treated as inactivity
      localStorage.setItem("p2p_session_last_active", String(now));
      lastActivityRef.current = now;

      if (isSavedLocked) {
        const savedLockedAt = Number(localStorage.getItem("p2p_session_locked_at") || now);
        setSessionState("LOCKED");
        setLockedAt(savedLockedAt);
      } else {
        setSessionState("ACTIVE");
        setLockedAt(null);
      }

      // Authoritative Backend Lock Status Verification on Mount (P0 Anti-Bypass)
      const verifyBackendLockStatus = async () => {
        try {
          const res = await apiClient.get("/session/status", { timeout: 5000 });
          if (res.data?.is_locked) {
            setSessionState("LOCKED");
            const lockTime = Date.now();
            setLockedAt((prev) => prev || lockTime);
            try {
              localStorage.setItem("p2p_session_locked", "true");
              localStorage.setItem("p2p_session_locked_at", String(lockTime));
            } catch (e) {}
          } else if (res.data?.is_locked === false) {
            setSessionState("ACTIVE");
            setLockedAt(null);
            try {
              localStorage.removeItem("p2p_session_locked");
              localStorage.removeItem("p2p_session_locked_at");
            } catch (e) {}
          }
        } catch (err) {
          // Keep local state on network error
        }
      };
      verifyBackendLockStatus();

      // Live Terminal Lock/Unlock Event Listener (Real-Time Admin & System Sync)
      const handleTerminalLockEvent = (e: any) => {
        const isLocked = Boolean(e?.detail?.locked);
        if (isLocked) {
          const lockTime = Date.now();
          setSessionState("LOCKED");
          setLockedAt(lockTime);
          try {
            localStorage.setItem("p2p_session_locked", "true");
            localStorage.setItem("p2p_session_locked_at", String(lockTime));
          } catch (err) {}
          soundSystem.playLockSound();
        } else {
          setSessionState("ACTIVE");
          setLockedAt(null);
          try {
            localStorage.removeItem("p2p_session_locked");
            localStorage.removeItem("p2p_session_locked_at");
          } catch (err) {}
          soundSystem.playUnlockSound();
        }
      };
      window.addEventListener("pay2pay:terminal_lock_event", handleTerminalLockEvent);

      return () => {
        window.removeEventListener("pay2pay:terminal_lock_event", handleTerminalLockEvent);
      };
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
      const savedLastActive = Number(localStorage.getItem("p2p_session_last_active") || lastActivityRef.current || now);
      const elapsed = now - savedLastActive;

      // On tab focus or window visibility, anchor active session to prevent refresh logouts
      if (sessionState !== "LOCKED") {
        const lockTimeoutMs = (securitySettings.idle_timeout_minutes || 5) * 60 * 1000;
        if (elapsed >= lockTimeoutMs && securitySettings.auto_lock_enabled) {
          lockSession();
        } else {
          localStorage.setItem("p2p_session_last_active", String(now));
          lastActivityRef.current = now;
        }
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
      // Check token expiration periodically
      const currentToken = getAuthToken();
      if (currentToken && isJwtExpired(currentToken)) {
        terminateSessionAndRedirect("session_expired");
        return;
      }

      const now = Date.now();
      const sessionStart = Number(localStorage.getItem("p2p_session_start_time") || now);

      // Check 30-Day Max Lifetime (Roll forward if user is actively engaged)
      if (now - sessionStart >= MAX_SESSION_LIFETIME_MS) {
        if (now - lastActivityRef.current < 60000) {
          localStorage.setItem("p2p_session_start_time", String(now));
        } else {
          terminateSessionAndRedirect("session_expired_24h");
          return;
        }
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

  // Explicit Lock Session Action (Immediate UI Lock + Authoritative Backend Persistence)
  const lockSession = useCallback(async () => {
    if (isPublicAuthRoute()) return;

    const now = Date.now();
    // 1. Immediately activate locked terminal state in UI & prevent interaction
    setSessionState("LOCKED");
    setLockedAt(now);

    try {
      localStorage.setItem("p2p_session_locked", "true");
      localStorage.setItem("p2p_session_locked_at", String(now));
    } catch (e) {}

    // Play lock chime immediately
    try {
      soundSystem.playLockSound();
    } catch (e) {}

    logAuditEvent("SESSION_LOCKED", { timestamp: now, method: "MANUAL" });

    // Broadcast lock to other tabs immediately
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: "BROADCAST_LOCK", lockedAt: now });
      } catch (e) {}
    }

    // 2. Authoritative backend lock persistence using apiClient (credentials & Bearer token automatically included)
    try {
      await apiClient.post("/session/lock", {
        reason: "Manual workstation lock",
        browser: typeof navigator !== "undefined" ? navigator.userAgent : "WebBrowser",
        os_name: typeof navigator !== "undefined" ? navigator.platform : "UnknownOS",
      });
    } catch (err: any) {
      console.warn("[SessionSecurityProvider] Backend lock sync notice:", err?.message || err);
    }
  }, []);

  // Global Keyboard Shortcut: Ctrl+L / Cmd+L to Lock Terminal Immediately
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "l" || e.key === "L" || e.code === "KeyL")) {
        // Intercept before browser can steal focus to the address bar
        e.preventDefault();
        e.stopPropagation();

        if (sessionState !== "LOCKED" && !isPublicAuthRoute()) {
          lockSession();
        }
      }
    };

    // Use capture: true so the keydown is caught at the highest level early
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [sessionState, lockSession]);

  // Stay Active / Dismiss Inactivity Warning
  const stayActive = useCallback(() => {
    handleUserActivity();
    setSessionState("ACTIVE");
    soundSystem.playSuccessSound();
  }, []);

  // Unlock Session using 4-digit PIN
  const unlockSession = useCallback(async (pin?: string): Promise<{ success: boolean; message?: string }> => {
    const cleanPin = (pin || "").replace(/\D/g, "");
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, message: "Please enter your valid 4-digit PIN." };
    }

    try {
      const response = await apiClient.post("/auth/verify-pin", { pin: cleanPin }, { timeout: 8000 });
      const resData = response.data;

      if (resData?.success || resData?.valid || resData?.status === "UNLOCKED" || response.status === 200) {
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
          try {
            broadcastChannelRef.current.postMessage({ type: "BROADCAST_UNLOCK" });
          } catch (e) {}
        }

        // Notify any window event listeners
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pay2pay:terminal_lock_event", { detail: { locked: false } }));
        }

        return { success: true, message: "Session unlocked successfully." };
      } else {
        soundSystem.playErrorSound();
        return {
          success: false,
          message: resData?.message || resData?.detail || "Invalid security PIN. Please try again.",
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
  }, []);

  // Update Security Settings
  const updateSettings = async (newSettings: Partial<SecuritySettings>) => {
    const updated = { ...securitySettings, ...newSettings };
    setSecuritySettings(updated);

    try {
      localStorage.setItem("p2p_security_settings", JSON.stringify(updated));
    } catch (e) {}

    try {
      const baseUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
      const token = getAuthToken();
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
      const baseUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
      const token = getAuthToken();
      if (token) {
        axios.post(
          `${baseUrl}/api/v1/compliance/audit-logs`,
          { event_type, metadata, timestamp: new Date().toISOString() },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      }
    } catch (e) {}
  };

  const isProtectedSessionLocked = sessionState === "LOCKED" && !isPublicAuthRoute();
  const isProtectedWarning = sessionState === "WARNING" && !isPublicAuthRoute();

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
    return {
      sessionState: "ACTIVE" as SessionState,
      remainingWarningSeconds: 60,
      securitySettings: DEFAULT_SETTINGS,
      lockedAt: null,
      lockSession: () => {},
      stayActive: () => {},
      unlockSession: async () => ({ success: true }),
      updateSettings: async () => {},
      isProcessingTx: false,
      setProcessingTx: () => {},
    };
  }
  return context;
};
