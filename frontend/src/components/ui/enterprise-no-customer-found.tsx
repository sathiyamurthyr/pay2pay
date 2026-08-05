"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Search, RefreshCw, Mic, MicOff, QrCode, PhoneCall,
  Info, Building2, Users, ShieldCheck, CheckCircle2, AlertCircle,
  Sparkles, Plus, AlertTriangle
} from "lucide-react";
import { MobileNumberInput } from "@/components/ui/mobile-number-input";

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const playNotificationTone = (type: "SOFT" | "SUCCESS" | "WARNING" | "ERROR" = "SOFT") => {
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

    if (type === "SOFT") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "SUCCESS") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {}
};

const triggerVibration = (pattern: number | number[] = 20) => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
};

const announceScreenReader = (msg: string) => {
  if (typeof window === "undefined") return;
  const el = document.getElementById("sr-live-region");
  if (el) {
    el.textContent = "";
    requestAnimationFrame(() => { el.textContent = msg; });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG ILLUSTRATION: CUSTOMER NOT FOUND
// ─────────────────────────────────────────────────────────────────────────────

const CustomerNotFoundIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 240 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="120" cy="100" r="80" fill="#EFF6FF" />
    <ellipse cx="120" cy="140" rx="38" ry="18" fill="#DBEAFE" />
    <rect x="96" y="100" width="48" height="44" rx="12" fill="#BFDBFE" />
    <circle cx="120" cy="88" r="22" fill="#60A5FA" />
    <circle cx="113" cy="86" r="3" fill="white" />
    <circle cx="127" cy="86" r="3" fill="white" />
    <path d="M113 95 Q120 91 127 95" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    <text x="116" y="90" fontSize="14" fontWeight="900" fill="white" textAnchor="middle">?</text>
    <circle cx="168" cy="68" r="22" stroke="#3B82F6" strokeWidth="4" fill="white" fillOpacity="0.9" />
    <line x1="184" y1="84" x2="196" y2="96" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
    <line x1="160" y1="60" x2="176" y2="76" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    <line x1="176" y1="60" x2="160" y2="76" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    <circle cx="62" cy="55" r="4" fill="#FCD34D" />
    <circle cx="178" cy="130" r="3" fill="#A78BFA" />
    <circle cx="55" cy="120" r="3" fill="#6EE7B7" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTERPRISE NO CUSTOMER FOUND COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface EnterpriseNoCustomerFoundProps {
  searchQuery: string;
  onSearchAgain: () => void;
  onVoiceSearch: () => void;
  isVoiceListening?: boolean;
}

export function EnterpriseNoCustomerFound({
  searchQuery,
  onSearchAgain,
  onVoiceSearch,
  isVoiceListening = false,
}: EnterpriseNoCustomerFoundProps) {
  const router = useRouter();

  // ── Internal Mobile Input State ──
  const [mobileInput, setMobileInput] = useState(
    () => {
      const d = searchQuery.replace(/\D/g, "");
      return d.length <= 10 ? d : d.slice(0, 10);
    }
  );
  const [rippling, setRippling] = useState(false);
  const [ctaPulseTick, setCtaPulseTick] = useState(0);

  const isCtaEnabled = mobileInput.length === 10;

  // ── Appear effects ──
  useEffect(() => {
    const timer = setTimeout(() => {
      playNotificationTone("SOFT");
      triggerVibration(20);
      announceScreenReader(
        `No customer found for ${searchQuery || mobileInput}. Press Add New Customer to continue.`
      );
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  // ── Pulse CTA every 5 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      setCtaPulseTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Navigate to full registration workspace ──
  const handleAddNewCustomer = useCallback(() => {
    if (!isCtaEnabled) return;
    setRippling(true);
    playNotificationTone("SUCCESS");
    triggerVibration([30, 50, 30]);
    setTimeout(() => {
      setRippling(false);
      router.push(
        `/customers/customer-360?registerMobile=${mobileInput}&step=REGISTRATION&returnTo=/customers`
      );
    }, 280);
  }, [isCtaEnabled, mobileInput, router]);

  return (
    <>
      <div
        id="sr-live-region"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative"
        aria-label="No customer found section"
      >
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />

          <div className="p-8 sm:p-10">

            {/* Illustration + Main Message */}
            <div className="flex flex-col items-center text-center gap-6">

              <motion.div
                initial={{ scale: 0.6, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
              >
                <CustomerNotFoundIllustration className="w-40 h-32 sm:w-48 sm:h-40 drop-shadow-sm" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="space-y-2 max-w-sm"
              >
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  No customer found
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  We couldn&apos;t find a customer matching this mobile number in your tenant and company.
                </p>

                {searchQuery.trim() && (
                  <div className="mt-3 inline-flex flex-col items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 mx-auto">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Search Mobile Number
                    </span>
                    <span className="text-lg font-black font-mono text-slate-900 tracking-wider">
                      +91 {searchQuery.trim()}
                    </span>
                    <span className="text-xs text-red-600 font-extrabold">
                      No customer found for {searchQuery.trim()}.
                    </span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Mobile Number Input using Reusable MobileNumberInput Component */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="mt-8 max-w-sm mx-auto space-y-2"
            >
              <MobileNumberInput
                id="empty-state-mobile-input"
                label="Mobile Number to Register"
                ariaLabel="Customer Mobile Number to Register"
                value={mobileInput}
                onChange={(cleanVal) => setMobileInput(cleanVal)}
                placeholder="98765 43210"
                autoFocus
              />
            </motion.div>

            {/* Primary CTA: Add New Customer */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="mt-6 flex flex-col items-center gap-3"
            >
              <motion.button
                key={`cta-${ctaPulseTick}`}
                onClick={handleAddNewCustomer}
                disabled={!isCtaEnabled}
                aria-label="Add New Customer and navigate to registration workflow"
                aria-disabled={!isCtaEnabled}
                whileHover={isCtaEnabled ? { scale: 1.03 } : {}}
                whileTap={isCtaEnabled ? { scale: 0.97 } : {}}
                animate={
                  isCtaEnabled
                    ? {
                        boxShadow: [
                          "0 4px 20px 0 rgba(37,99,235,0.25)",
                          "0 4px 32px 8px rgba(37,99,235,0.45)",
                          "0 4px 20px 0 rgba(37,99,235,0.25)",
                        ],
                      }
                    : {}
                }
                transition={isCtaEnabled ? { duration: 1.6, ease: "easeInOut" } : {}}
                className={`relative overflow-hidden w-full max-w-sm flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all ${
                  isCtaEnabled
                    ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                {rippling && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 4, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white pointer-events-none"
                  />
                )}

                <motion.div
                  animate={isCtaEnabled ? { y: [0, -3, 0] } : {}}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isCtaEnabled ? "bg-white/20" : "bg-slate-300"
                  }`}
                >
                  <Plus className={`w-4 h-4 ${isCtaEnabled ? "text-white" : "text-slate-400"}`} />
                </motion.div>

                <span>Add New Customer</span>
              </motion.button>

              <p className="text-xs text-slate-500 text-center font-medium">
                {isCtaEnabled
                  ? "Create a new customer and continue the transaction."
                  : "Enter a valid 10-digit mobile number to enable registration."}
              </p>
            </motion.div>

            {/* Secondary Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-sm mx-auto"
            >
              <button
                onClick={onSearchAgain}
                aria-label="Search Again - clear search and reset filters"
                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all text-[11px] font-bold group"
              >
                <RefreshCw className="w-4 h-4 text-blue-600 group-hover:rotate-180 transition-transform duration-300" />
                <span>Search Again</span>
              </button>

              <button
                onClick={() => alert("Scan Aadhaar QR code to identify customer...")}
                aria-label="Scan Aadhaar QR code to identify customer"
                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all text-[11px] font-bold group"
              >
                <QrCode className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                <span>Scan Aadhaar QR</span>
              </button>

              <button
                onClick={onVoiceSearch}
                aria-label={isVoiceListening ? "Stop voice search" : "Start voice search"}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border text-[11px] font-bold transition-all group ${
                  isVoiceListening
                    ? "border-red-400 bg-red-50 text-red-700 animate-pulse"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {isVoiceListening ? (
                  <MicOff className="w-4 h-4 text-red-600" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                )}
                <span>{isVoiceListening ? "Listening..." : "Voice Search"}</span>
              </button>

              <button
                onClick={() => {
                  const id = window.prompt("Enter Customer ID (e.g. CUST-12345):");
                  if (id) alert(`Searching for Customer ID: ${id}`);
                }}
                aria-label="Search customer by Customer ID"
                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all text-[11px] font-bold group"
              >
                <PhoneCall className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                <span>By Customer ID</span>
              </button>
            </motion.div>

            {/* Enterprise Context Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.68 }}
              className="mt-6 max-w-sm mx-auto"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Enterprise Registration Context</span>
                </div>

                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                  Customer will be created under your current Tenant, Company &amp; Workspace.
                  Mobile number uniqueness will be validated before registration.
                </p>

                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 border border-blue-100">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-blue-500" /> Tenant
                    </span>
                    <span className="font-black text-slate-900 font-mono">PAY2PAY-PROD</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 border border-blue-100">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-indigo-500" /> Company
                    </span>
                    <span className="font-black text-slate-900 font-mono">RetailCo Ltd</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 border border-blue-100">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> Workspace
                    </span>
                    <span className="font-black text-slate-900 font-mono">DEL-RT-9082</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </>
  );
}

export default EnterpriseNoCustomerFound;
