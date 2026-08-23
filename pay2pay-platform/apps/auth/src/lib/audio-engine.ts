/**
 * Enterprise Web Audio API & SpeechSynthesis Engine for Retailer Payment Platform
 * Zero external audio files required. Synthesizes tones on-the-fly.
 * 100% reliable across all modern browsers with auto-unlock on user gesture.
 */

export type SoundType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "SUCCESS"
  | "ERROR"
  | "WARNING"
  | "NOTIFICATION"
  | "PAYMENT_SUCCESS"
  | "LOCK"
  | "UNLOCK";

export class EnterpriseAudioEngine {
  private static audioCtx: AudioContext | null = null;
  private static isMuted: boolean = false;

  public static getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public static initAndResumeContext() {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  public static setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public static getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Universal sound player for system events
   */
  public static play(soundType: SoundType, options?: { volume?: number; voiceText?: string; langCode?: string }) {
    if (this.isMuted) return;
    const vol = options?.volume ?? 85;

    switch (soundType) {
      case "LOGIN_SUCCESS":
        this.playLoginSuccess(vol);
        break;
      case "LOGIN_FAILURE":
        this.playLoginFailure(vol);
        break;
      case "SUCCESS":
      case "PAYMENT_SUCCESS":
        this.playSuccessSound(vol);
        break;
      case "ERROR":
        this.playErrorSound(vol);
        break;
      case "WARNING":
        this.playWarningSound(vol);
        break;
      case "NOTIFICATION":
        this.playNotificationSound(vol);
        break;
      case "LOCK":
        this.playLockChime(vol);
        break;
      case "UNLOCK":
        this.playUnlockChime(vol);
        break;
      default:
        this.playSuccessSound(vol);
    }

    if (options?.voiceText) {
      this.speakVoice(options.voiceText, options.langCode || "en");
    }
  }

  /**
   * 1. LOGIN SUCCESS — Triumphant Ascending 4-Tone Arpeggio (C5 -> E5 -> G5 -> C6)
   */
  public static playLoginSuccess(volumePct: number = 85) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      const baseVol = (volumePct / 100) * 0.18;
      gainNode.gain.setValueAtTime(baseVol, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      gainNode.connect(ctx.destination);

      // Ascending C Major Arpeggio
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.14 }, // C5
        { freq: 659.25, time: 0.10, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.20, dur: 0.16 }, // G5
        { freq: 1046.50, time: 0.32, dur: 0.28 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);
        osc.connect(gainNode);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {}
  }

  /**
   * 2. LOGIN FAILURE / AUTH ERROR — Low Dual Descending Tone Alert
   */
  public static playLoginFailure(volumePct: number = 85) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      const baseVol = (volumePct / 100) * 0.22;
      gainNode.gain.setValueAtTime(baseVol, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      // Gentle lowpass filter to prevent harsh click
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);

      gainNode.connect(filter);
      filter.connect(ctx.destination);

      // Low double buzz
      const pulses = [
        { startFreq: 293.66, endFreq: 220.00, time: 0.00, dur: 0.16 },
        { startFreq: 220.00, endFreq: 164.81, time: 0.18, dur: 0.22 },
      ];

      pulses.forEach(({ startFreq, endFreq, time, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(startFreq, now + time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + time + dur);
        osc.connect(gainNode);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {}
  }

  /**
   * 3. GENERAL SUCCESS — Crisp Bell Chime (A5 -> E6)
   */
  public static playSuccessSound(volumePct: number = 80) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volumePct / 100) * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * 4. GENERAL ERROR — Soft Low Tone
   */
  public static playErrorSound(volumePct: number = 85) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volumePct / 100) * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  /**
   * 5. WARNING — Dual Amber Alert Tones (D5 - D5)
   */
  public static playWarningSound(volumePct: number = 80) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volumePct / 100) * 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      gain.connect(ctx.destination);

      [0.0, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now + offset);
        osc.connect(gain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } catch {}
  }

  /**
   * 6. NOTIFICATION / POP — Soft Bubble Chime (E5 -> B5)
   */
  public static playNotificationSound(volumePct: number = 75) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volumePct / 100) * 0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  /**
   * 7. LOCK SCREEN CHIME — Smooth Descending Tone (880Hz -> 440Hz)
   */
  public static playLockChime(volumePct: number = 80) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volumePct / 100) * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  /**
   * 8. UNLOCK SCREEN CHIME — Ascending 3-Note Chime
   */
  public static playUnlockChime(volumePct: number = 80) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volumePct / 100) * 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      gain.connect(ctx.destination);

      const notes = [659.25, 880.00, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc.connect(gain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.12);
      });
    } catch {}
  }

  /**
   * SpeechSynthesis voice announcer
   */
  public static speakVoice(text: string, langCode: string = "en", speechRate: number = 1.0) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;

      const langMap: Record<string, string> = {
        en: "en-IN",
        ta: "ta-IN",
        hi: "hi-IN",
        te: "te-IN",
        kn: "kn-IN",
        ml: "ml-IN",
      };
      utterance.lang = langMap[langCode] || "en-IN";

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis error", err);
    }
  }

  // Backward-compatible aliases for legacy callers
  public static playSuccess(amount: number = 0, langCode: string = "en") {
    this.playSuccessSound(90);
    if (amount > 0) {
      this.speakVoice(`Transaction of Rupees ${amount} Successful`, langCode);
    } else {
      this.speakVoice("Transaction Completed Successfully", langCode);
    }
  }

  public static playFailure(reason: string = "Declined by issuing bank", langCode: string = "en") {
    this.playErrorSound(95);
    if (reason) {
      this.speakVoice(`Transaction Failed. ${reason}`, langCode);
    }
  }

  public static playWarning(warningMsg: string = "Risk threshold limit warning", langCode: string = "en") {
    this.playWarningSound(85);
    if (warningMsg) {
      this.speakVoice(`Attention Warning. ${warningMsg}`, langCode);
    }
  }
}

// Global user gesture audio unlock listener
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      EnterpriseAudioEngine.initAndResumeContext();
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    } catch {}
  };
  window.addEventListener("click", unlockAudio, { passive: true, once: true });
  window.addEventListener("keydown", unlockAudio, { passive: true, once: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true, once: true });
}

export const soundSystem = EnterpriseAudioEngine;
