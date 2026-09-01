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
  const [isRotating, setIsRotating] = useState<boolean>(false);

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

  // Cycle to next wallpaper on demand with smooth rotation
  const handleNextWallpaper = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 600);
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

  const companyName = walletData?.company_name || savedUserInfo?.company_name || "Sathus Pay Store";
  const retailerName = walletData?.owner_name || walletData?.retailer_name || savedUserInfo?.full_name || savedUserInfo?.name || "Sathiya Murthy";
  const retailerCode = walletData?.retailer_code || savedUserInfo?.retailer_code || (typeof window !== "undefined" ? localStorage.getItem("p2p_active_retailer_id") : null) || "P2P-R404667";
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
      className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto overflow-x-hidden bg-[#080B11]/95 backdrop-blur-xl transition-all duration-300"
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
      }}
    >
      {/* KEYFRAME & ANIMATION INJECTIONS */}
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 16px rgba(245, 158, 11, 0.2); }
          50% { transform: scale(1.04); box-shadow: 0 0 28px rgba(245, 158, 11, 0.45); }
        }
        @keyframes goldGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.3)); }
          50% { filter: drop-shadow(0 0 18px rgba(245, 158, 11, 0.6)); }
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-card-enter {
          animation: cardEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-subtle-pulse {
          animation: subtlePulse 3s infinite ease-in-out;
        }
        .gold-gradient-text {
          background: linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* ── 1. DYNAMIC 4K WALLPAPER BACKGROUND WITH BLURHASH PLACEHOLDER ── */}
      <div className="absolute inset-0 z-0 bg-[#080B11] overflow-hidden pointer-events-none">
        {/* Instant 0ms BlurHash Canvas Placeholder */}
        <div className="absolute inset-0 z-0 transform scale-110 filter blur-[10px] opacity-75 transition-opacity duration-1000">
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

        {/* Dark Vignette & Pay2Pay Ambient Gold Glass Overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#080B11]/90 via-[#0B0F19]/80 to-[#080B11]/95 backdrop-blur-[10px]" />
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.12) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* ── 2. WALLPAPER INFO & SWITCHER BADGE (TOP-RIGHT) ── */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19]/85 border border-amber-500/20 text-white/90 text-[11px] backdrop-blur-xl shadow-lg shadow-black/40">
          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold">{currentWallpaper.title}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/60">{currentWallpaper.location}</span>
        </div>
        <button
          type="button"
          onClick={handleNextWallpaper}
          title="Change 4K Wallpaper"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-400/40 text-amber-200 hover:text-amber-100 text-xs font-bold backdrop-blur-xl transition-all shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-500 ${isRotating ? "rotate-180" : ""}`} />
          <span className="hidden sm:inline">Change Wallpaper</span>
        </button>
      </div>

      {/* ── 3. MAIN FROSTED GLASS WORKSTATION LOCK CARD ── */}
      <div
        className="animate-card-enter relative z-20 my-auto w-full max-w-[440px] text-center p-6 sm:p-8 overflow-hidden transition-all duration-300 rounded-[28px] border shadow-2xl"
        style={{
          backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(11, 15, 25, 0.88)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          borderColor: isLight ? "rgba(203, 213, 225, 0.95)" : "rgba(245, 158, 11, 0.25)",
          boxShadow: isLight
            ? "0 25px 70px rgba(0, 0, 0, 0.25), 0 4px 16px rgba(0, 0, 0, 0.08)"
            : "0 30px 80px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.08), inset 0 1px 0 rgba(254, 240, 138, 0.25)",
        }}
      >
        {/* Specular Top Sheen Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/90 to-transparent pointer-events-none" />

        {/* ── 4. OFFICIAL PAY2PAY LOGO & STORE BRANDING ── */}
        <div className="flex flex-col items-center justify-center mb-4">
          {/* P2P Logo Tile with Gold Border & Ambient Glow */}
          <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-br from-amber-400/60 via-amber-500/30 to-amber-600/60 shadow-xl shadow-amber-500/25 backdrop-blur-md mb-3 group relative overflow-hidden">
            <div className="w-full h-full rounded-[14px] flex items-center justify-center bg-[#080B11]/95 border border-amber-400/40">
              <span className="text-2xl font-black tracking-tighter gold-gradient-text drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                P2P
              </span>
            </div>
          </div>

          {/* Store / Company Name with Gold-Yellow Gradient Typography */}
          <h1 className="text-lg font-black tracking-tight flex items-center justify-center gap-1.5">
            <span className="gold-gradient-text">{companyName}</span>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          </h1>

          {/* Retailer Business Portal Sub-label */}
          <p className="text-[10.5px] font-bold tracking-widest uppercase mt-0.5 text-slate-400">
            RETAILER BUSINESS PORTAL
          </p>
        </div>

        {/* ── 5. COMPACT GLASS USER PROFILE CHIP ── */}
        <div
          className="rounded-2xl py-2 px-3.5 mb-4 max-w-[340px] mx-auto text-center flex items-center justify-center gap-3 transition-all"
          style={{
            backgroundColor: isLight ? "#F1F5F9" : "rgba(255, 255, 255, 0.04)",
            border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(245, 158, 11, 0.2)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Gold Accent Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FEF08A] to-[#F59E0B] flex items-center justify-center text-[#080B11] font-black text-xs shrink-0 shadow-md shadow-amber-500/30">
            {retailerName ? String(retailerName).charAt(0).toUpperCase() : "S"}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-black truncate text-white tracking-wide">
              {retailerName}
            </p>
            <p className="text-[11px] font-mono font-bold tracking-wider text-amber-300">
              {retailerCode}
            </p>
          </div>
        </div>

        {/* ── 6. LIVE DIGITAL CLOCK & DATE ── */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {formattedDate}
          </p>
          <p className="text-3xl sm:text-4xl font-black font-mono tracking-widest mt-1 gold-gradient-text drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]">
            {formattedTime}
          </p>
        </div>

        {/* Glass Divider Line */}
        <div className="w-full h-px my-4 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

        {/* ── 7. LOCK STATUS & DURATION ── */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center animate-subtle-pulse shadow-sm shadow-amber-500/30">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h2 className="text-sm font-extrabold tracking-tight text-white">
            Workstation Locked
          </h2>
        </div>
        <p className="text-xs mb-3 font-medium text-slate-300">
          Enter your 4-digit PIN to resume your session.
        </p>

        {/* Lock Timer Chip */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono mb-4 shadow-sm"
          style={{
            backgroundColor: isLight ? "#FEF3C7" : "rgba(245, 158, 11, 0.08)",
            border: isLight ? "1px solid #FCD34D" : "1px solid rgba(245, 158, 11, 0.25)",
            color: isLight ? "#92400E" : "#FDE68A",
          }}
        >
          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Locked for <strong className="text-amber-400 font-bold">{formatLockDuration()}</strong></span>
        </div>

        {/* ── 8. 4-DOT PIN VISUAL FEEDBACK & INPUT FORM ── */}
        <form onSubmit={handleUnlockSubmit} className="space-y-4 text-left">
          <div>
            {/* 4 Interactive PIN Dots with Radiant Gold Glow */}
            <div className="flex items-center justify-center gap-3.5 mb-3">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                      isFilled
                        ? "bg-gradient-to-br from-[#FEF08A] to-[#F59E0B] border-[#FEF08A] scale-110 shadow-lg shadow-amber-500/60 ring-2 ring-amber-400/30"
                        : isLight
                        ? "bg-slate-200 border-slate-300"
                        : "bg-[#0B0F19] border-white/15"
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
                  backgroundColor: isLight ? "#F8FAFC" : "rgba(8, 11, 17, 0.85)",
                  border: isLight ? "1.5px solid #CBD5E1" : "1.5px solid rgba(245, 158, 11, 0.3)",
                  color: isLight ? "#0F172A" : "#FFFFFF",
                }}
                className="w-full h-12 px-4 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 rounded-xl text-center text-lg font-mono font-black tracking-[0.4em] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400 placeholder:text-xs shadow-inner"
              />
            </div>
          </div>

          {/* ── 9. ERROR / HINT MESSAGE BANNER (GOLD YELLOW LUXURY THEME) ── */}
          {errorMsg && (
            <div
              className="p-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 backdrop-blur-md transition-all animate-fadeIn"
              style={{
                backgroundColor: isLight ? "rgba(254, 243, 199, 0.95)" : "rgba(245, 158, 11, 0.15)",
                border: isLight ? "1px solid rgba(251, 191, 36, 0.85)" : "1px solid rgba(245, 158, 11, 0.4)",
                boxShadow: isLight ? "0 4px 12px rgba(217, 119, 6, 0.15)" : "0 4px 16px rgba(245, 158, 11, 0.15)",
                color: isLight ? "#92400E" : "#FDE68A",
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── 10. UNLOCK BUTTON WITH GOLD-YELLOW GRADIENT ── */}
          <button
            type="submit"
            disabled={isLoading || pin.length < 4}
            style={{
              boxShadow: pin.length === 4 ? "0 8px 30px rgba(245, 158, 11, 0.45)" : "none",
            }}
            className={`w-full h-12 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
              pin.length === 4 && !isLoading
                ? "bg-gradient-to-r from-[#FEF08A] via-[#FBBF24] to-[#D97706] text-[#080B11] border-amber-300 hover:from-[#FEF08A] hover:via-[#F59E0B] hover:to-[#B45309] active:scale-[0.98] cursor-pointer shadow-lg"
                : "bg-[#0B0F19]/80 text-slate-500 border-white/10 opacity-60 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-amber-900 border-t-amber-400 rounded-full animate-spin" />
                <span>Verifying Security PIN...</span>
              </>
            ) : (
              <>
                <span>UNLOCK WORKSTATION</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ── 11. FOOTER & SWITCH ACCOUNT LINK ── */}
        <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-bold">256-Bit Encrypted</span>
          </span>
          <button
            type="button"
            onClick={handleGoToLogin}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
