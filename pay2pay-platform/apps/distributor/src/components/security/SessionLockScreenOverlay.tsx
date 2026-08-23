"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldAlert, LogOut, RefreshCw, Image as ImageIcon, Sparkles } from "lucide-react";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { useTheme } from "@/context/ThemeContext";
import { resolvePortalRoute } from "@/lib/portal-resolver";

import { BlurHashCanvas } from "@/components/ui/blurhash-canvas";
import { BlurImage } from "@/components/ui/blur-image";
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

  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // 4K Dynamic Wallpaper State
  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState<number>(0);
  const [wallpaperLoaded, setWallpaperLoaded] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isLocked = sessionState === "LOCKED";

  // Pick a random 4K wallpaper every time screen locks
  useEffect(() => {
    if (isLocked) {
      const randomIndex = Math.floor(Math.random() * CURATED_4K_WALLPAPERS.length);
      setCurrentWallpaperIndex(randomIndex);
      setWallpaperLoaded(false);
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
    setCurrentWallpaperIndex((prev) => (prev + 1) % CURATED_4K_WALLPAPERS.length);
  };

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
  const currentWallpaper = CURATED_4K_WALLPAPERS[currentWallpaperIndex];

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
      // Show exact database API error message on verification failure
      setErrorMsg(result.message || "Incorrect Security PIN. Please enter your valid 4-digit PIN.");
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none overflow-hidden animate-fade-in">
      {/* ── 1. DYNAMIC 4K WALLPAPER BACKGROUND WITH BLURHASH PLACEHOLDER ── */}
      <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
        {/* Instant 0ms BlurHash Canvas Placeholder */}
        <div className="absolute inset-0 z-0 transform scale-110 filter blur-[8px] opacity-90 transition-opacity duration-1000">
          <BlurHashCanvas
            blurhash={currentWallpaper.blurhash || KNOWN_BLURHASHES.DARK_GRADIENT}
            width={32}
            height={32}
          />
        </div>

        {/* 4K High-Res Progressive Image */}
        <img
          key={currentWallpaper.url}
          src={currentWallpaper.url}
          alt={currentWallpaper.title}
          onLoad={() => setWallpaperLoaded(true)}
          className={`relative z-10 w-full h-full object-cover transition-all duration-1000 ease-out transform scale-105 ${
            wallpaperLoaded ? "opacity-100 blur-0" : "opacity-0 blur-lg"
          }`}
        />
        {/* Dark Vignette & Glassmorphism Blur Filter Overlay */}
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-slate-950/80 via-slate-950/65 to-slate-950/90 backdrop-blur-[6px]" />
      </div>

      {/* ── 2. WALLPAPER INFO & SWITCHER BADGE (TOP-RIGHT) ── */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10 text-white/80 text-[11px] backdrop-blur-md">
          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{currentWallpaper.title}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/60">{currentWallpaper.location}</span>
        </div>
        <button
          type="button"
          onClick={handleNextWallpaper}
          title="Change 4K Wallpaper"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">New Wallpaper</span>
        </button>
      </div>

      {/* ── 3. PREMIUM DYNAMIC GLASSMORPHISM SECURITY CARD ── */}
      <div
        className="w-full max-w-[430px] text-center p-6 sm:p-7 relative z-10 overflow-hidden transition-all duration-300 shadow-2xl"
        style={{
          backgroundColor: isLight ? "rgba(255, 255, 255, 0.90)" : "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(30px) saturate(150%)",
          WebkitBackdropFilter: "blur(30px) saturate(150%)",
          border: isLight ? "1px solid rgba(203, 213, 225, 0.8)" : "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "26px",
          boxShadow: isLight
            ? "0 25px 70px rgba(0, 0, 0, 0.20), 0 4px 12px rgba(0, 0, 0, 0.05)"
            : "0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.20)",
        }}
      >
        {/* Specular Top Sheen Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent pointer-events-none" />

        {/* ── 4. OFFICIAL PAY2PAY LOGO BADGE WITH BLURHASH ── */}
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl p-2 bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-amber-500/40 flex items-center justify-center mb-2.5 shadow-xl shadow-amber-500/10 backdrop-blur-md group relative overflow-hidden">
            <BlurImage
              src="/branding/pay2pay-logo.png"
              blurhash={KNOWN_BLURHASHES.LOGO}
              alt="Pay2Pay Logo"
              className="w-full h-full flex items-center justify-center"
              imageClassName="object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              fallbackSrc="/icon.png"
            />
          </div>
          <h1 className={`text-base font-extrabold tracking-tight flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            {companyName}
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </h1>
        </div>

        {/* ── 5. RETAILER INFORMATION ── */}
        <div
          className="rounded-xl py-2 px-3 mb-3.5 max-w-[340px] mx-auto text-center"
          style={{
            backgroundColor: isLight ? "#F1F5F9" : "rgba(0, 0, 0, 0.35)",
            border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          <p className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
            Retailer: <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{retailerName}</span>
          </p>
          <p className={`text-[11px] font-mono mt-0.5 tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {retailerCode}
          </p>
        </div>

        {/* ── 6. LIVE DATE & TIME ── */}
        <div className="mb-3.5">
          <p className={`text-xs font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`}>{formattedDate}</p>
          <p className={`text-xl font-black font-mono tracking-widest mt-0.5 drop-shadow-sm ${isLight ? "text-slate-900" : "text-white"}`}>
            {formattedTime}
          </p>
        </div>

        {/* Glass Divider Line */}
        <div className={`w-full h-px my-3.5 ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

        {/* ── 7. LOCK SECTION ── */}
        <div className="flex items-center justify-center gap-2 mb-1 text-amber-500">
          <span className="text-base">🔒</span>
          <h2 className={`text-base font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Screen Locked
          </h2>
        </div>
        <p className={`text-xs mb-2 ${isLight ? "text-slate-600" : "text-slate-300"}`}>
          Your session has been locked for your security.
        </p>

        {/* ── 8. LOCK TIMER ── */}
        <div
          className="inline-block px-3 py-1 rounded-full text-[11px] font-mono mb-4"
          style={{
            backgroundColor: isLight ? "#FEF3C7" : "rgba(0, 0, 0, 0.40)",
            border: isLight ? "1px solid #FCD34D" : "1px solid rgba(255, 255, 255, 0.12)",
            color: isLight ? "#92400E" : "#E2E8F0",
          }}
        >
          Locked for <span className="font-bold text-amber-500">{formatLockDuration()}</span>
        </div>

        {/* ── 9. MASKED PIN INPUT FORM ── */}
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
                backgroundColor: isLight ? "#F8FAFC" : "rgba(0, 0, 0, 0.35)",
                border: isLight ? "1px solid #CBD5E1" : "1px solid rgba(255, 255, 255, 0.15)",
                color: isLight ? "#0F172A" : "#FFFFFF",
              }}
              className="w-full h-11 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 rounded-xl text-center text-xl font-mono tracking-[0.5em] outline-none transition-all placeholder:tracking-normal placeholder:text-slate-400 placeholder:text-sm shadow-inner"
            />
          </div>

          {/* ── 10. ERROR MESSAGE (FROM DATABASE API) ── */}
          {errorMsg && (
            <div
              className="p-2.5 rounded-xl text-rose-600 dark:text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2 backdrop-blur-md animate-shake"
              style={{
                backgroundColor: isLight ? "#FEE2E2" : "rgba(225, 29, 72, 0.20)",
                border: isLight ? "1px solid #FECACA" : "1px solid rgba(244, 63, 94, 0.35)",
              }}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── 11. UNLOCK BUTTON ── */}
          <button
            type="submit"
            disabled={isLoading || pin.length < 4}
            style={{
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.40)",
            }}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Database Security PIN...</span>
              </>
            ) : (
              "Unlock Session"
            )}
          </button>
        </form>

        {/* ── 12. LOGIN PAGE REDIRECT LINK ── */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${isLight ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-400"}`}>
          <span>Database Protected</span>
          <button
            type="button"
            onClick={handleGoToLogin}
            className="text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign In / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
