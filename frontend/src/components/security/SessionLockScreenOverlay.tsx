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

  // 3-Attempt Security Failure Tracking
  const MAX_FAILED_ATTEMPTS = 3;
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("p2p_workstation_failed_attempts");
      return stored ? parseInt(stored, 10) || 0 : 0;
    }
    return 0;
  });

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

  // Auto-focus PIN input when screen locks & clear previous errors/attempts on unlock
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
      setFailedAttempts(0);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("p2p_workstation_failed_attempts");
      }
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

  const companyName = (walletData as any)?.company_name || savedUserInfo?.company_name || "Sathus Pay Store";
  const retailerName = (walletData as any)?.owner_name || (walletData as any)?.retailer_name || savedUserInfo?.full_name || savedUserInfo?.name || "Sathiya Murthy";
  const retailerCode = (walletData as any)?.retailer_code || savedUserInfo?.retailer_code || (typeof window !== "undefined" ? localStorage.getItem("p2p_active_retailer_id") : null) || "P2P-R404667";
  const currentWallpaper = CURATED_4K_WALLPAPERS[currentWallpaperIndex] || CURATED_4K_WALLPAPERS[0];

  // Handle PIN Unlock Submission
  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPin = pin.replace(/\D/g, "");

    // Must be 4 digits to submit. Silent reject without any format error message
    if (cleanPin.length !== 4) {
      inputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const result = await unlockSession(cleanPin);
    setIsLoading(false);

    if (result.success) {
      // Reset failed attempts completely on success
      setFailedAttempts(0);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("p2p_workstation_failed_attempts");
      }
      setErrorMsg("");
      return;
    }

    // Increment incorrect attempt counter
    const currentAttempts = failedAttempts + 1;
    setFailedAttempts(currentAttempts);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("p2p_workstation_failed_attempts", String(currentAttempts));
    }

    // On 3rd incorrect attempt: immediately logout and redirect to login
    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("p2p_workstation_failed_attempts");
      }
      handleLogout();
      return;
    }

    setErrorMsg((result as any)?.message || "Incorrect security PIN. Please try again.");
    setPin("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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

  // Authoritative Session Termination & Logout (Used for 3-attempt lockout and LOGOUT button)
  const handleLogout = () => {
    try {
      const cookiesToClear = [
        "p2p_access_token",
        "pay2pay_access_token",
        "pay2pay_auth_token",
        "p2p_user_role",
        "pay2pay_user_role",
        "p2p_session_locked",
        "p2p_session_locked_at",
        "p2p_session_last_active",
        "p2p_session_start_time",
        "p2p_session_id",
        "pay2pay_user_data",
        "user_info",
        "token",
        "access_token",
        "p2p_active_retailer_id",
      ];
      cookiesToClear.forEach((cookieName) => {
        document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        try {
          document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        } catch {}
      });
      localStorage.removeItem("pay2pay_access_token");
      localStorage.removeItem("pay2pay_auth_token");
      localStorage.removeItem("p2p_access_token");
      localStorage.removeItem("p2p_session_locked");
      localStorage.removeItem("p2p_session_locked_at");
      localStorage.removeItem("p2p_session_last_active");
      localStorage.removeItem("p2p_session_start_time");
      localStorage.removeItem("pay2pay_user_data");
      localStorage.removeItem("user_info");
      sessionStorage.removeItem("p2p_workstation_failed_attempts");

      if ("BroadcastChannel" in window) {
        try {
          const authChannel = new BroadcastChannel("p2p_session_auth_channel");
          authChannel.postMessage({ type: "GLOBAL_LOGOUT", timestamp: Date.now() });
          authChannel.close();
        } catch {}
        try {
          const lockChannel = new BroadcastChannel("p2p_session_lock_channel");
          lockChannel.postMessage({ type: "BROADCAST_TERMINATE", reason: "max_pin_attempts" });
          lockChannel.close();
        } catch {}
      }

      fetch("/api/v1/auth/enterprise/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_info: typeof navigator !== "undefined" ? navigator.userAgent : "Browser" }),
      }).catch(() => {});
      fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    } catch (e) {}

    try {
      const rawRole = (typeof window !== "undefined" ? localStorage.getItem("p2p_user_role") : null) || "RETAILER";
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
        className="animate-card-enter relative z-20 my-auto w-full max-w-[460px] text-center p-6 sm:p-7 overflow-hidden transition-all duration-300 rounded-[28px] border shadow-2xl"
        style={{
          backgroundColor: "rgba(11, 15, 25, 0.94)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          borderColor: "rgba(245, 158, 11, 0.28)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.85), 0 0 35px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(254, 240, 138, 0.25)",
        }}
      >
        {/* Specular Top Sheen Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/90 to-transparent pointer-events-none" />

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── TOP SECTION: SECURITY / UNLOCK (PRIMARY ACTION AREA) ──────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-center text-center mb-5">
          {/* Glowing Lock Icon */}
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center animate-subtle-pulse shadow-md shadow-amber-500/30 mb-2.5">
            <Lock className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          </div>

          {/* 1. Workstation Locked Title */}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Workstation Locked</span>
          </h1>

          {/* 2. Enter your 4-digit Security PIN Subtitle */}
          <p className="text-xs sm:text-[13px] font-medium text-slate-300 mt-1">
            Enter your 4-digit PIN to resume your session
          </p>
        </div>

        {/* 3, 4, 5, 6: PIN Indicator Dots -> PIN Input -> Action Buttons Form */}
        <form onSubmit={handleUnlockSubmit} className="space-y-4">
          {/* 4. PIN Indicator Dots */}
          <div className="flex items-center justify-center gap-3.5 mb-1">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    isFilled
                      ? "bg-gradient-to-br from-[#FEF08A] to-[#F59E0B] border-[#FEF08A] scale-110 shadow-lg shadow-amber-500/60 ring-2 ring-amber-400/30"
                      : "bg-[#080B11] border-white/25"
                  }`}
                />
              );
            })}
          </div>

          {/* 3. PIN Input Box */}
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
                backgroundColor: "rgba(8, 11, 17, 0.9)",
                border: failedAttempts > 0 ? "1.5px solid rgba(245, 158, 11, 0.6)" : "1.5px solid rgba(245, 158, 11, 0.35)",
                color: "#FFFFFF",
              }}
              className="w-full h-12 px-4 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 rounded-xl text-center text-lg font-mono font-black tracking-[0.45em] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400 placeholder:text-xs shadow-inner"
            />
          </div>

          {/* Error Message Display if failed attempt */}
          {errorMsg && (
            <p className="text-[11.5px] font-bold text-rose-400 text-center -mt-1">
              {errorMsg}
            </p>
          )}

          {/* 5 & 6. Side-by-Side Action Buttons: [ LOGOUT ] | [ UNLOCK WORKSTATION → ] */}
          <div className="grid grid-cols-2 gap-3 w-full pt-0.5">
            {/* 5. LEFT: LOGOUT BUTTON */}
            <button
              type="button"
              onClick={handleLogout}
              title="Terminate session and return to login"
              className="w-full h-12 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border bg-white/[0.04] hover:bg-rose-500/15 text-slate-300 hover:text-rose-200 border-white/10 hover:border-rose-500/40 active:scale-[0.98] cursor-pointer shadow-md backdrop-blur-md"
            >
              <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
              <span>LOGOUT</span>
            </button>

            {/* 6. RIGHT: UNLOCK WORKSTATION BUTTON */}
            <button
              type="submit"
              disabled={isLoading || pin.length < 4}
              style={{
                boxShadow: pin.length === 4 && !isLoading ? "0 8px 30px rgba(245, 158, 11, 0.45)" : "none",
              }}
              className={`w-full h-12 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                pin.length === 4 && !isLoading
                  ? "bg-gradient-to-r from-[#FEF08A] via-[#FBBF24] to-[#D97706] text-[#080B11] border-amber-300 hover:from-[#FEF08A] hover:via-[#F59E0B] hover:to-[#B45309] active:scale-[0.98] cursor-pointer shadow-lg"
                  : "bg-[#0B0F19]/80 text-slate-500 border-white/10 opacity-60 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-900 border-t-amber-400 rounded-full animate-spin shrink-0" />
                  <span className="truncate">VERIFYING...</span>
                </>
              ) : (
                <>
                  <span className="truncate">UNLOCK WORKSTATION</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Elegant Glass Divider Line */}
        <div className="w-full h-px my-5 bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── BOTTOM SECTION: ACCOUNT / SESSION INFORMATION ─────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2.5 text-left">
          {/* 1. Account & Store Information Card (P2P Branding + Sathus Pay Store + Retailer Portal + Retailer Details) */}
          <div
            className="rounded-2xl p-2.5 flex items-center justify-between gap-3 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(245, 158, 11, 0.18)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Left: P2P Branding & Store Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl p-0.5 bg-gradient-to-br from-amber-400/60 to-amber-600/60 shadow-md shadow-amber-500/20 shrink-0">
                <div className="w-full h-full rounded-[10px] flex items-center justify-center bg-[#080B11]/95 border border-amber-400/40">
                  <span className="text-xs font-black tracking-tighter gold-gradient-text">
                    P2P
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-xs font-black truncate gold-gradient-text">
                    {companyName}
                  </h2>
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                </div>
                <p className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 truncate">
                  RETAILER BUSINESS PORTAL
                </p>
              </div>
            </div>

            {/* Right: Retailer Profile Pill (Retailer Name & Retailer ID) */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FEF08A] to-[#F59E0B] flex items-center justify-center text-[#080B11] font-black text-[10px] shrink-0 shadow-sm shadow-amber-500/30">
                {retailerName ? String(retailerName).charAt(0).toUpperCase() : "S"}
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-white leading-tight truncate max-w-[110px]">
                  {retailerName}
                </p>
                <p className="text-[9.5px] font-mono font-bold text-amber-300 leading-tight">
                  {retailerCode}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Date, Time & Locked Duration Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Current Date & Time */}
            <div
              className="rounded-xl px-3 py-2 flex flex-col justify-center"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                {formattedDate}
              </span>
              <span className="text-sm font-mono font-black tracking-wider text-amber-300 mt-0.5">
                {formattedTime}
              </span>
            </div>

            {/* Locked Duration */}
            <div
              className="rounded-xl px-3 py-2 flex flex-col justify-center"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-400">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Locked Duration</span>
              </div>
              <span className="text-sm font-mono font-black tracking-wider text-amber-400 mt-0.5">
                {formatLockDuration()}
              </span>
            </div>
          </div>

          {/* 3. Security Notice & Dynamic Attempt Tracking */}
          <div
            className={`p-2.5 rounded-xl text-xs transition-all backdrop-blur-md flex flex-col gap-1 border ${
              failedAttempts > 0
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm"
                : "bg-white/[0.02] border-white/8 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${failedAttempts > 0 ? "text-amber-400" : "text-amber-400/80"}`} />
                <span className="font-bold text-[11px] leading-tight">
                  {failedAttempts > 0 ? (
                    <span className="text-amber-300 font-bold">Incorrect Security PIN</span>
                  ) : (
                    <span className="text-slate-300 font-semibold">Security Notice</span>
                  )}
                </span>
              </div>

              {failedAttempts > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500/20 border border-amber-400/40 text-amber-300 shrink-0">
                  Attempt {failedAttempts} / {MAX_FAILED_ATTEMPTS}
                </span>
              )}
            </div>

            <p className={`text-[10.5px] leading-relaxed ${failedAttempts > 0 ? "text-amber-200/90 font-medium" : "text-slate-400"}`}>
              For your security, session auto-logs out after 3 incorrect PIN attempts.
            </p>

            {failedAttempts === 2 && (
              <p className="text-[10px] font-bold text-rose-400 pt-0.5">
                ⚠️ Warning: 1 attempt remaining before automatic logout.
              </p>
            )}
          </div>

          {/* 4. 256-Bit Encrypted & Switch Account Link */}
          <div className="pt-2 border-t border-white/8 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-bold text-[11px]">256-Bit Encrypted</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          </div>
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
