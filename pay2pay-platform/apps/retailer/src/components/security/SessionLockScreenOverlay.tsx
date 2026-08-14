"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";

export const SessionLockScreenOverlay: React.FC = () => {
  const { sessionState, unlockSession } = useSessionSecurity();

  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = sessionState === "LOCKED";

  // Auto-focus PIN input when screen locks
  useEffect(() => {
    if (isLocked) {
      setPin("");
      setErrorMsg("");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setPin("");
      setErrorMsg("");
    }
  }, [isLocked]);

  // Lock Keyboard & Copy Protection while locked
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

  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPin = pin.replace(/\D/g, "");

    // Strict client-side format guard: must be EXACTLY 4 digits
    if (cleanPin.length !== 4) {
      setErrorMsg("PIN must be exactly 4 digits.");
      inputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const result = await unlockSession(cleanPin);
    setIsLoading(false);

    if (!result.success) {
      // Show exact server-side message (lockout, wrong PIN, etc.)
      setErrorMsg(result.message || "Invalid security PIN. Please try again.");
      setPin("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none">
      {/* ── Security Lock Modal Card ── */}
      <div className="w-full max-w-[420px] bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-black/90 relative overflow-hidden">
        {/* Specular Top Border Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none" />

        {/* 🔒 Lock Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        {/* Modal Heading & Subtitle */}
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          Screen Locked
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed max-w-[280px] mx-auto">
          Your session is temporarily locked for security.
        </p>

        {/* PIN Form */}
        <form onSubmit={handleUnlockSubmit} className="space-y-5 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 text-center">
              Enter your security PIN
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
                // Strip non-digits and enforce maximum 4-digit limit
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
              className="w-full h-12 px-4 bg-slate-950/90 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-center text-xl font-mono tracking-[0.4em] text-white outline-none transition-all placeholder:tracking-normal placeholder:text-slate-600 placeholder:text-sm"
            />
          </div>

          {/* Invalid PIN Error Alert — shows exact backend error message */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unlock Button — disabled during API verification */}
          <button
            type="submit"
            disabled={isLoading || pin.length < 4}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-blue-600/25 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              "Unlock"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
