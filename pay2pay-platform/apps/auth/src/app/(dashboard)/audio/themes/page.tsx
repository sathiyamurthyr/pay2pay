"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Music, CheckCircle2, Play, Volume2, Plus, X } from "lucide-react";
import apiClient from "@/lib/api";
import { EnterpriseAudioEngine } from "@/lib/audio-engine";

interface Theme {
  public_id: string;
  theme_code: string;
  theme_name: string;
  description: string | null;
  is_default: boolean;
}

const DEFAULT_THEMES: Theme[] = [
  {
    public_id: "th-01",
    theme_code: "BANKING_DEFAULT",
    theme_name: "Admin Settlement Console Chime",
    description: "Harmonic dual-tone chime for Admin operations & financial settlement dashboards.",
    is_default: true
  },
  {
    public_id: "th-02",
    theme_code: "RETAILER_PAYMENT_ALERT",
    theme_name: "Retailer App Sound Box (Loud)",
    description: "High-amplitude payment announcement chime for Retailer Mobile App & Web Counter Consoles.",
    is_default: false
  },
  {
    public_id: "th-03",
    theme_code: "MINIMAL",
    theme_name: "Minimal Subtle Click",
    description: "Ultra-quiet soft tick for quiet Admin office environments & executive treasury consoles.",
    is_default: false
  },
  {
    public_id: "th-04",
    theme_code: "ACCESSIBILITY_HIGH_PITCH",
    theme_name: "High-Contrast Accessibility",
    description: "Distinct high-pitch sequence for visually impaired Retailer & Admin application users.",
    is_default: false
  }
];

export default function AudioThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/audio/themes");
      const items = res.data.data || [];
      if (items.length > 0) {
        setThemes(items);
      } else {
        setThemes(DEFAULT_THEMES);
      }
    } catch (err) {
      console.error("Failed to fetch themes, loading fallback sound themes", err);
      setThemes(DEFAULT_THEMES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleTestChime = (themeCode: string) => {
    if (themeCode === "RETAILER_PAYMENT_ALERT") {
      EnterpriseAudioEngine.playSynthSound(1200, 300, "SUCCESS_FANFARE", 100);
    } else if (themeCode === "MINIMAL") {
      EnterpriseAudioEngine.playSynthSound(600, 100, "SINGLE_BEEP", 50);
    } else if (themeCode === "ACCESSIBILITY_HIGH_PITCH") {
      EnterpriseAudioEngine.playSynthSound(1500, 350, "SUCCESS_FANFARE", 100);
    } else {
      EnterpriseAudioEngine.playSynthSound(880, 250, "SUCCESS_FANFARE", 80);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D9E2EC] dark:border-[#2A3B5C]">
        <div>
          <h1 className="ent-page-title flex items-center gap-2">
            <Music className="w-6 h-6 text-[#123B73] dark:text-[#60A5FA]" /> Sound Theme Manager
          </h1>
          <p className="ent-caption mt-0.5">
            Configure Sound Profiles for Retailer App &amp; Admin Dashboard Consoles (Excludes hardware swipe machines)
          </p>
        </div>
      </div>

      {/* Grid of Sound Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 py-8 text-center text-[#6B7280]">Loading sound themes...</div>
        ) : (
          themes.map((t) => (
            <div key={t.theme_code} className="ent-card p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <span className="ent-badge ent-badge-info font-mono">
                    {t.theme_code}
                  </span>
                  {t.is_default && (
                    <span className="ent-badge ent-badge-success">DEFAULT</span>
                  )}
                </div>
                <h3 className="ent-card-title text-base mt-2">{t.theme_name}</h3>
                <p className="ent-caption mt-1">{t.description}</p>
              </div>

              <button
                onClick={() => handleTestChime(t.theme_code)}
                className="ent-btn ent-btn-secondary w-full justify-center"
              >
                <Play className="w-3.5 h-3.5" /> Test Sound Chime
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
