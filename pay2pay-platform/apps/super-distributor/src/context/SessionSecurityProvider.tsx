import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import axios from "axios";

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

const DEFAULT_SETTINGS: SecuritySettings = {
  auto_lock_enabled: true,
  idle_timeout_minutes: 1,
  warning_seconds: 30,
  lock_on_minimize: true,
  lock_on_sleep: true,
  biometric_enabled: true,
};

const DEFAULT_RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

const SessionSecurityContext = createContext<SessionSecurityContextType | undefined>(undefined);

export const SessionSecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState>("ACTIVE");
  const [remainingWarningSeconds, setRemainingWarningSeconds] = useState<number>(30);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [isProcessingTx, setProcessingTx] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

    lastActivityRef.current = Date.now();
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

  // Window Minimize / Tab Blur Listener (Advanced Auto-Lock on Sleep / Minimize)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && securitySettings.lock_on_minimize && securitySettings.auto_lock_enabled) {
        lockSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [securitySettings]);

  // Main Idle Check Poller
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
          logAuditEvent("TIMEOUT_WARNING");
        }
        const remaining = Math.max(0, Math.ceil((timeoutMs - idleMs) / 1000));
        setRemainingWarningSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [sessionState, securitySettings]);

  // Lock Session Action
  const lockSession = () => {
    setSessionState("LOCKED");
    logAuditEvent("SESSION_LOCKED");

    // Preserve scroll position & current state snapshot in sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("p2p_saved_scroll_y", window.scrollY.toString());
      sessionStorage.setItem("p2p_saved_url", window.location.pathname);
    }

    // Broadcast Lock to all other tabs
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "BROADCAST_LOCK" });
    }
  };

  // Stay Active Action
  const stayActive = () => {
    setSessionState("ACTIVE");
    lastActivityRef.current = Date.now();
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
