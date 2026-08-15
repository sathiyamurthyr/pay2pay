"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip
} from "@mui/material";
import {
  Close,
  ChevronLeft,
  ChevronRight,
  Campaign,
  OpenInNew
} from "@mui/icons-material";
import { getApiBaseUrl } from "@/lib/api-config";

interface AnnouncementLink {
  label: string;
  url: string;
  icon?: string;
}

interface AnnouncementImage {
  id: string;
  b2_object_key: string;
  image_url: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  display_order: number;
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
  start_at?: string;
  end_at?: string;
  images: AnnouncementImage[];
}

export const DashboardAnnouncementModal: React.FC<{ audience?: string }> = ({ audience = "RETAILER" }) => {
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchActiveAnnouncements = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/announcements/active?audience=${audience}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const activeItem: AnnouncementItem = data.data[0];
          
          // Check if previously dismissed for this announcement ID in this browser session
          const dismissedKey = `p2p_announcement_dismissed_${activeItem.id}`;
          const isDismissed = typeof window !== "undefined" ? sessionStorage.getItem(dismissedKey) : null;
          const isPermDismissed = typeof window !== "undefined" ? localStorage.getItem(dismissedKey) : null;

          if (!isDismissed && !isPermDismissed && isMounted) {
            setAnnouncement(activeItem);
            setCurrentImageIndex(0);
            setOpen(true);
          }
        }
      } catch (err) {
        // Silently fail without interrupting dashboard operation
        console.warn("[Announcement] Could not load active announcements:", err);
      }
    };

    fetchActiveAnnouncements();

    return () => {
      isMounted = false;
    };
  }, [audience]);

  const handleClose = () => {
    if (announcement && typeof window !== "undefined") {
      const dismissedKey = `p2p_announcement_dismissed_${announcement.id}`;
      if (dontShowAgain) {
        localStorage.setItem(dismissedKey, "true");
      } else {
        sessionStorage.setItem(dismissedKey, "true");
      }
    }
    setOpen(false);
  };

  const handlePrevImage = () => {
    if (!announcement || !announcement.images.length) return;
    setCurrentImageIndex((prev) => (prev === 0 ? announcement.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!announcement || !announcement.images.length) return;
    setCurrentImageIndex((prev) => (prev === announcement.images.length - 1 ? 0 : prev + 1));
  };

  if (!announcement || !open) return null;

  const images = announcement.images || [];
  const currentImage = images[currentImageIndex];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: "linear-gradient(180deg, #0F172A 0%, #020617 100%)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.15)",
          color: "#F8FAFC",
          overflow: "hidden"
        }
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "linear-gradient(90deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)"
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)"
            }}
          >
            <Campaign sx={{ fontSize: 20, color: "#FFF" }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px", color: "#FFF", lineHeight: 1.2 }}>
              {announcement.title || "Official Announcement"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>
              {announcement.announcement_code}
            </Typography>
          </Box>
        </Stack>

        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: "#94A3B8",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "&:hover": { color: "#FFF", bgcolor: "rgba(255, 255, 255, 0.1)" }
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Multi-Image Carousel / Gallery */}
        {images.length > 0 && (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              minHeight: 220,
              maxHeight: 340,
              borderRadius: "14px",
              overflow: "hidden",
              bgcolor: "#000",
              mb: 2.5,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {currentImage && (
              <Box
                component="img"
                src={currentImage.image_url}
                alt={currentImage.original_filename || "Announcement Banner"}
                sx={{
                  width: "100%",
                  height: "100%",
                  maxHeight: 340,
                  objectFit: "contain",
                  display: "block"
                }}
                onError={(e: any) => {
                  e.target.style.display = "none";
                }}
              />
            )}

            {/* Navigation Arrows for Multiple Images */}
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevImage}
                  size="small"
                  sx={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: "rgba(0, 0, 0, 0.6)",
                    color: "#FFF",
                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.85)" },
                    backdropFilter: "blur(4px)"
                  }}
                >
                  <ChevronLeft fontSize="small" />
                </IconButton>

                <IconButton
                  onClick={handleNextImage}
                  size="small"
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: "rgba(0, 0, 0, 0.6)",
                    color: "#FFF",
                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.85)" },
                    backdropFilter: "blur(4px)"
                  }}
                >
                  <ChevronRight fontSize="small" />
                </IconButton>

                {/* Counter & Indicator dots */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    bgcolor: "rgba(0, 0, 0, 0.7)",
                    px: 1.5,
                    py: 0.4,
                    borderRadius: "100px",
                    backdropFilter: "blur(4px)"
                  }}
                >
                  {images.map((_, idx) => (
                    <Box
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      sx={{
                        width: currentImageIndex === idx ? 16 : 6,
                        height: 6,
                        borderRadius: "3px",
                        bgcolor: currentImageIndex === idx ? "#3B82F6" : "rgba(255, 255, 255, 0.4)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    />
                  ))}
                  <Typography sx={{ fontSize: "10px", color: "#94A3B8", ml: 0.5, fontWeight: 700 }}>
                    {currentImageIndex + 1}/{images.length}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Message Content */}
        <Typography
          variant="body1"
          sx={{
            color: "#E2E8F0",
            fontSize: "14px",
            lineHeight: 1.6,
            fontWeight: 500,
            whiteSpace: "pre-line",
            mb: 3
          }}
        >
          {announcement.message}
        </Typography>

        {/* Dynamic Action Links */}
        {announcement.links && announcement.links.length > 0 && (
          <Stack spacing={1.5} sx={{ mb: 2.5 }}>
            {announcement.links.map((link, idx) => {
              const isWhatsApp = link.label.toLowerCase().includes("whatsapp") || link.url.toLowerCase().includes("whatsapp");
              const isPlayStore = link.label.toLowerCase().includes("play store") || link.label.toLowerCase().includes("mobile app");

              if (isWhatsApp) {
                return (
                  <Button
                    key={idx}
                    component="a"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    fullWidth
                    sx={{
                      background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                      color: "#FFF",
                      fontWeight: 800,
                      borderRadius: "12px",
                      py: 1.2,
                      textTransform: "none",
                      fontSize: "14px",
                      boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
                      "&:hover": { background: "linear-gradient(135deg, #20BD5A 0%, #0E7366 100%)" }
                    }}
                    endIcon={<OpenInNew fontSize="small" />}
                  >
                    {link.label || "Join WhatsApp Channel"}
                  </Button>
                );
              }

              if (isPlayStore) {
                return (
                  <Button
                    key={idx}
                    component="a"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    fullWidth
                    sx={{
                      background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      color: "#60A5FA",
                      fontWeight: 800,
                      borderRadius: "12px",
                      py: 1.2,
                      textTransform: "none",
                      fontSize: "14px",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
                      "&:hover": { background: "rgba(59, 130, 246, 0.15)", borderColor: "#3B82F6" }
                    }}
                    endIcon={<OpenInNew fontSize="small" />}
                  >
                    {link.label || "Download Mobile App"}
                  </Button>
                );
              }

              return (
                <Button
                  key={idx}
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  fullWidth
                  sx={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                    color: "#FFF",
                    fontWeight: 800,
                    borderRadius: "12px",
                    py: 1.2,
                    textTransform: "none",
                    fontSize: "14px",
                    "&:hover": { background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }
                  }}
                  endIcon={<OpenInNew fontSize="small" />}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>
        )}

        {/* Footer Dismiss / Close */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Box
            onClick={() => setDontShowAgain(!dontShowAgain)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              userSelect: "none"
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "4px",
                border: "1px solid #475569",
                bgcolor: dontShowAgain ? "#3B82F6" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease"
              }}
            >
              {dontShowAgain && (
                <Typography sx={{ fontSize: "10px", color: "#FFF", fontWeight: 900, lineHeight: 1 }}>
                  ✓
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600 }}>
              Don&apos;t show again on this device
            </Typography>
          </Box>

          <Button
            onClick={handleClose}
            variant="text"
            size="small"
            sx={{
              color: "#94A3B8",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "13px",
              "&:hover": { color: "#FFF" }
            }}
          >
            Close
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
