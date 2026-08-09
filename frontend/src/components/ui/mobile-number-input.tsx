"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Phone } from "lucide-react";
import { normalizePhoneNumber } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO & HAPTICS SYNTHESIZER
// ─────────────────────────────────────────────────────────────────────────────

const playTone = (type: "SUCCESS" | "WARNING" | "ERROR" | "CLICK") => {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === "SUCCESS") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "WARNING") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(261.63, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "ERROR") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (e) {}
};

const triggerVibration = (ms: number = 20) => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROPS INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileNumberInputProps {
  value: string;
  onChange: (raw10Digits: string) => void;
  onSearch?: (raw10Digits: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  showCounter?: boolean;
  isLoading?: boolean;
  error?: string | null;
  required?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

export const MobileNumberInput: React.FC<MobileNumberInputProps> = ({
  value = "",
  onChange,
  onSearch,
  label,
  placeholder = "98765 43210",
  id = "mobile-number-input",
  ariaLabel = "Customer Mobile Number",
  disabled = false,
  autoFocus = false,
  className = "",
  showCounter = true,
  isLoading = false,
  error: externalError = null,
  required = false,
}) => {
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isSearchingInternal, setIsSearchingInternal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean raw 10-digit string
  const cleanDigits = value.replace(/\D/g, "").slice(0, 10);
  const is10Digits = cleanDigits.length === 10;

  // Clear warning msg after 2.5s
  const showWarning = (msg: string, soundType: "WARNING" | "ERROR" = "WARNING", vibrateMs: number = 20) => {
    setWarningMsg(msg);
    playTone(soundType);
    triggerVibration(vibrateMs);
    setTimeout(() => {
      setWarningMsg(null);
    }, 2500);
  };

  // 300ms Debounce lookup when 10 digits are reached
  useEffect(() => {
    if (is10Digits && onSearch) {
      setIsSearchingInternal(true);
      playTone("SUCCESS");
      triggerVibration(15);

      const timer = setTimeout(() => {
        setIsSearchingInternal(false);
        onSearch(cleanDigits);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setIsSearchingInternal(false);
    }
  }, [cleanDigits, is10Digits, onSearch]);

  // ── Keyboard handler (Ignore non-numeric keys, block > 10 digits) ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation, deletion & system shortcuts
    const allowedControlKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "Home", "End"
    ];

    if (allowedControlKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Check if key is a digit (0-9)
    const isDigit = /^[0-9]$/.test(e.key);

    if (!isDigit) {
      e.preventDefault();
      showWarning("Only numeric digits (0-9) are allowed.", "WARNING", 20);
      return;
    }

    // If key is a digit, check length cap
    if (cleanDigits.length >= 10 && !isSelectionReplacing(inputRef.current)) {
      e.preventDefault();
      showWarning("Maximum 10 digits allowed.", "ERROR", 30);
      return;
    }
  };

  // Check if text selection replaces characters
  const isSelectionReplacing = (el: HTMLInputElement | null) => {
    if (!el) return false;
    return (el.selectionEnd ?? 0) - (el.selectionStart ?? 0) > 0;
  };

  // ── Paste Handler (Sanitize + +91 removal + Letter stripping + Normalization) ──
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text") || "";
    
    // Check if pasted text had non-digits or exceeded 10 digits
    const hadLetters = /[a-zA-Z]/.test(pastedText);
    const hadSpecial = /[^\d\s\-\+\(\)\.]/.test(pastedText);

    let sanitized = normalizePhoneNumber(pastedText);

    if (hadLetters || hadSpecial) {
      showWarning("Only numeric digits (0-9) are allowed.", "WARNING", 20);
    }

    if (sanitized.length > 10) {
      sanitized = sanitized.slice(0, 10);
      showWarning("Maximum 10 digits allowed.", "ERROR", 30);
    }

    onChange(sanitized);
  };

  // ── Drag & Drop Prevention ──
  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    showWarning("Only numeric typing or pasting is allowed.", "WARNING", 20);
  };

  // ── Change Handler ──
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, "").slice(0, 10);
    onChange(clean);
  };

  // Format mask display: 98765 43210
  const formattedDisplay = cleanDigits.length > 5
    ? `${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
    : cleanDigits;

  const activeLoading = isLoading || isSearchingInternal;
  const activeError = externalError || warningMsg;

  return (
    <div className={`space-y-1.5 font-sans ${className}`}>
      {/* Label and Live Digit Counter Header */}
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={id} className="block text-xs font-black text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        {showCounter && (
          <span
            className={`text-[11px] font-mono font-bold transition-colors ${
              is10Digits
                ? "text-[#22C55E]"
                : cleanDigits.length > 0
                ? "text-slate-600"
                : "text-slate-400"
            }`}
          >
            {cleanDigits.length}/10 Digits {is10Digits ? "✓" : ""}
          </span>
        )}
      </div>

      {/* Input Container */}
      <div className="relative flex items-center">
        {/* Country Code Prefix */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
          <span className="flex items-center gap-1">
            <span>🇮🇳</span>
            <span className="font-mono text-slate-700">+91</span>
          </span>
        </div>

        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          aria-autocomplete="none"
          aria-label={ariaLabel}
          aria-invalid={Boolean(activeError)}
          aria-describedby={`${id}-msg`}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={11}
          value={formattedDisplay}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          placeholder={placeholder}
          className={`w-full pl-20 pr-11 py-3 rounded-2xl text-sm font-black font-mono tracking-wider border-2 outline-none transition-all min-h-[48px] ${
            disabled
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : activeError
              ? "border-[#EF4444] bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-500/20"
              : is10Digits
              ? "border-[#22C55E] bg-emerald-50/30 text-emerald-950 focus:ring-2 focus:ring-emerald-500/20"
              : "border-slate-300 bg-white text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20"
          }`}
        />

        {/* Right Status / Loading Indicator */}
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          {activeLoading ? (
            <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
          ) : is10Digits ? (
            <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
          ) : activeError ? (
            <AlertCircle className="w-5 h-5 text-[#EF4444]" />
          ) : null}
        </div>
      </div>

      {/* Validation Message Footer */}
      <AnimatePresence mode="wait">
        {activeError ? (
          <motion.div
            id={`${id}-msg`}
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#EF4444] px-1 pt-0.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{activeError}</span>
          </motion.div>
        ) : is10Digits ? (
          <motion.div
            id={`${id}-msg`}
            key="valid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E] px-1 pt-0.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>✓ Valid Mobile Number</span>
          </motion.div>
        ) : (
          <motion.div
            id={`${id}-msg`}
            key="helper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] font-medium text-slate-500 px-1"
          >
            Enter a valid 10-digit mobile number.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileNumberInput;
