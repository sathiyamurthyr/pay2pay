"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getApiBaseUrl } from "@/lib/api-config";

interface AnnouncementImage {
  id: string;
  image_url: string;
  original_filename: string;
  display_order: number;
}

interface AnnouncementLink {
  label: string;
  url: string;
  icon?: string;
}

interface AnnouncementItem {
  id: string;
  announcement_code: string;
  title: string;
  message: string;
  links: AnnouncementLink[];
  display_type: string;
  priority: number;
  audience: string;
  status: string;
  is_active: boolean;
  images: AnnouncementImage[];
}

interface Props {
  audience?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eager fetch — starts the moment this module is imported (before React mounts)
// so the modal appears with zero perceptible delay.
// ─────────────────────────────────────────────────────────────────────────────
let _eagerPromise: Promise<AnnouncementItem[]> | null = null;

function startEagerFetch(audience: string): Promise<AnnouncementItem[]> {
  if (_eagerPromise) return _eagerPromise;
  _eagerPromise = (async () => {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(
        base + "/announcements/active?audience=" + audience,
        { cache: "no-store" }
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data as AnnouncementItem[]) || [];
    } catch {
      return [];
    }
  })();
  return _eagerPromise;
}

// Kick off immediately at import time
if (typeof window !== "undefined") {
  startEagerFetch("RETAILER");
}

/**
 * DashboardAnnouncementModal
 *
 * Network request starts at module import time (before React renders) so the
 * modal appears immediately — no useEffect delay. Shows on every dashboard visit.
 */
export const DashboardAnnouncementModal: React.FC<Props> = ({
  audience = "RETAILER",
}) => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgIndex, setImgIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    // Reset the eager promise so next page visit re-fetches fresh data
    const promise = _eagerPromise ?? startEagerFetch(audience);
    _eagerPromise = null; // reset for next mount

    promise.then((all) => {
      if (all.length > 0) {
        setAnnouncements(all);
        setCurrentIndex(0);
        setImgIndex(0);
        setOpen(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = announcements[currentIndex] ?? null;

  const handleClose = useCallback(() => {
    if (!current) return;
    setClosing(true);
    setTimeout(() => {
      const next = currentIndex + 1;
      if (next < announcements.length) {
        setCurrentIndex(next);
        setImgIndex(0);
        setClosing(false);
      } else {
        setOpen(false);
        setClosing(false);
      }
    }, 260);
  }, [current, currentIndex, announcements]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  if (!open || !current) return null;

  const images = current.images ?? [];
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;
  const hasLinks = (current.links ?? []).length > 0;
  const hasMore = currentIndex + 1 < announcements.length;

  const prevImg = () =>
    setImgIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const nextImg = () =>
    setImgIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: closing
            ? "p2p-fadeOut 0.26s ease forwards"
            : "p2p-fadeIn 0.28s ease",
        }}
      />

      {/* ── Modal wrapper ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 520,
            borderRadius: 20,
            overflow: "hidden",
            background:
              "linear-gradient(145deg,#0f172a 0%,#1e293b 60%,#0f1f3d 100%)",
            border: "1px solid rgba(99,179,237,0.18)",
            boxShadow: [
              "0 32px 80px rgba(0,0,0,0.7)",
              "0 0 0 1px rgba(99,179,237,0.08)",
              "inset 0 1px 0 rgba(255,255,255,0.06)",
            ].join(","),
            animation: closing
              ? "p2p-slideDown 0.26s cubic-bezier(0.4,0,1,1) forwards"
              : "p2p-slideUp 0.34s cubic-bezier(0.22,1,0.36,1)",
            position: "relative",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: 3,
              background:
                "linear-gradient(90deg,#3b82f6 0%,#60a5fa 40%,#a78bfa 100%)",
            }}
          />

          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Close announcement"
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(15,23,42,0.8)",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget;
              b.style.background = "rgba(239,68,68,0.2)";
              b.style.borderColor = "rgba(239,68,68,0.5)";
              b.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget;
              b.style.background = "rgba(15,23,42,0.8)";
              b.style.borderColor = "rgba(148,163,184,0.25)";
              b.style.color = "#94a3b8";
            }}
          >
            &times;
          </button>

          {/* Image area */}
          {hasImages && (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 240,
                overflow: "hidden",
                background: "#0a1628",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={images[imgIndex]?.id}
                src={images[imgIndex]?.image_url}
                alt={
                  images[imgIndex]?.original_filename || "Announcement image"
                }
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  animation: "p2p-imgFade 0.3s ease",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Bottom gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 72,
                  background:
                    "linear-gradient(to top,rgba(15,23,42,1) 0%,transparent 100%)",
                  pointerEvents: "none",
                }}
              />

              {/* Carousel controls */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={prevImg}
                    aria-label="Previous image"
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    &lsaquo;
                  </button>
                  <button
                    onClick={nextImg}
                    aria-label="Next image"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    &rsaquo;
                  </button>
                  {/* Dot indicators */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      gap: 5,
                    }}
                  >
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        aria-label={"Image " + (i + 1)}
                        style={{
                          width: i === imgIndex ? 18 : 7,
                          height: 7,
                          borderRadius: 4,
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          background:
                            i === imgIndex
                              ? "#60a5fa"
                              : "rgba(255,255,255,0.3)",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Content body */}
          <div style={{ padding: "20px 24px 24px" }}>
            {/* Badge row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#60a5fa",
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 4,
                  padding: "3px 8px",
                  textTransform: "uppercase" as const,
                }}
              >
                Announcement
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#475569",
                  fontFamily: "monospace",
                }}
              >
                {current.announcement_code}
              </span>
              {announcements.length > 1 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: "#475569",
                  }}
                >
                  {currentIndex + 1} / {announcements.length}
                </span>
              )}
            </div>

            {/* Title */}
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: 18,
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.35,
              }}
            >
              {current.title}
            </h2>

            {/* Message */}
            <p
              style={{
                margin: "0 0 18px",
                fontSize: 14,
                color: "#94a3b8",
                lineHeight: 1.65,
              }}
            >
              {current.message}
            </p>

            {/* Links */}
            {hasLinks && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {current.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(59,130,246,0.07)",
                      border: "1px solid rgba(59,130,246,0.15)",
                      color: "#60a5fa",
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(59,130,246,0.15)";
                      e.currentTarget.style.borderColor =
                        "rgba(59,130,246,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(59,130,246,0.07)";
                      e.currentTarget.style.borderColor =
                        "rgba(59,130,246,0.15)";
                    }}
                  >
                    <span style={{ fontSize: 15 }}>
                      {link.icon === "whatsapp" ? "💬" : "🔗"}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {link.label}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>&#8599;</span>
                  </a>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              {hasMore ? (
                <>
                  <button
                    onClick={handleClose}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.2)",
                      background: "transparent",
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(148,163,184,0.4)";
                      e.currentTarget.style.color = "#94a3b8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(148,163,184,0.2)";
                      e.currentTarget.style.color = "#64748b";
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleClose}
                    style={{
                      flex: 2,
                      height: 40,
                      borderRadius: 10,
                      border: "none",
                      background:
                        "linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "opacity 0.18s ease",
                      boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.88";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Next ({currentIndex + 2}/{announcements.length}) &rarr;
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClose}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 10,
                    border: "none",
                    background:
                      "linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "opacity 0.18s ease",
                    boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.88";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Got it &mdash; Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe CSS */}
      <style>{`
        @keyframes p2p-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes p2p-fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes p2p-slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes p2p-slideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(16px) scale(0.97); }
        }
        @keyframes p2p-imgFade { from { opacity: 0.5; } to { opacity: 1; } }
      `}</style>
    </>
  );
};

export default DashboardAnnouncementModal;
