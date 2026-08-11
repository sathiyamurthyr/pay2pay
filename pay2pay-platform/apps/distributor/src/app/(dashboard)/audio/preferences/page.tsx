"use client";

import React, { useState } from "react";
import { Volume2, VolumeX, Moon, ShieldCheck, CheckCircle2, Save } from "lucide-react";
import apiClient from "@/lib/api";

export default function AudioPreferencesPage() {
  const [pref, setPref] = useState({
    user_id: "00000000-0000-0000-0000-000000000000",
    sound_enabled: true,
    voice_enabled: true,
    preferred_theme_code: "BANKING",
    preferred_language_code: "en",
    volume_level_pct: 80,
    mute_mode: false,
    night_mode: false,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      await apiClient.post("/audio/preferences", pref);
      setSuccessMsg("Audio preferences updated successfully!");
    } catch (err) {
      console.error("Failed to save audio preferences", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Volume2 className="w-7 h-7 text-indigo-400" /> Audio & Voice Feedback Preferences
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Customize volume levels, sound themes, language announcements, and night mode
        </p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/80 max-w-2xl space-y-6">
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Enable Sound Chimes</span>
              <span className="text-xs text-slate-400">Play Web Audio API synthesizer feedback for events</span>
            </div>
            <input
              type="checkbox"
              checked={pref.sound_enabled}
              onChange={(e) => setPref({ ...pref, sound_enabled: e.target.checked })}
              className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Enable Voice Announcements</span>
              <span className="text-xs text-slate-400">Speak transaction amounts and alerts via TTS</span>
            </div>
            <input
              type="checkbox"
              checked={pref.voice_enabled}
              onChange={(e) => setPref({ ...pref, voice_enabled: e.target.checked })}
              className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Preferred Sound Theme</label>
              <select
                value={pref.preferred_theme_code}
                onChange={(e) => setPref({ ...pref, preferred_theme_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="BANKING">Enterprise Banking</option>
                <option value="POS_SOUNDBOX">POS Soundbox</option>
                <option value="MINIMAL">Minimal</option>
                <option value="ACCESSIBILITY">Accessibility High-Contrast</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Voice Announcement Language</label>
              <select
                value={pref.preferred_language_code}
                onChange={(e) => setPref({ ...pref, preferred_language_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="en">English</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Volume Level</span>
              <span className="font-mono text-white">{pref.volume_level_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={pref.volume_level_pct}
              onChange={(e) => setPref({ ...pref, volume_level_pct: parseInt(e.target.value) || 0 })}
              className="w-full accent-indigo-500 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-300 flex items-center gap-1.5"><VolumeX className="w-4 h-4 text-amber-400" /> Mute Mode</span>
              <input
                type="checkbox"
                checked={pref.mute_mode}
                onChange={(e) => setPref({ ...pref, mute_mode: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-300 flex items-center gap-1.5"><Moon className="w-4 h-4 text-indigo-400" /> Night Mode (Subdued)</span>
              <input
                type="checkbox"
                checked={pref.night_mode}
                onChange={(e) => setPref({ ...pref, night_mode: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving Preferences..." : "Save Preferences"}
          </button>
        </form>
      </div>
    </div>
  );
}
