import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { getApiBaseUrl } from "./api-config";

const PROTOCOL_VERSION = "1.0";
const DEFAULT_APP_ID = "PAY2PAY";
const REQUEST_INFO = new TextEncoder().encode("sathus:crypto:request:v1");
const RESPONSE_INFO = new TextEncoder().encode("sathus:crypto:response:v1");

export function getDomainAppId(): string {
  if (typeof window === "undefined") return "PAY2PAY";
  const host = window.location.hostname.toLowerCase();
  if (host.includes("near4you")) return "NEAR4YOU";
  if (host.includes("smspay")) return "SMSPAY";
  return "PAY2PAY";
}

export interface CachedServerPublicKey {
  app_id: string;
  key_id: string;
  version: string;
  public_key_pem: string;
}

export interface ActiveCryptoSession {
  masterKey: Uint8Array;
  requestKey: CryptoKey;
  responseKey: CryptoKey;
  encryptedKeyB64: string;
  timestamp: number;
  nonce: string;
}

export interface EncryptedResponseEnvelope {
  version: string;
  app_id: string;
  iv: string;
  ciphertext: string;
  tag?: string;
  timestamp: number;
  nonce: string;
}

// ── UTILITY HELPERS ─────────────────────────────────────────────────────────

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── SERVER PUBLIC KEY CACHING ───────────────────────────────────────────────

let memoryCachedPublicKey: CachedServerPublicKey | null = null;
let keyFetchPromise: Promise<CachedServerPublicKey | null> | null = null;

export async function fetchServerPublicKey(): Promise<CachedServerPublicKey | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  const domainAppId = getDomainAppId();
  if (memoryCachedPublicKey && memoryCachedPublicKey.app_id === domainAppId) {
    return memoryCachedPublicKey;
  }

  const cacheKey = `p2p_api_sec_pub_key_${domainAppId}`;
  try {
    const saved = sessionStorage.getItem(cacheKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.public_key_pem) {
        memoryCachedPublicKey = parsed;
        return memoryCachedPublicKey;
      }
    }
  } catch {}

  if (keyFetchPromise) {
    return keyFetchPromise;
  }

  keyFetchPromise = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/security/public-key`, {
        method: "GET",
        headers: { Accept: "application/json", "x-sathus-app-id": domainAppId },
      });
      if (!res.ok) {
        return null;
      }
      const data: CachedServerPublicKey = await res.json();
      if (data && data.public_key_pem) {
        if (!data.app_id) {
          data.app_id = domainAppId;
        }
        memoryCachedPublicKey = data;
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        return data;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      keyFetchPromise = null;
    }
  })();

  return keyFetchPromise;
}

// ── CRYPTOGRAPHIC OPERATIONS ───────────────────────────────────────────────

let cachedRsaCryptoKey: CryptoKey | null = null;
let cachedRsaPem: string | null = null;

export async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  if (cachedRsaCryptoKey && cachedRsaPem === pem) {
    return cachedRsaCryptoKey;
  }

  const cleanPem = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/[\r\n\s]/g, "");

  const binaryDer = base64ToBytes(cleanPem);

  const key = await window.crypto.subtle.importKey(
    "spki",
    binaryDer as any,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  cachedRsaCryptoKey = key;
  cachedRsaPem = pem;
  return key;
}

export async function createEphemeralSession(
  serverKeyInfo: CachedServerPublicKey
): Promise<ActiveCryptoSession> {
  const cryptoObj = window.crypto;
  const masterKey = cryptoObj.getRandomValues(new Uint8Array(32));

  // 1. RSA-OAEP wrap the master session key
  const rsaKey = await importRsaPublicKey(serverKeyInfo.public_key_pem);
  const encryptedBuf = await cryptoObj.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaKey,
    masterKey as any
  );
  const encryptedKeyB64 = bytesToBase64(new Uint8Array(encryptedBuf));

  // 2. HKDF derive separate request and response AES-GCM keys
  const targetAppId = (serverKeyInfo.app_id || getDomainAppId()).toUpperCase();
  const salt = new TextEncoder().encode(targetAppId);
  const baseKey = await cryptoObj.subtle.importKey(
    "raw",
    masterKey as any,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const reqBits = await cryptoObj.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt as any,
      info: REQUEST_INFO as any,
    },
    baseKey,
    256
  );

  const resBits = await cryptoObj.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt as any,
      info: RESPONSE_INFO as any,
    },
    baseKey,
    256
  );

  const requestKey = await cryptoObj.subtle.importKey(
    "raw",
    reqBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const responseKey = await cryptoObj.subtle.importKey(
    "raw",
    resBits,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = cryptoObj.randomUUID
    ? cryptoObj.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

  return {
    masterKey,
    requestKey,
    responseKey,
    encryptedKeyB64,
    timestamp,
    nonce,
  };
}

export async function encryptBodyWithSession(
  session: ActiveCryptoSession,
  appId: string,
  data: any
): Promise<{ iv: string; ciphertext: string; tag?: string }> {
  const cryptoObj = window.crypto;
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));

  const jsonString = typeof data === "string" ? data : JSON.stringify(data);
  const plaintextBytes = new TextEncoder().encode(jsonString);

  const aadStr = `${appId}:${PROTOCOL_VERSION}:${session.timestamp}:${session.nonce}`;
  const aadBytes = new TextEncoder().encode(aadStr);

  const encryptedBuf = await cryptoObj.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
      additionalData: aadBytes as any,
      tagLength: 128,
    },
    session.requestKey,
    plaintextBytes as any
  );

  const combinedBytes = new Uint8Array(encryptedBuf);
  // In WebCrypto AES-GCM, the last 16 bytes is the authentication tag
  const tagBytes = combinedBytes.slice(-16);

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(combinedBytes),
    tag: bytesToBase64(tagBytes),
  };
}

export async function decryptResponseWithSession(
  session: ActiveCryptoSession,
  envelope: EncryptedResponseEnvelope
): Promise<any> {
  const cryptoObj = window.crypto;
  const iv = base64ToBytes(envelope.iv);
  const ciphertextBytes = base64ToBytes(envelope.ciphertext);

  const targetAppId = (envelope.app_id || getDomainAppId()).toUpperCase();
  const aadStr = `${targetAppId}:${envelope.version || PROTOCOL_VERSION}:${envelope.timestamp}:${envelope.nonce}`;
  const aadBytes = new TextEncoder().encode(aadStr);

  const decryptedBuf = await cryptoObj.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
      additionalData: aadBytes as any,
      tagLength: 128,
    },
    session.responseKey,
    ciphertextBytes as any
  );

  const decryptedString = new TextDecoder().decode(decryptedBuf);
  try {
    return JSON.parse(decryptedString);
  } catch {
    return decryptedString;
  }
}

// ── AXIOS INTERCEPTOR ATTACHMENT ────────────────────────────────────────────

const EXEMPT_URL_SUBSTRINGS = [
  "/security/public-key",
  "/public-key",
  "/health",
  "/uploads",
  "/static",
  "/branding",
  "/favicon.ico",
];

export function attachApiPayloadSecurity(axiosInstance: AxiosInstance): AxiosInstance {
  // 1. Request Interceptor: Attach encryption headers & encrypt request payload
  axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig & { _sathusSession?: ActiveCryptoSession }) => {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      return config;
    }

    const url = config.url || "";
    const isExempt = EXEMPT_URL_SUBSTRINGS.some((sub) => url.includes(sub));
    if (isExempt) {
      return config;
    }

    try {
      const serverKeyInfo = await fetchServerPublicKey();
      if (!serverKeyInfo) {
        // Fallback gracefully if server public key cannot be reached
        return config;
      }

      const session = await createEphemeralSession(serverKeyInfo);
      config._sathusSession = session;

      const domainAppId = getDomainAppId();
      const activeAppId = (serverKeyInfo.app_id || domainAppId).toUpperCase();

      // Always inject standard encryption negotiation headers
      config.headers = config.headers || {};
      config.headers["x-sathus-encrypted-key"] = session.encryptedKeyB64;
      config.headers["x-sathus-nonce"] = session.nonce;
      config.headers["x-sathus-timestamp"] = String(session.timestamp);
      config.headers["x-sathus-app-id"] = activeAppId;
      config.headers["x-sathus-version"] = PROTOCOL_VERSION;
      config.headers["x-sathus-encrypt-response"] = "1";

      const method = (config.method || "get").toUpperCase();
      const hasBody = ["POST", "PUT", "PATCH"].includes(method) && config.data;

      // If sending a FormData or Blob/File, don't encrypt body
      const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
      const isBlob = typeof Blob !== "undefined" && config.data instanceof Blob;

      if (hasBody && !isFormData && !isBlob) {
        const { iv, ciphertext, tag } = await encryptBodyWithSession(
          session,
          activeAppId,
          config.data
        );

        config.data = {
          version: PROTOCOL_VERSION,
          app_id: activeAppId,
          key_id: serverKeyInfo.key_id || `${activeAppId.toLowerCase()}-v1-prod`,
          encrypted_key: session.encryptedKeyB64,
          iv,
          ciphertext,
          tag,
          timestamp: session.timestamp,
          nonce: session.nonce,
        };
        config.headers["Content-Type"] = "application/json";
      }
    } catch (err) {
      console.warn("[ApiPayloadSecurity] Could not encrypt outgoing request:", err);
    }

    return config;
  });

  // 2. Response Interceptor: Decrypt response body
  axiosInstance.interceptors.response.use(
    async (response: AxiosResponse) => {
      const session: ActiveCryptoSession | undefined = (response.config as any)?._sathusSession;
      if (!session || !response.data) {
        return response;
      }

      const data = response.data;
      if (typeof data === "object" && data.ciphertext && data.iv) {
        try {
          const decrypted = await decryptResponseWithSession(session, data as EncryptedResponseEnvelope);
          response.data = decrypted;
        } catch (decryptErr) {
          console.error("[ApiPayloadSecurity] Response decryption failed:", decryptErr);
        }
      }

      return response;
    },
    async (error: any) => {
      const session: ActiveCryptoSession | undefined = error.config?._sathusSession;
      const data = error.response?.data;
      if (session && data && typeof data === "object" && data.ciphertext && data.iv) {
        try {
          const decrypted = await decryptResponseWithSession(session, data as EncryptedResponseEnvelope);
          error.response.data = decrypted;
        } catch (decryptErr) {
          console.error("[ApiPayloadSecurity] Error response decryption failed:", decryptErr);
        }
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}
