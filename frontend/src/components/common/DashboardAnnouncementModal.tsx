"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Flame,
  MessageCircle,
  Sparkles,
} from "lucide-react";

interface AnnouncementLink {
  label: string;
  url: string;
  icon?: string;
}

interface Announcement {
  id: string;
  header: string;
  body: string;
  image_url?: string | null;
  images?: string[];
  links?: AnnouncementLink[];
  audience: string;
  priority: string;
  created_at: string;
}

function AnnouncementBannerImage({
  imageUrl,
  title,
}: {
  imageUrl?: string | null;
  title: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (!imageUrl || imgError) {
    return null;
  }

  const resolvedUrl = imageUrl.startsWith("/uploads/") ? imageUrl : imageUrl;

  return (
    <div className="relative w-full bg-gradient-to-b from-[#040711] via-[#070d1d] to-[#0a1226] flex items-center justify-center border-b border-amber-500/20 overflow-hidden max-h-[300px] sm:max-h-[360px] md:max-h-[400px]">
      {/* Soft blurred ambient image backdrop to seamlessly fill any aspect-ratio gaps without distortion */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${resolvedUrl})` }}
      />

      {/* Foreground Image without distortion or stretching */}
      <img
        src={resolvedUrl}
        alt={title}
        className="relative z-10 w-auto max-w-full h-auto max-h-[300px] sm:max-h-[360px] md:max-h-[400px] object-contain block select-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]"
        loading="eager"
        onError={() => setImgError(true)}
      />

      {/* Subtle gold gradient accent overlay along bottom edge */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-[#080d19] to-transparent opacity-80" />
    </div>
  );
}

/**
 * DashboardAnnouncementModal:
 * Fetches active announcements on dashboard mount and displays them every time
 * the dashboard page is loaded or refreshed.
 */
export const DashboardAnnouncementModal: React.FC<{ audience?: string }> = ({
  audience = "RETAILER",
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  const dismissCurrent = useCallback(() => {
    if (current + 1 < announcements.length) {
      setCurrent((c) => c + 1);
    } else {
      setVisible(false);
    }
  }, [announcements, current]);

  const goToPrev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const goToNext = () => {
    if (current + 1 < announcements.length) setCurrent((c) => c + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        let items: any[] = [];

        // 1. Try active announcements endpoint
        try {
          const res1 = await fetch(`/api/v1/announcements/active?audience=${audience}`);
          if (res1.ok) {
            const json1 = await res1.json();
            items = json1.data || (Array.isArray(json1) ? json1 : []);
          }
        } catch {}

        // 2. Fallback to notifications/announcements
        if (items.length === 0) {
          try {
            const res2 = await fetch(
              `/api/v1/notifications/announcements?audience=${audience}&active=true&limit=5`
            );
            if (res2.ok) {
              const json2 = await res2.json();
              items = json2.data || (Array.isArray(json2) ? json2 : []);
            }
          } catch {}
        }

        if (!Array.isArray(items) || items.length === 0) return;

        // Map items to normalized schema
        const normalized: Announcement[] = items.map((raw: any) => {
          const allImgs: string[] = [];
          if (raw.image_url) allImgs.push(raw.image_url);
          if (Array.isArray(raw.images)) {
            raw.images.forEach((imgObj: any) => {
              const u = typeof imgObj === "string" ? imgObj : imgObj?.image_url;
              if (u && !allImgs.includes(u)) allImgs.push(u);
            });
          }

          const topImg = allImgs.length > 0 ? allImgs[0] : null;

          return {
            id: String(raw.id || raw.public_id || raw.announcement_code || Math.random()),
            header: raw.header || raw.title || "Important Update",
            body: raw.body || raw.message || raw.content || "",
            image_url: topImg,
            images: allImgs,
            links: Array.isArray(raw.links) ? raw.links : [],
            audience: raw.audience || audience,
            priority:
              typeof raw.priority === "number"
                ? raw.priority >= 20
                  ? "CRITICAL"
                  : raw.priority >= 10
                  ? "HIGH"
                  : "NORMAL"
                : raw.priority || "NORMAL",
            created_at: raw.created_at || raw.created_date || new Date().toISOString(),
          };
        });

        if (cancelled || normalized.length === 0) return;

        setAnnouncements(normalized);
        setCurrent(0);
        setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 500);
      } catch {
        // Non-critical UI
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [audience]);

  if (!visible || announcements.length === 0) return null;
  const item = announcements[current];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{
        backgroundColor: "rgba(2, 6, 17, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[92vh] flex flex-col rounded-[26px] sm:rounded-[30px] overflow-hidden border border-amber-500/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.12)] animate-in fade-in zoom-in-95 duration-250"
        style={{
          background: "linear-gradient(150deg, #070b14 0%, #0b1122 55%, #101833 100%)",
        }}
      >
        {/* Subtle Top Gold Hairline Glow */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent z-40" />

        {/* Ambient Top Glow Reflex */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[140px] bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl opacity-60 z-10" />

        {/* Top Dismiss Button (X) */}
        <button
          onClick={dismissCurrent}
          className="absolute top-3.5 right-3.5 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-[#070b14]/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/15 hover:border-amber-400/50 transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md active:scale-95 group"
          aria-label="Dismiss Announcement"
        >
          <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90 text-slate-300 group-hover:text-amber-300" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto max-h-[92vh] flex flex-col relative z-20">
          {/* Full Banner / Flyer Image */}
          <AnnouncementBannerImage imageUrl={item.image_url} title={item.header} />

          {/* Modal Content Area */}
          <div className="p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5 flex-1">
            {/* Header Row: Priority Badge & Pagination */}
            <div className="flex items-center justify-between gap-3">
              <div>
                {item.priority === "CRITICAL" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-black bg-rose-950/70 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                    <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span className="tracking-wide">CRITICAL ALERT</span>
                  </span>
                ) : item.priority === "HIGH" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-black bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="tracking-wide">IMPORTANT NOTICE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-500/10 text-amber-200/90 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.08)]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="tracking-wide">ANNOUNCEMENT</span>
                  </span>
                )}
              </div>

              {announcements.length > 1 && (
                <span className="text-[11px] sm:text-xs font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-3 py-0.5 rounded-full shadow-sm">
                  {current + 1} of {announcements.length}
                </span>
              )}
            </div>

            {/* Title & Body with clear hierarchy and gold/yellow gradient typography */}
            {(item.header !== "Announcement" || item.body) && (
              <div className="space-y-2">
                {item.header && (
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]">
                    {item.header}
                  </h2>
                )}
                {item.body && (
                  <p className="text-sm sm:text-[14.5px] text-slate-300/90 leading-relaxed font-normal whitespace-pre-line">
                    {item.body}
                  </p>
                )}
              </div>
            )}

            {/* Action Links (e.g. WhatsApp channel, Play Store, etc.) */}
            {item.links && item.links.length > 0 && (
              <div className="pt-1 space-y-2">
                {item.links.map((link, lIdx) => (
                  <a
                    key={lIdx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/20 hover:border-amber-400/50 shadow-sm transition-all text-xs sm:text-sm font-semibold text-slate-100 group"
                  >
                    <div className="flex items-center gap-2.5">
                      {link.icon === "whatsapp" || link.url.includes("whatsapp") ? (
                        <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="group-hover:text-amber-200 transition-colors">
                        {link.label || link.url}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-transform group-hover:translate-x-1" />
                  </a>
                ))}
              </div>
            )}

            {/* Pagination Indicators & Main Action Button */}
            <div className="pt-2 sm:pt-3 space-y-3">
              {announcements.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 py-1">
                  {announcements.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                      style={{
                        background:
                          i === current
                            ? "linear-gradient(90deg, #f59e0b, #fcd34d)"
                            : "rgba(255,255,255,0.2)",
                        width: i === current ? 26 : 7,
                        boxShadow:
                          i === current ? "0 0 10px rgba(245, 158, 11, 0.5)" : "none",
                      }}
                      aria-label={`Go to announcement ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                {announcements.length > 1 && current > 0 && (
                  <button
                    onClick={goToPrev}
                    className="px-4 py-3 sm:py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-white/10 hover:border-amber-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={dismissCurrent}
                  className="flex-1 py-3 sm:py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:via-yellow-200 hover:to-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)] border border-amber-200/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] tracking-wide"
                >
                  <span>
                    {current + 1 < announcements.length ? "Next Announcement →" : "Got it, Thanks!"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
