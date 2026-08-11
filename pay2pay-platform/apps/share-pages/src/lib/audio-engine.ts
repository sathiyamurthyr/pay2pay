/**
 * Enterprise Web Audio API & SpeechSynthesis Engine for Retailer Payment Platform
 * Zero external audio files required. Synthesizes tones on-the-fly.
 */

export class EnterpriseAudioEngine {
  private static audioCtx: AudioContext | null = null;

  private static getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes Web Audio API tones based on frequency, pattern, and duration (<100ms playback)
   */
  public static playSynthSound(freq: number, durationMs: number, pattern: string, volumePct: number = 80) {
    if (volumePct <= 0) return;
    try {
      const ctx = this.getContext();
      const gainNode = ctx.createGain();
      gainNode.gain.value = (volumePct / 100) * 0.15;
      gainNode.connect(ctx.destination);

      if (pattern === "SUCCESS_FANFARE") {
        // Play 3-tone arpeggio (C5 - E5 - G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.08);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.15);
        });
      } else if (pattern === "ERROR_ALERT") {
        // Low double buzz (220Hz - 180Hz)
        [220, 180].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.15);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + idx * 0.15);
          osc.stop(ctx.currentTime + idx * 0.15 + 0.12);
        });
      } else if (pattern === "WARNING_ALERT" || pattern === "CRITICAL_ALARM") {
        // High pulse siren / attention warning
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.25);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Standard Single Beep / Chime
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationMs / 1000);
      }
    } catch (err) {
      console.warn("Web Audio API not supported or blocked", err);
    }
  }

  /**
   * Speaks voice announcement using SpeechSynthesis API (<500ms playback)
   */
  public static speakVoice(text: string, langCode: string = "en", speechRate: number = 1.0) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel(); // Stop ongoing speech
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

  /**
   * Triggers Transaction SUCCESS Audio Chime & Voice Announcement (Retailer/Admin App)
   */
  public static playSuccess(amount: number = 0, langCode: string = "en") {
    this.playSynthSound(880, 250, "SUCCESS_FANFARE", 90);
    const msg = amount > 0 
      ? `Transaction of Rupees ${amount} Successful` 
      : "Transaction Completed Successfully";
    this.speakVoice(msg, langCode);
  }

  /**
   * Triggers Transaction FAILURE Audio Chime & Voice Announcement (Retailer/Admin App)
   */
  public static playFailure(reason: string = "Declined by issuing bank", langCode: string = "en") {
    this.playSynthSound(220, 300, "ERROR_ALERT", 95);
    this.speakVoice(`Transaction Failed. ${reason}`, langCode);
  }

  /**
   * Triggers Transaction WARNING Audio Chime & Voice Announcement (Retailer/Admin App)
   */
  public static playWarning(warningMsg: string = "Risk threshold limit warning", langCode: string = "en") {
    this.playSynthSound(900, 250, "WARNING_ALERT", 85);
    this.speakVoice(`Attention Warning. ${warningMsg}`, langCode);
  }
}
