"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Flame,
  Info,
  MessageCircle,
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
    <div className="relative w-full bg-slate-950/70 flex items-center justify-center border-b border-white/10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedUrl}
        alt={title}
        className="w-full h-auto max-h-[55vh] object-contain block select-none"
        loading="eager"
        onError={() => setImgError(true)}
      />
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.78)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-white/15 animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: "linear-gradient(145deg, #0b1120 0%, #111827 50%, #1e1b4b 100%)",
        }}
      >
        {/* Top Dismiss Button */}
        <button
          onClick={dismissCurrent}
          className="absolute top-3.5 right-3.5 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white border border-white/20 transition-all cursor-pointer shadow-lg backdrop-blur-sm"
          aria-label="Dismiss Announcement"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto max-h-[92vh] flex flex-col">
          {/* Full Banner / Flyer Image */}
          <AnnouncementBannerImage imageUrl={item.image_url} title={item.header} />

          {/* Modal Content */}
          <div className="p-5 sm:p-6 space-y-4 flex-1">
            {/* Header Row: Priority Badge & Pagination */}
            <div className="flex items-center justify-between gap-2">
              <div>
                {item.priority === "CRITICAL" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/10">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>CRITICAL ALERT</span>
                  </span>
                ) : item.priority === "HIGH" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>IMPORTANT NOTICE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    <Info className="w-3.5 h-3.5 text-violet-400" />
                    <span>UPDATE NOTICE</span>
                  </span>
                )}
              </div>

              {announcements.length > 1 && (
                <span className="text-xs font-bold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg">
                  {current + 1} of {announcements.length}
                </span>
              )}
            </div>

            {/* Title & Body */}
            {(item.header !== "Announcement" || item.body) && (
              <div>
                {item.header && (
                  <h2 className="text-xl font-black text-white tracking-tight leading-snug">
                    {item.header}
                  </h2>
                )}
                {item.body && (
                  <p className="text-sm text-slate-300 leading-relaxed mt-1.5 font-normal whitespace-pre-line">
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/40 transition-all text-xs font-bold text-white group"
                  >
                    <div className="flex items-center gap-2.5">
                      {link.icon === "whatsapp" || link.url.includes("whatsapp") ? (
                        <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ExternalLink className="w-4 h-4 text-violet-400 shrink-0" />
                      )}
                      <span>{link.label || link.url}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </a>
                ))}
              </div>
            )}

            {/* Pagination Indicators & Main Action Button */}
            <div className="pt-2 space-y-3">
              {announcements.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 py-1">
                  {announcements.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className="h-1.5 rounded-full transition-all cursor-pointer"
                      style={{
                        background: i === current ? "#8b5cf6" : "rgba(255,255,255,0.2)",
                        width: i === current ? 24 : 6,
                      }}
                      aria-label={`Go to announcement ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {announcements.length > 1 && current > 0 && (
                  <button
                    onClick={goToPrev}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={dismissCurrent}
                  className="flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:via-indigo-700 hover:to-blue-700 shadow-lg shadow-violet-600/25 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{current + 1 < announcements.length ? "Next Announcement →" : "Got it, Thanks!"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
