"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, ShieldAlert, Building2, LogOut } from "lucide-react";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { resolvePortalRoute } from "@/lib/portal-resolver";

export const SessionLockScreenOverlay: React.FC = () => {
  const { sessionState, unlockSession, lockedAt } = useSessionSecurity();
  const { walletData } = useWalletSync();

  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = sessionState === "LOCKED";

  // Live clock timer (updates every 1s)
  useEffect(() => {
    if (!isLocked) return;
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [isLocked]);

  // Auto-focus PIN input when screen locks & clear previous errors
  useEffect(() => {
    if (isLocked) {
      setPin("");
      setErrorMsg("");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setPin("");
      setErrorMsg("");
    }
  }, [isLocked]);

  // Keyboard & Copy Protection while screen is locked
  useEffect(() => {
    if (!isLocked) return;

    const preventDefaultAction = (e: Event) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "u", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventDefaultAction);
    document.addEventListener("copy", preventDefaultAction);
    document.addEventListener("cut", preventDefaultAction);
    document.addEventListener("paste", preventDefaultAction);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", preventDefaultAction);
      document.removeEventListener("copy", preventDefaultAction);
      document.removeEventListener("cut", preventDefaultAction);
      document.removeEventListener("paste", preventDefaultAction);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked]);

  if (!isLocked) return null;

  // Format Elapsed Lock Duration (e.g. 00:42)
  const formatLockDuration = () => {
    if (!lockedAt) return "00:00";
    const elapsedSeconds = Math.max(0, Math.floor((currentTime.getTime() - lockedAt) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Format Date & Time
  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Dynamic Company & Retailer Metadata from authenticated session
  const companyName = walletData?.company_name || "Pay2Pay Enterprise Platform";
  const retailerName = walletData?.owner_name || walletData?.retailer_name || "Retailer Partner";
  const retailerCode = walletData?.retailer_code || (walletData as any)?.user_code || "RET-9182";

  // Handle PIN Unlock Submission
  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPin = pin.replace(/\D/g, "");

    if (cleanPin.length !== 4) {
      setErrorMsg("PIN must be exactly 4 numeric digits.");
      inputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const result = await unlockSession(cleanPin);
    setIsLoading(false);

    if (!result.success) {
      // Show exact API error message on verification failure
      setErrorMsg(result.message || "Unable to verify security PIN. Please try again.");
      setPin("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // Redirect to Login Page
  const handleGoToLogin = () => {
    try {
      const rawRole = localStorage.getItem("p2p_user_role") || "RETAILER";
      const portalConfig = resolvePortalRoute(rawRole);
      window.location.href = portalConfig.login;
    } catch (e) {
      window.location.href = "/auth/login";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none animate-fade-in"
      style={{
        backgroundColor: "rgba(5, 12, 25, 0.55)",
        backdropFilter: "blur(10px) saturate(120%)",
        WebkitBackdropFilter: "blur(10px) saturate(120%)",
      }}
    >
      {/* ── PREMIUM DARK GLASSMORPHISM SECURITY CARD ── */}
      <div
        className="w-full max-w-[430px] text-center p-6 sm:p-7 relative overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: "rgba(20, 32, 52, 0.55)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* Specular Top Sheen Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent pointer-events-none" />

        {/* 5. COMPANY BRANDING */}
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/25 text-blue-400 flex items-center justify-center mb-2 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-white tracking-tight drop-shadow-sm">
            {companyName}
          </h1>
        </div>

        {/* 6. RETAILER INFORMATION */}
        <div
          className="rounded-xl py-2 px-3 mb-3.5 max-w-[340px] mx-auto text-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.20)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <p className="text-xs font-semibold text-slate-200">
            Retailer: <span className="text-white font-bold">{retailerName}</span>
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5 tracking-wider">
            {retailerCode}
          </p>
        </div>

        {/* 7. LIVE DATE & TIME */}
        <div className="mb-3.5">
          <p className="text-xs text-slate-300 font-medium">{formattedDate}</p>
          <p className="text-lg font-bold text-white font-mono tracking-widest mt-0.5 drop-shadow-sm">
            {formattedTime}
          </p>
        </div>

        {/* Glass Divider Line */}
        <div className="w-full h-px bg-white/10 my-3.5" />

        {/* 8. LOCK SECTION */}
        <div className="flex items-center justify-center gap-2 mb-1 text-amber-400">
          <span className="text-base">🔒</span>
          <h2 className="text-base font-extrabold text-white tracking-tight">Screen Locked</h2>
        </div>
        <p className="text-xs text-slate-300 mb-2">
          Your session has been locked for your security.
        </p>

        {/* 9. LOCK TIMER */}
        <div
          className="inline-block px-3 py-1 rounded-full text-[11px] font-mono text-slate-200 mb-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.30)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          Locked for <span className="text-amber-400 font-bold">{formatLockDuration()}</span>
        </div>

        {/* 10. MASKED GLASS PIN INPUT FORM */}
        <form onSubmit={handleUnlockSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-2 text-center">
              Unlock with Security PIN
            </label>
            <input
              ref={inputRef}
              id="screen-lock-pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(val);
                setErrorMsg("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUnlockSubmit();
                }
              }}
              placeholder="• • • •"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
              className="w-full h-11 px-4 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 rounded-xl text-center text-xl font-mono tracking-[0.5em] text-white outline-none transition-all placeholder:tracking-normal placeholder:text-slate-500 placeholder:text-sm shadow-inner"
            />
          </div>

          {/* 11. ERROR MESSAGE — Only shown AFTER actual backend verification failure */}
          {errorMsg && (
            <div
              className="p-2.5 rounded-xl text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2 backdrop-blur-md animate-shake"
              style={{
                backgroundColor: "rgba(225, 29, 72, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.30)",
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 12. UNLOCK BUTTON */}
          <button
            type="submit"
            disabled={isLoading || pin.length < 4}
            style={{
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.35)",
            }}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Security PIN...</span>
              </>
            ) : (
              "Unlock"
            )}
          </button>
        </form>

        {/* 13. LOGIN PAGE REDIRECT LINK */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Session Protected</span>
          <button
            type="button"
            onClick={handleGoToLogin}
            className="text-blue-400 hover:text-blue-300 font-medium hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign In / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
