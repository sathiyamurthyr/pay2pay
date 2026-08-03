"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Volume2, Play, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api";
import { EnterpriseAudioEngine } from "@/lib/audio-engine";

interface Lang {
  public_id: string;
  language_code: string;
  language_name: string;
  native_name: string;
  is_supported: bool;
}

export default function AudioLanguagesPage() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/audio/languages");
      setLanguages(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch languages", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const handleTestVoice = (code: string) => {
    const sampleTexts: Record<string, string> = {
      en: "Transaction of rupees 1,000 was successful.",
      ta: "ரூபாய் 1,000 பரிவர்த்தனை வெற்றிகரமாக முடிந்தது.",
      hi: "रुपये 1,000 का भुगतान सफल रहा।",
      te: "రూపాయల 1,000 లావాదేవీ విజయవంతమైంది.",
      kn: "ರೂಪಾಯಿ 1,000 વ્યવಹಾರ ಯಶಸ್ವಿಯಾಗಿದೆ.",
      ml: "രൂപ 1,000 ഇടപാട് വിജയകരമായിരുന്നു.",
    };
    const text = sampleTexts[code] || sampleTexts["en"];
    EnterpriseAudioEngine.speakVoice(text, code);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-7 h-7 text-cyan-400" /> Multi-Lingual Voice Engine
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Native SpeechSynthesis & TTS Voice Announcement Packs
          </p>
        </div>
      </div>

      {/* Languages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-8 text-center text-slate-500">Loading language packs...</div>
        ) : (
          languages.map((l) => (
            <div key={l.language_code} className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {l.language_code.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> READY
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-2">{l.native_name}</h3>
                <p className="text-xs text-slate-400">{l.language_name} Pack</p>
              </div>

              <button
                onClick={() => handleTestVoice(l.language_code)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all"
              >
                <Play className="w-3.5 h-3.5" /> Test Native Voice Announcement
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
