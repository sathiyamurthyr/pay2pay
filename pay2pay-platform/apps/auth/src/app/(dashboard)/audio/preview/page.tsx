"use client";

import React, { useState } from "react";
import { Play, Volume2, Mic, Sparkles, CheckCircle2, ShieldAlert, Globe } from "lucide-react";
import apiClient from "@/lib/api";
import { EnterpriseAudioEngine } from "@/lib/audio-engine";

export default function AudioPreviewPage() {
  const [eventCode, setEventCode] = useState("TRANSACTION_SUCCESS");
  const [amount, setAmount] = useState(2500);
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (eventCode === "TRANSACTION_FAILURE") {
        EnterpriseAudioEngine.playFailure("Insufficient Account Balance", language);
        setPayload({
          synth_pattern: "ERROR_ALERT",
          frequency_hz: 220,
          duration_ms: 300,
          volume_level_pct: 95,
          voice_enabled: true,
          voice_text_template: "Transaction Failed. Insufficient Account Balance"
        });
      } else if (eventCode === "TRANSACTION_WARNING") {
        EnterpriseAudioEngine.playWarning("High-value daily velocity limit threshold exceeded", language);
        setPayload({
          synth_pattern: "WARNING_ALERT",
          frequency_hz: 900,
          duration_ms: 250,
          volume_level_pct: 85,
          voice_enabled: true,
          voice_text_template: "Attention Warning. High-value daily velocity limit threshold exceeded"
        });
      } else {
        EnterpriseAudioEngine.playSuccess(amount, language);
        setPayload({
          synth_pattern: "SUCCESS_FANFARE",
          frequency_hz: 880,
          duration_ms: 250,
          volume_level_pct: 90,
          voice_enabled: true,
          voice_text_template: `Transaction of Rupees ${amount} Successful`
        });
      }
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#D9E2EC] dark:border-[#2A3B5C]">
        <h1 className="ent-page-title flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#123B73] dark:text-[#60A5FA]" /> Audio &amp; Voice Event Studio
        </h1>
        <p className="ent-caption mt-0.5">
          Simulate real-time Web Audio API sound chimes and multi-lingual voice feedback for Retailer &amp; Admin Apps
        </p>
      </div>

      {/* Quick Test Bar */}
      <div className="ent-card p-4 flex flex-wrap items-center justify-between gap-3 bg-[#FAFBFC] dark:bg-[#1A2642]">
        <span className="ent-card-title text-sm">Direct Audio Event Triggers:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => EnterpriseAudioEngine.playSuccess(amount, language)}
            className="ent-btn ent-btn-primary"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Test Success Chime
          </button>
          <button
            onClick={() => EnterpriseAudioEngine.playWarning("Velocity Limit Reached", language)}
            className="ent-btn ent-btn-secondary"
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Test Warning Chime
          </button>
          <button
            onClick={() => EnterpriseAudioEngine.playFailure("Issuer Timeout", language)}
            className="ent-btn ent-btn-danger"
          >
            <Volume2 className="w-4 h-4" /> Test Failure Chime
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulator Form */}
        <div className="ent-card p-5 space-y-4">
          <h2 className="ent-card-title text-base">Event Simulation Setup</h2>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="ent-caption block mb-1">Select Event Type</label>
              <select
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                className="ent-input"
              >
                <option value="TRANSACTION_SUCCESS">🟢 Transaction SUCCESS (Chime + Voice Amount)</option>
                <option value="TRANSACTION_FAILURE">🔴 Transaction FAILURE (Double Buzz + Voice Reason)</option>
                <option value="TRANSACTION_WARNING">🟠 Transaction WARNING (Pulse Siren + Risk Alert)</option>
                <option value="WALLET_CREDITED">🟢 Wallet Credited (Instant Chime)</option>
              </select>
            </div>

            <div>
              <label className="ent-caption block mb-1">Transaction Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="ent-input font-mono"
              />
            </div>

            <div>
              <label className="ent-caption block mb-1">Voice Announcement Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="ent-input"
              >
                <option value="en">English</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ent-btn ent-btn-primary w-full justify-center"
            >
              <Play className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Synthesizing Audio..." : "Simulate Sound & Voice Feedback"}
            </button>
          </form>
        </div>

        {/* Payload Output */}
        <div className="ent-card p-5 space-y-4">
          <h2 className="ent-card-title text-base">Synthesized Audio &amp; Voice Payload</h2>

          {!payload ? (
            <div className="py-8 text-center text-[#6B7280]">
              Click "Test Success Chime" or select an event to trigger audio synthesis and TTS announcements.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#FAFBFC] dark:bg-[#1A2642] border border-[#D9E2EC] dark:border-[#2A3B5C] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Synth Pattern:</span>
                  <strong className="font-mono text-[#123B73] dark:text-[#60A5FA]">{payload.synth_pattern}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Frequency / Duration:</span>
                  <strong className="font-mono text-[#1F2937] dark:text-white">{payload.frequency_hz} Hz ({payload.duration_ms} ms)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Playback Volume:</span>
                  <strong className="font-mono text-[#16A34A]">{payload.volume_level_pct}%</strong>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F0FDF4] dark:bg-[#142921] border border-[#BBF7D0] dark:border-[#1C4735] space-y-1">
                <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-1.5">
                  <Mic className="w-4 h-4" /> Native Voice Announcement Text:
                </span>
                <p className="text-sm font-semibold text-[#1F2937] dark:text-white pt-1">
                  "{payload.voice_text_template}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
