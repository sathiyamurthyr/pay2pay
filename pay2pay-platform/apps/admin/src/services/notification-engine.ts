"use client";

import { apiClient } from "@/lib/api";

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
  | "FRAUD_RISK_ALERT"
  | "TOPUP_SUBMITTED"
  | "TOPUP_APPROVED"
  | "TOPUP_REJECTED"
  | "MDR_STATUS_CHANGED"
  | "RECHARGE_SUCCESS"
  | "RECHARGE_FAILED"
  | "ACCOUNT_ACTIVATED"
  | "WALLET_CREDITED"
  | "WALLET_DEBITED";

export interface NotificationSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  voiceEnabled: boolean;
  categories: Record<NotificationCategory, boolean>;
}

export interface ServerNotificationPreferences {
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  transactional_enabled: boolean;
  security_enabled: boolean;
  operational_enabled: boolean;
  do_not_disturb: boolean;
  dnd_start_time?: string | null;
  dnd_end_time?: string | null;
  language_preference?: string;
}

export interface LiveNotificationEvent {
  id: string;
  service_type: string;
  event_type: string;
  event_status: string;
  title: string;
  message: string;
  amount?: number | null;
  currency?: string;
  reference_number?: string | null;
  reference_ref_id?: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  voiceEnabled: false,
  categories: {
    SUCCESS: true,
    INFO: true,
    WARNING: true,
    ERROR: true,
    CRITICAL: true,
  },
};

type EventCallback = (event: LiveNotificationEvent) => void;

class NotificationEngine {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private audioCtx: AudioContext | null = null;
  private sseSource: EventSource | null = null;
  private sseListeners: Set<EventCallback> = new Set();
  private isConnectingSSE: boolean = false;
  private reconnectTimer: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch {}
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
  }

  // ─── SERVER-BACKED PREFERENCES (NO LOCALSTORAGE) ───────────────────────────

  public async fetchServerPreferences(): Promise<ServerNotificationPreferences | null> {
    try {
      const res = await apiClient.get<ServerNotificationPreferences>("/notifications/settings");
      if (res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn("[NotificationEngine] Failed to fetch server notification settings:", err);
    }
    return null;
  }

  public async saveServerPreferences(
    prefs: Partial<ServerNotificationPreferences>
  ): Promise<boolean> {
    try {
      const res = await apiClient.put("/notifications/settings", prefs);
      return res.status === 200;
    } catch (err) {
      console.error("[NotificationEngine] Failed to save server notification settings:", err);
      return false;
    }
  }

  // ─── WEB PUSH SUBSCRIPTION & SERVICE WORKER ────────────────────────────────

  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      return registration;
    } catch (error) {
      console.warn("[NotificationEngine] Service Worker registration failed:", error);
      return null;
    }
  }

  public async subscribeToPush(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return false;
      }

      const sw = await this.registerServiceWorker();
      if (!sw) return false;

      // Check existing subscription
      let sub = await sw.pushManager.getSubscription();
      if (!sub) {
        // VAPID public key placeholder or applicationServerKey
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const subOptions: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
          ...(vapidPublicKey ? { applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource } : {}),
        };
        sub = await sw.pushManager.subscribe(subOptions);
      }

      const rawJson = sub.toJSON();
      const payload = {
        endpoint: sub.endpoint,
        p256dh: rawJson.keys?.p256dh || "",
        auth_secret: rawJson.keys?.auth || "",
        device_label: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 100) : "Browser",
      };

      await apiClient.post("/notifications/push/subscribe", payload);
      return true;
    } catch (err) {
      console.warn("[NotificationEngine] Push subscription error:", err);
      return false;
    }
  }

  public async unsubscribeFromPush(): Promise<boolean> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.getSubscription();
      if (sub) {
        await apiClient.delete(`/notifications/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`);
        await sub.unsubscribe();
      }
      return true;
    } catch (err) {
      console.warn("[NotificationEngine] Unsubscribe push failed:", err);
      return false;
    }
  }

  // ─── SERVER-SENT EVENTS (SSE) REAL-TIME STREAM ─────────────────────────────

  public connectSSE(onEvent?: EventCallback): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }

    if (onEvent) {
      this.sseListeners.add(onEvent);
    }

    if (!this.sseSource && !this.isConnectingSSE) {
      this.initSSEConnection();
    }

    return () => {
      if (onEvent) {
        this.sseListeners.delete(onEvent);
      }
      if (this.sseListeners.size === 0 && this.sseSource) {
        this.sseSource.close();
        this.sseSource = null;
      }
    };
  }

  private initSSEConnection() {
    if (typeof window === "undefined") return;
    this.isConnectingSSE = true;

    try {
      // Connect to backend SSE endpoint
      const sseUrl = "/api/v1/notifications/stream";
      const source = new EventSource(sseUrl, { withCredentials: true });

      source.onopen = () => {
        this.isConnectingSSE = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      source.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === "") return;
          const data: LiveNotificationEvent = JSON.parse(event.data);
          this.handleIncomingNotification(data);
        } catch (e) {
          // Heartbeat or ping event
        }
      };

      source.onerror = () => {
        source.close();
        this.sseSource = null;
        this.isConnectingSSE = false;
        // Reconnect after 8 seconds
        if (!this.reconnectTimer && this.sseListeners.size > 0) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.initSSEConnection();
          }, 8000);
        }
      };

      this.sseSource = source;
    } catch (err) {
      this.isConnectingSSE = false;
    }
  }

  private handleIncomingNotification(event: LiveNotificationEvent) {
    // Notify all active in-app listeners
    this.sseListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn("[NotificationEngine] Listener error:", err);
      }
    });

    // Determine category and audio/haptic cue
    const statusUpper = (event.event_status || "").toUpperCase();
    let category: NotificationCategory = "INFO";
    if (statusUpper === "APPROVED" || statusUpper === "SUCCESS" || statusUpper === "VERIFIED" || statusUpper === "ACTIVE") {
      category = "SUCCESS";
    } else if (statusUpper === "REJECTED" || statusUpper === "FAILED") {
      category = "ERROR";
    } else if (statusUpper === "ON_HOLD" || statusUpper === "WARNING") {
      category = "WARNING";
    }

    this.playSound(category);
    this.triggerVibration(category);
  }

  // ─── AUDIO SYNTHESIS & HAPTICS (ZERO ASSET DEPENDENCY) ──────────────────────

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
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (category === "INFO") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (category === "WARNING") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(349, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (category === "ERROR") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(164, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (category === "CRITICAL") {
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

  private triggerVibration(category: NotificationCategory) {
    if (!this.settings.vibrationEnabled || !this.settings.categories[category]) return;
    if (typeof window === "undefined" || !("vibrate" in navigator)) return;

    try {
      if (category === "SUCCESS") {
        navigator.vibrate([40, 60, 80]);
      } else if (category === "INFO") {
        navigator.vibrate([30]);
      } else if (category === "WARNING") {
        navigator.vibrate([100, 50, 100]);
      } else if (category === "ERROR") {
        navigator.vibrate([200, 100, 200]);
      } else if (category === "CRITICAL") {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }
    } catch (e) {
      console.warn("Vibration failed:", e);
    }
  }

  private speakVoice(text: string, category: NotificationCategory) {
    if (!this.settings.voiceEnabled || !this.settings.categories[category]) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = category === "SUCCESS" ? 1.1 : category === "CRITICAL" ? 0.9 : 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis failed:", e);
    }
  }

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
      case "TOPUP_SUBMITTED":
        category = "INFO";
        voiceText = "Top-Up Request Submitted";
        break;
      case "TOPUP_APPROVED":
        category = "SUCCESS";
        voiceText = "Top-Up Approved and Wallet Credited";
        break;
      case "TOPUP_REJECTED":
        category = "ERROR";
        voiceText = "Top-Up Request Rejected";
        break;
      case "WALLET_CREDITED":
        category = "SUCCESS";
        voiceText = "Wallet Credited";
        break;
      case "WALLET_DEBITED":
        category = "INFO";
        voiceText = "Wallet Debited";
        break;
      case "ACCOUNT_ACTIVATED":
        category = "SUCCESS";
        voiceText = "Account Approved and Activated";
        break;
      default:
        category = "INFO";
        voiceText = customMessage || "Notification received";
    }

    const finalMsg = customMessage || voiceText;

    this.playSound(category);
    this.triggerVibration(category);
    this.speakVoice(finalMsg, category);

    return { category, message: finalMsg };
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationEngine = new NotificationEngine();
