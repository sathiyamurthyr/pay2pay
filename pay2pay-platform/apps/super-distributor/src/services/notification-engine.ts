"use client";

export type NotificationCategory = "SUCCESS" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type TransactionEvent =
  | "OTP_RECEIVED"
  | "CUSTOMER_VERIFIED"
  | "AADHAAR_EKYC_COMPLETED"
  | "BENEFICIARY_VERIFIED"
  | "WALLET_LOW"
  | "LIMIT_EXCEEDED"
  | "BANK_BUSY"
  | "TRANSACTION_PROCESSING"
  | "TRANSACTION_SUCCESS"
  | "TRANSACTION_FAILED"
  | "FRAUD_RISK_ALERT";

export interface NotificationSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  voiceEnabled: boolean;
  categories: Record<NotificationCategory, boolean>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  voiceEnabled: false, // Voice announcements disabled by default
  categories: {
    SUCCESS: true,
    INFO: true,
    WARNING: true,
    ERROR: true,
    CRITICAL: true,
  },
};

class NotificationEngine {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch {}
      const saved = localStorage.getItem("pay2pay_notification_settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.settings = { ...DEFAULT_SETTINGS, ...parsed, voiceEnabled: false };
        } catch {
          this.settings = DEFAULT_SETTINGS;
        }
      }
    }
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      categories: {
        ...this.settings.categories,
        ...(newSettings.categories || {}),
      },
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_notification_settings", JSON.stringify(this.settings));
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // 1. Web Audio API Synthesizer (No external mp3 assets required)
  private playSound(category: NotificationCategory) {
    if (!this.settings.soundEnabled || !this.settings.categories[category]) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (category === "SUCCESS") {
        // High pitched pleasant double chime (880Hz -> 1320Hz)
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (category === "INFO") {
        // Soft subtle tap (587.33Hz)
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (category === "WARNING") {
        // Warm dual-tone alert (440Hz -> 349Hz)
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(349, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (category === "ERROR") {
        // Low error buzz (220Hz -> 164Hz)
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(164, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (category === "CRITICAL") {
        // Loud urgent dual siren (600Hz / 900Hz alternating)
        osc.type = "square";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.15);
        osc.frequency.setValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn("Audio synthesis failed:", e);
    }
  }

  // 2. Mobile Haptic Vibration API (Android & iOS Web API)
  private triggerVibration(category: NotificationCategory) {
    if (!this.settings.vibrationEnabled || !this.settings.categories[category]) return;
    if (typeof window === "undefined" || !("vibrate" in navigator)) return;

    try {
      if (category === "SUCCESS") {
        navigator.vibrate([40, 60, 80]); // Light double tap
      } else if (category === "INFO") {
        navigator.vibrate([30]); // Subtle 30ms tap
      } else if (category === "WARNING") {
        navigator.vibrate([100, 50, 100]); // Medium double buzz
      } else if (category === "ERROR") {
        navigator.vibrate([200, 100, 200]); // Heavy double pulse
      } else if (category === "CRITICAL") {
        navigator.vibrate([300, 100, 300, 100, 500]); // Strong urgent pattern
      }
    } catch (e) {
      console.warn("Vibration failed:", e);
    }
  }

  // 3. Web SpeechSynthesis API (Voice Announcements)
  private speakVoice(text: string, category: NotificationCategory) {
    if (!this.settings.voiceEnabled || !this.settings.categories[category]) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel(); // Clear queued utterances
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = category === "SUCCESS" ? 1.1 : category === "CRITICAL" ? 0.9 : 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis failed:", e);
    }
  }

  // Public Method: Trigger Event Notification across Sound, Haptics & Voice
  public notify(event: TransactionEvent, customMessage?: string) {
    let category: NotificationCategory = "INFO";
    let voiceText = "";

    switch (event) {
      case "OTP_RECEIVED":
        category = "INFO";
        voiceText = "OTP Code Received";
        break;
      case "CUSTOMER_VERIFIED":
        category = "SUCCESS";
        voiceText = "Customer Verified Successfully";
        break;
      case "AADHAAR_EKYC_COMPLETED":
        category = "SUCCESS";
        voiceText = "Aadhaar eKYC Verification Completed";
        break;
      case "BENEFICIARY_VERIFIED":
        category = "SUCCESS";
        voiceText = "Beneficiary Penny Drop Verified";
        break;
      case "WALLET_LOW":
        category = "WARNING";
        voiceText = "Warning: Wallet Balance is Low";
        break;
      case "LIMIT_EXCEEDED":
        category = "ERROR";
        voiceText = "Transaction Exceeds Limit";
        break;
      case "BANK_BUSY":
        category = "WARNING";
        voiceText = "Destination Bank Server Busy";
        break;
      case "TRANSACTION_PROCESSING":
        category = "INFO";
        voiceText = "Payout Transaction Processing";
        break;
      case "TRANSACTION_SUCCESS":
        category = "SUCCESS";
        voiceText = "Payout Transaction Successful";
        break;
      case "TRANSACTION_FAILED":
        category = "ERROR";
        voiceText = "Payout Transaction Failed";
        break;
      case "FRAUD_RISK_ALERT":
        category = "CRITICAL";
        voiceText = "Critical Security Alert: Potential Risk Detected";
        break;
    }

    const finalMsg = customMessage || voiceText;

    // Execute 3 Channels
    this.playSound(category);
    this.triggerVibration(category);
    this.speakVoice(finalMsg, category);

    return { category, message: finalMsg };
  }
}

export const notificationEngine = new NotificationEngine();
