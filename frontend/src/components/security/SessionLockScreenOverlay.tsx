"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, ShieldAlert, Building2, LogOut } from "lucide-react";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { useTheme } from "@/context/ThemeContext";
import { resolvePortalRoute } from "@/lib/portal-resolver";

export const SessionLockScreenOverlay: React.FC = () => {
  const { sessionState, unlockSession, lockedAt } = useSessionSecurity();
  const { walletData } = useWalletSync();
  const { effectiveTheme } = useTheme();


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

  const isLight = effectiveTheme === "light";

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none animate-fade-in"
      style={{
        backgroundColor: isLight ? "rgba(241, 245, 249, 0.85)" : "rgba(5, 12, 25, 0.55)",
        backdropFilter: "blur(10px) saturate(120%)",
        WebkitBackdropFilter: "blur(10px) saturate(120%)",
      }}
    >
      {/* ── PREMIUM DYNAMIC GLASSMORPHISM SECURITY CARD ── */}
      <div
        className="w-full max-w-[430px] text-center p-6 sm:p-7 relative overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: isLight ? "#FFFFFF" : "rgba(20, 32, 52, 0.85)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          border: isLight ? "1px solid #CBD5E1" : "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px",
          boxShadow: isLight
            ? "0 25px 70px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)"
            : "0 25px 70px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* Specular Top Sheen Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />

        {/* 5. COMPANY BRANDING */}
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className={`text-base font-bold tracking-tight drop-shadow-sm ${isLight ? "text-slate-900" : "text-white"}`}>
            {companyName}
          </h1>
        </div>

        {/* 6. RETAILER INFORMATION */}
        <div
          className="rounded-xl py-2 px-3 mb-3.5 max-w-[340px] mx-auto text-center"
          style={{
            backgroundColor: isLight ? "#F1F5F9" : "rgba(0, 0, 0, 0.20)",
            border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <p className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
            Retailer: <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{retailerName}</span>
          </p>
          <p className={`text-[11px] font-mono mt-0.5 tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {retailerCode}
          </p>
        </div>

        {/* 7. LIVE DATE & TIME */}
        <div className="mb-3.5">
          <p className={`text-xs font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`}>{formattedDate}</p>
          <p className={`text-lg font-bold font-mono tracking-widest mt-0.5 drop-shadow-sm ${isLight ? "text-slate-900" : "text-white"}`}>
            {formattedTime}
          </p>
        </div>

        {/* Glass Divider Line */}
        <div className={`w-full h-px my-3.5 ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

        {/* 8. LOCK SECTION */}
        <div className="flex items-center justify-center gap-2 mb-1 text-amber-500">
          <span className="text-base">🔒</span>
          <h2 className={`text-base font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Screen Locked
          </h2>
        </div>
        <p className={`text-xs mb-2 ${isLight ? "text-slate-600" : "text-slate-300"}`}>
          Your session has been locked for your security.
        </p>

        {/* 9. LOCK TIMER */}
        <div
          className="inline-block px-3 py-1 rounded-full text-[11px] font-mono mb-4"
          style={{
            backgroundColor: isLight ? "#FEF3C7" : "rgba(0, 0, 0, 0.30)",
            border: isLight ? "1px solid #FCD34D" : "1px solid rgba(255, 255, 255, 0.10)",
            color: isLight ? "#92400E" : "#E2E8F0",
          }}
        >
          Locked for <span className="font-bold text-amber-600 dark:text-amber-400">{formatLockDuration()}</span>
        </div>

        {/* 10. MASKED PIN INPUT FORM */}
        <form onSubmit={handleUnlockSubmit} className="space-y-4 text-left">
          <div>
            <label className={`text-xs font-semibold block mb-2 text-center ${isLight ? "text-slate-700" : "text-slate-200"}`}>
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
                backgroundColor: isLight ? "#F8FAFC" : "rgba(0, 0, 0, 0.25)",
                border: isLight ? "1px solid #CBD5E1" : "1px solid rgba(255, 255, 255, 0.12)",
                color: isLight ? "#0F172A" : "#FFFFFF",
              }}
              className="w-full h-11 px-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 rounded-xl text-center text-xl font-mono tracking-[0.5em] outline-none transition-all placeholder:tracking-normal placeholder:text-slate-400 placeholder:text-sm shadow-inner"
            />
          </div>

          {/* 11. ERROR MESSAGE */}
          {errorMsg && (
            <div
              className="p-2.5 rounded-xl text-rose-600 dark:text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2 backdrop-blur-md animate-shake"
              style={{
                backgroundColor: isLight ? "#FEE2E2" : "rgba(225, 29, 72, 0.15)",
                border: isLight ? "1px solid #FECACA" : "1px solid rgba(244, 63, 94, 0.30)",
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
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
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
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
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${isLight ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-400"}`}>
          <span>Session Protected</span>
          <button
            type="button"
            onClick={handleGoToLogin}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign In / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

