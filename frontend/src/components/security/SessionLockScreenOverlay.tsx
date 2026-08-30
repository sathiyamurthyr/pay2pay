"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ShieldAlert,
  LogOut,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { useTheme } from "@/context/ThemeContext";
import { resolvePortalRoute } from "@/lib/portal-resolver";
import { BlurHashCanvas } from "@/components/ui/blurhash-canvas";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";

// Curated Collection of 4K FinTech, Architectural & Deep Abstract Wallpapers with BlurHashes
const CURATED_4K_WALLPAPERS = [
  {
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=3840&q=85",
    title: "Quantum Circuit Core",
    location: "Global Data Center",
    blurhash: "L69tAee-ROs:0ya|oga|jtfQWBfQ",
  },
  {
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=3840&q=85",
    title: "Interconnected Satellite Network",
    location: "Orbital Space",
    blurhash: "L33bm@fQRiayWAayayfQ9Dayj]fQ",
  },
  {
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=3840&q=85",
    title: "Metropolitan Financial District",
    location: "Tokyo, Japan",
    blurhash: "LuFsDPWBRjkC.9j[Rjj[fkj]ayWB",
  },
  {
    url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=3840&q=85",
    title: "Enterprise Capital Tower",
    location: "Frankfurt, Germany",
    blurhash: "LDBzObWB.Sj[j[fPadax-;WBjsfQ",
  },
  {
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=3840&q=85",
    title: "Midnight Obsidian Fluidity",
    location: "Abstract Geometry",
    blurhash: "LfH1ytylR}e:[qwca_a{JQf9jta|",
  },
  {
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=3840&q=85",
    title: "Cybernetic Data Matrix",
    location: "Secure Node",
    blurhash: "L12izgp=gJfQkTfQayayVvafayfQ",
  },
  {
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=3840&q=85",
    title: "High-Throughput Node Hub",
    location: "FinTech Exchange",
    blurhash: "LO9j7}NuRKo1WTf6fRfRM@jtfmWV",
  },
  {
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=3840&q=85",
    title: "Prismatic Aurora Horizon",
    location: "Reykjavik, Iceland",
    blurhash: "L~NvP_rYeCja|pazWWfQafWpa|a{",
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=85",
    title: "Alpine Starfield Starlight",
    location: "Zermatt, Switzerland",
    blurhash: "LWAmobxGfPfRj^fQayay4,Naazay",
  },
  {
    url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=3840&q=85",
    title: "Obsidian Twilight Cityscape",
    location: "Chicago, USA",
    blurhash: "LvCuA6fRayfQk]fQayfQNbayayay",
  },
];

export const SessionLockScreenOverlay: React.FC = () => {
  const { sessionState, unlockSession, lockedAt } = useSessionSecurity();
  const { walletData } = useWalletSync();
  const { effectiveTheme } = useTheme();

  const [mounted, setMounted] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // 4K Dynamic Wallpaper State
  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState<number>(0);
  const [wallpaperLoaded, setWallpaperLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isLocked = sessionState === "LOCKED";

  // Mount tracking for SSR hydration safety & React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pick a random 4K wallpaper every time screen locks
  useEffect(() => {
    if (isLocked) {
      const randomIndex = Math.floor(Math.random() * CURATED_4K_WALLPAPERS.length);
      setCurrentWallpaperIndex(randomIndex);
      setWallpaperLoaded(false);
      setImageError(false);
    }
  }, [isLocked]);

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

  // Cycle to next wallpaper on demand
  const handleNextWallpaper = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageError(false);
    setWallpaperLoaded(false);
    setCurrentWallpaperIndex((prev) => (prev + 1) % CURATED_4K_WALLPAPERS.length);
  };

  // Format Elapsed Lock Duration (e.g. 00:42)
  const formatLockDuration = () => {
    const lockTs = Number(lockedAt) || currentTime.getTime();
    const elapsedSeconds = Math.max(0, Math.floor((currentTime.getTime() - lockTs) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Format Date & Time safely
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
  let savedUserInfo: any = null;
  if (typeof window !== "undefined") {
    try {
      const uStr = localStorage.getItem("user_info") || localStorage.getItem("pay2pay_user_data");
      if (uStr) savedUserInfo = JSON.parse(uStr);
    } catch {}
  }

  const companyName = walletData?.company_name || savedUserInfo?.company_name || "Pay2Pay Enterprise";
  const retailerName = walletData?.owner_name || walletData?.retailer_name || savedUserInfo?.full_name || savedUserInfo?.name || "Retailer Partner";
  const retailerCode = walletData?.retailer_code || savedUserInfo?.retailer_code || (typeof window !== "undefined" ? localStorage.getItem("p2p_active_retailer_id") : null) || "RET-9182";
  const currentWallpaper = CURATED_4K_WALLPAPERS[currentWallpaperIndex] || CURATED_4K_WALLPAPERS[0];

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
      setErrorMsg(result.message || "Incorrect Security PIN. Please enter your valid 4-digit PIN.");
      setPin("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // Auto-submit when user finishes typing 4 digits
  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setPin(clean);
    setErrorMsg("");
    if (clean.length === 4) {
      setTimeout(() => {
        handleUnlockSubmit();
      }, 80);
    }
  };

  // Redirect to Login Page / Switch Account
  const handleGoToLogin = () => {
    try {
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
      localStorage.removeItem("pay2pay_access_token");
      localStorage.removeItem("pay2pay_auth_token");
      localStorage.removeItem("p2p_session_locked");
      localStorage.removeItem("p2p_session_locked_at");
      localStorage.removeItem("p2p_session_last_active");
      localStorage.removeItem("p2p_session_start_time");
      localStorage.removeItem("pay2pay_user_data");
      localStorage.removeItem("user_info");

      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("p2p_session_lock_channel");
        channel.postMessage({ type: "BROADCAST_UNLOCK" });
        channel.close();
      }
    } catch (e) {}

    try {
      const rawRole = localStorage.getItem("p2p_user_role") || "RETAILER";
      const portalConfig = resolvePortalRoute(rawRole);
      window.location.href = portalConfig.login;
    } catch (e) {
      window.location.href = "/retailer/login";
    }
  };

  const isLight = effectiveTheme === "light";

  const overlayContent = (
    <div
      id="pay2pay-session-lockscreen-root"
      className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto bg-slate-950/90 backdrop-blur-md transition-all duration-300"
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
      }}
    >
      {/* ── 1. DYNAMIC 4K WALLPAPER BACKGROUND WITH BLURHASH PLACEHOLDER ── */}
      <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden pointer-events-none">
        {/* Instant 0ms BlurHash Canvas Placeholder */}
        <div className="absolute inset-0 z-0 transform scale-110 filter blur-[8px] opacity-90 transition-opacity duration-1000">
          <BlurHashCanvas
            blurhash={currentWallpaper.blurhash || KNOWN_BLURHASHES.DARK_GRADIENT}
            width={32}
            height={32}
          />
        </div>

        {/* 4K High-Res Progressive Image with graceful error fallback */}
        {!imageError && (
          <img
            key={currentWallpaper.url}
            src={currentWallpaper.url}
            alt={currentWallpaper.title}
            onLoad={() => setWallpaperLoaded(true)}
            onError={() => setImageError(true)}
            className={`relative z-10 w-full h-full object-cover transition-all duration-1000 ease-out transform scale-105 ${
              wallpaperLoaded ? "opacity-100 blur-0" : "opacity-0 blur-lg"
            }`}
          />
        )}

        {/* Dark Vignette & Glassmorphism Blur Filter Overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/95 backdrop-blur-[6px]" />
      </div>

      {/* ── 2. WALLPAPER INFO & SWITCHER BADGE (TOP-RIGHT) ── */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/15 text-white/90 text-[11px] backdrop-blur-xl shadow-lg shadow-black/20">
          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold">{currentWallpaper.title}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/60">{currentWallpaper.location}</span>
        </div>
        <button
          type="button"
          onClick={handleNextWallpaper}
          title="Change 4K Wallpaper"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white text-xs font-bold backdrop-blur-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Wallpaper</span>
        </button>
      </div>

      {/* ── 3. PREMIUM DYNAMIC GLASSMORPHISM SECURITY CARD ── */}
      <div
        className="relative z-20 my-auto w-full max-w-[440px] text-center p-6 sm:p-8 overflow-hidden transition-all duration-300 rounded-[28px] border shadow-2xl"
        style={{
          backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          borderColor: isLight ? "rgba(203, 213, 225, 0.95)" : "rgba(255, 255, 255, 0.18)",
          boxShadow: isLight
            ? "0 25px 70px rgba(0, 0, 0, 0.25), 0 4px 16px rgba(0, 0, 0, 0.08)"
            : "0 30px 80px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
        }}
      >
        {/* Specular Top Sheen Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent pointer-events-none" />

        {/* ── 4. OFFICIAL PAY2PAY LOGO BADGE ── */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl p-2 bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-amber-500/50 flex items-center justify-center mb-3 shadow-xl shadow-amber-500/20 backdrop-blur-md group relative overflow-hidden">
            <div className="w-full h-full rounded-[14px] flex items-center justify-center bg-slate-950">
              <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                P2P
              </span>
            </div>
          </div>
          <h1 className={`text-base font-black tracking-tight flex items-center justify-center gap-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            <span>{companyName}</span>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          </h1>
          <p className={`text-[11px] font-semibold tracking-wide uppercase mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Retailer Business Portal
          </p>
        </div>

        {/* ── 5. RETAILER INFORMATION BADGE ── */}
        <div
          className="rounded-2xl py-2.5 px-4 mb-4 max-w-[350px] mx-auto text-center flex items-center justify-center gap-3 transition-colors"
          style={{
            backgroundColor: isLight ? "#F1F5F9" : "rgba(0, 0, 0, 0.45)",
            border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
            {retailerName ? String(retailerName).charAt(0).toUpperCase() : "R"}
          </div>
          <div className="min-w-0 text-left">
            <p className={`text-xs font-extrabold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
              {retailerName}
            </p>
            <p className={`text-[11px] font-mono font-bold tracking-wider ${isLight ? "text-blue-600" : "text-blue-400"}`}>
              {retailerCode}
            </p>
          </div>
        </div>

        {/* ── 6. LIVE DIGITAL CLOCK & DATE ── */}
        <div className="mb-4">
          <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>
            {formattedDate}
          </p>
          <p className={`text-2xl sm:text-3xl font-black font-mono tracking-widest mt-1 drop-shadow-md ${isLight ? "text-slate-900" : "text-white"}`}>
            {formattedTime}
          </p>
        </div>

        {/* Glass Divider Line */}
        <div className={`w-full h-px my-4 ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

        {/* ── 7. LOCK STATUS & DURATION ── */}
        <div className="flex items-center justify-center gap-2 mb-1.5 text-amber-500">
          <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h2 className={`text-sm font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Workstation Locked
          </h2>
        </div>
        <p className={`text-xs mb-3 font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`}>
          Enter your 4-digit PIN to resume your session.
        </p>

        {/* Lock Timer Chip */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono mb-4 shadow-sm"
          style={{
            backgroundColor: isLight ? "#FEF3C7" : "rgba(0, 0, 0, 0.50)",
            border: isLight ? "1px solid #FCD34D" : "1px solid rgba(255, 255, 255, 0.18)",
            color: isLight ? "#92400E" : "#E2E8F0",
          }}
        >
          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Locked for <strong className="text-amber-500 font-bold">{formatLockDuration()}</strong></span>
        </div>

        {/* ── 8. 4-DOT PIN VISUAL FEEDBACK & INPUT FORM ── */}
        <form onSubmit={handleUnlockSubmit} className="space-y-4 text-left">
          <div>
            {/* 4 Interactive PIN Dots */}
            <div className="flex items-center justify-center gap-3.5 mb-3">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                      isFilled
                        ? "bg-blue-500 border-blue-400 scale-110 shadow-md shadow-blue-500/40"
                        : isLight
                        ? "bg-slate-200 border-slate-300"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  />
                );
              })}
            </div>

            {/* Accessible Styled Input */}
            <div className="relative">
              <input
                ref={inputRef}
                id="screen-lock-pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnlockSubmit();
                  }
                }}
                placeholder="Enter 4-Digit Security PIN"
                style={{
                  backgroundColor: isLight ? "#F8FAFC" : "rgba(0, 0, 0, 0.50)",
                  border: isLight ? "1.5px solid #CBD5E1" : "1.5px solid rgba(255, 255, 255, 0.22)",
                  color: isLight ? "#0F172A" : "#FFFFFF",
                }}
                className="w-full h-12 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 rounded-xl text-center text-lg font-mono font-black tracking-[0.4em] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400 placeholder:text-xs shadow-inner"
              />
            </div>
          </div>

          {/* ── 9. ERROR / HINT MESSAGE BANNER (GOLD YELLOW LUXURY THEME) ── */}
          {errorMsg && (
            <div
              className="p-3 rounded-xl text-amber-800 dark:text-amber-200 text-xs font-bold text-center flex items-center justify-center gap-2 backdrop-blur-md transition-all animate-fadeIn"
              style={{
                backgroundColor: isLight ? "rgba(254, 243, 199, 0.95)" : "rgba(245, 158, 11, 0.18)",
                border: isLight ? "1px solid rgba(251, 191, 36, 0.85)" : "1px solid rgba(251, 191, 36, 0.45)",
                boxShadow: isLight ? "0 4px 12px rgba(217, 119, 6, 0.15)" : "0 4px 16px rgba(245, 158, 11, 0.15)",
                color: isLight ? "#92400E" : "#FDE68A",
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── 10. UNLOCK BUTTON ── */}
          <button
            type="submit"
            disabled={isLoading || pin.length < 4}
            style={{
              boxShadow: pin.length === 4 ? "0 6px 24px rgba(37, 99, 235, 0.45)" : "none",
            }}
            className={`w-full h-12 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/10 ${
              pin.length === 4 && !isLoading
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] cursor-pointer"
                : "bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Security PIN...</span>
              </>
            ) : (
              <>
                <span>Unlock Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ── 11. FOOTER & SWITCH ACCOUNT LINK ── */}
        <div className={`mt-5 pt-3.5 border-t flex items-center justify-between text-xs font-semibold ${isLight ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-400"}`}>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit Encrypted</span>
          </span>
          <button
            type="button"
            onClick={handleGoToLogin}
            className="text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return overlayContent;
  }

  return createPortal(overlayContent, document.body);
};

export default SessionLockScreenOverlay;
