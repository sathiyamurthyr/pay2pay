import { generateDeviceFingerprint } from "./fingerprint";

export interface TelemetryData {
  fingerprint: {
    hash: string;
    canvas: string;
    webgl: string;
    audio: string;
    fonts: string;
  };
  network: {
    publicIp: string;
    connectionType: string;
    isVpn: boolean;
    isProxy: boolean;
    isTor: boolean;
  };
  location: {
    country: string;
    state: string;
    city: string;
    latitude?: number;
    longitude?: number;
    timezone: string;
  };
  browser: {
    name: string;
    version: string;
    userAgent: string;
    platform: string;
    language: string;
    cookiesEnabled: boolean;
    jsEnabled: boolean;
  };
  device: {
    id: string;
    type: "DESKTOP" | "LAPTOP" | "TABLET" | "MOBILE";
    cpu_cores: number;
    ram_gb: number;
    touch_support: boolean;
    webauthn_support: boolean;
  };
  display: {
    geometry: string;
    colorDepth: number;
    pixelRatio: number;
  };
}

export async function collectSilentTelemetry(): Promise<TelemetryData> {
  if (typeof window === "undefined") {
    return {
      fingerprint: { hash: "FP-SSR", canvas: "", webgl: "", audio: "", fonts: "" },
      network: { publicIp: "127.0.0.1", connectionType: "Ethernet", isVpn: false, isProxy: false, isTor: false },
      location: { country: "India", state: "Tamil Nadu", city: "Chennai", timezone: "Asia/Kolkata" },
      browser: { name: "Chrome", version: "120.0", userAgent: "", platform: "Win32", language: "en-US", cookiesEnabled: true, jsEnabled: true },
      device: { id: "DEV-SSR", type: "DESKTOP", cpu_cores: 8, ram_gb: 16, touch_support: false, webauthn_support: true },
      display: { geometry: "1920x1080", colorDepth: 24, pixelRatio: 1 }
    };
  }

  const fingerprint = await generateDeviceFingerprint();

  // Detect Device Type
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android/i.test(ua) && window.innerWidth >= 600 && window.innerWidth <= 1024;
  const deviceType = isTablet ? "TABLET" : isMobile ? "MOBILE" : window.innerWidth <= 1440 ? "LAPTOP" : "DESKTOP";

  // Browser Detection
  let browserName = "Chrome";
  if (ua.includes("Firefox")) browserName = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browserName = "Safari";
  else if (ua.includes("Edg")) browserName = "Edge";

  return {
    fingerprint,
    network: {
      publicIp: "127.0.0.1",
      connectionType: (navigator as any).connection?.effectiveType || "WiFi / High-Speed Broadband",
      isVpn: false,
      isProxy: false,
      isTor: false
    },
    location: {
      country: "India",
      state: "Tamil Nadu",
      city: "Chennai",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
    },
    browser: {
      name: browserName,
      version: navigator.appVersion.slice(0, 20),
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      jsEnabled: true
    },
    device: {
      id: `DEV-${fingerprint.hash.slice(3, 15)}`,
      type: deviceType,
      cpu_cores: navigator.hardwareConcurrency || 8,
      ram_gb: (navigator as any).deviceMemory || 8,
      touch_support: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      webauthn_support: Boolean(window.PublicKeyCredential)
    },
    display: {
      geometry: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1
    }
  };
}
