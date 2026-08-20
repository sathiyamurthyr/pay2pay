"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Announcement {
  id: string;
  header: string;
  body: string;
  image_url?: string | null;
  audience: string;
  priority: string;
  created_at: string;
}

/**
 * DashboardAnnouncementModal:
 * Fetches active announcements on dashboard mount and shows them
 * as a dismissable overlay modal. Dismissed IDs are stored in
 * localStorage so the same announcement is never shown twice.
 */
export const DashboardAnnouncementModal: React.FC<{ audience?: string }> = ({
  audience = "RETAILER",
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  const getDismissedIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem("p2p_dismissed_announcements") || "[]");
    } catch {
      return [];
    }
  };

  const dismissCurrent = useCallback(() => {
    const item = announcements[current];
    if (!item) return;
    try {
      const dismissed = getDismissedIds();
      if (!dismissed.includes(item.id)) {
        localStorage.setItem(
          "p2p_dismissed_announcements",
          JSON.stringify([...dismissed, item.id])
        );
      }
    } catch {}

    if (current + 1 < announcements.length) {
      setCurrent((c) => c + 1);
    } else {
      setVisible(false);
    }
  }, [announcements, current]);

  useEffect(() => {
    let cancelled = false;
    const fetch_data = async () => {
      try {
        // Try active announcements endpoint first, fallback to notifications/announcements
        let items: any[] = [];
        try {
          const res1 = await fetch(
            `/api/v1/announcements/active?audience=${audience}`
          );
          if (res1.ok) {
            const json1 = await res1.json();
            items = json1.data || (Array.isArray(json1) ? json1 : []);
          }
        } catch {}

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
          const img =
            raw.image_url ||
            (raw.images && raw.images.length > 0 ? raw.images[0].image_url : null);
          return {
            id: String(raw.id || raw.public_id || raw.announcement_code || Math.random()),
            header: raw.header || raw.title || "Important Update",
            body: raw.body || raw.message || raw.content || "",
            image_url: img || null,
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

        // Filter out already-dismissed ones
        const dismissed = getDismissedIds();
        const pending = normalized.filter((a) => !dismissed.includes(a.id));
        if (cancelled || pending.length === 0) return;

        setAnnouncements(pending);
        setCurrent(0);
        // Small delay so dashboard fully renders before modal pops
        setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 800);
      } catch {
        // Silently ignore — non-critical UI
      }
    };
    fetch_data();
    return () => { cancelled = true; };
  }, [audience]);

  if (!visible || announcements.length === 0) return null;
  const item = announcements[current];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          animation: "fadeSlideUp 0.3s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={dismissCurrent}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Dismiss"
        >
          ✕
        </button>

        {/* Image */}
        {item.image_url && (
          <div className="relative w-full" style={{ height: 200 }}>
            <Image
              src={item.image_url.startsWith("/uploads/") ? item.image_url : item.image_url}
              alt={item.header}
              fill
              style={{ objectFit: "cover" }}
              unoptimized
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 40%, rgba(15,23,42,0.95) 100%)",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Priority badge */}
          {item.priority === "CRITICAL" && (
            <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              🚨 Critical Alert
            </span>
          )}
          {item.priority === "HIGH" && (
            <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ⚠ Important
            </span>
          )}

          <h2 className="text-lg font-extrabold text-white leading-tight mb-2">
            {item.header}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {item.body}
          </p>

          {/* Pagination dots */}
          {announcements.length > 1 && (
            <div className="flex justify-center gap-1.5 mb-4">
              {announcements.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    background: i === current ? "#60a5fa" : "rgba(255,255,255,0.2)",
                    width: i === current ? 16 : 6,
                  }}
                />
              ))}
            </div>
          )}

          <button
            onClick={dismissCurrent}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: "linear-gradient(90deg, #2563eb, #4f46e5)",
            }}
          >
            {current + 1 < announcements.length ? "Next →" : "Got it"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
