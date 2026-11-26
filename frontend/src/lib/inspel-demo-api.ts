import {
  ActiveCryptoSession,
  EncryptedResponseEnvelope,
  createEphemeralSession,
  decryptResponseWithSession,
  encryptBodyWithSession,
  fetchServerPublicKey,
  getDomainAppId,
} from "./api-payload-crypto";

export interface DemoProduct {
  product_id: string;
  code: string;
  name: string;
  description: string;
  details: string;
  icon: string;
  badge: string;
  hsn_sac: string;
  highlights: string[];
  currency: string;
  base_price: number;
  additional_charges: number;
  taxable_amount: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
}

export interface DemoVendor {
  vendor_ref_id: number;
  name: string;
  company_name: string;
  email: string;
  mobile: string;
  is_seeded_demo?: boolean;
  status: string;
  created_at?: string | null;
}

export interface DemoOrder {
  order_ref_id: number;
  order_code: string;
  vendor_ref_id: number;
  status: string;
  reference_id?: string | null;
  bankme_order_id?: string | null;
  product_id: string;
  product_code: string;
  product_name: string;
  product_description: string;
  product_icon: string;
  hsn_sac: string;
  currency: string;
  base_price: number;
  additional_charges: number;
  taxable_amount: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  confirmed_amount: boolean;
  vendor: Partial<DemoVendor>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DemoPayment {
  payment_ref_id: number;
  payment_code: string;
  order_ref_id: number;
  order_code: string;
  vendor_ref_id: number;
  reference_id: string;
  bankme_order_id?: string | null;
  status: string;
  amount: number;
  currency: string;
  product_id: string;
  product_name: string;
  base_price: number;
  gst_percent: number;
  gst_amount: number;
  payment_url?: string | null;
  qr_string?: string | null;
  qr_code_url?: string | null;
  utr?: string | null;
  payment_method?: string | null;
  settlement_status?: string | null;
  failure_reason?: string | null;
  receipt_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DemoContactInfo {
  company_name: string;
  legal_name: string;
  cin: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  portal_url: string;
  support_hours: string;
}

const TOKEN_KEY = "inspel_demo_token";
const VENDOR_KEY = "inspel_demo_vendor";

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/v1/demo";
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${envUrl.replace(/\/+$/, "")}/api/v1/demo`;
}

export function getDemoToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredVendor(): DemoVendor | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(VENDOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoVendor;
  } catch {
    return null;
  }
}

export function saveDemoSession(token: string, vendor: DemoVendor): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(VENDOR_KEY, JSON.stringify(vendor));
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(VENDOR_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function formatINR(amount: number | string | undefined | null): string {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
}

async function demoFetch<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getDemoToken();
    if (!token) {
      throw new Error("Please sign in with your vendor account to continue.");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  let session: ActiveCryptoSession | null = null;
  let finalBody = init.body;
  const method = (init.method || "GET").toUpperCase();

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const serverKeyInfo = await fetchServerPublicKey();
      if (serverKeyInfo) {
        session = await createEphemeralSession(serverKeyInfo);
        const domainAppId = getDomainAppId();
        const activeAppId =
          domainAppId !== "PLATFORM"
            ? domainAppId
            : (serverKeyInfo.app_id || domainAppId).toUpperCase();

        headers["x-sathus-encrypted-key"] = session.encryptedKeyB64;
        headers["x-sathus-nonce"] = session.nonce;
        headers["x-sathus-timestamp"] = String(session.timestamp);
        headers["x-sathus-app-id"] = activeAppId;
        headers["x-sathus-version"] = "1.0";
        headers["x-sathus-encrypt-response"] = "1";

        if (["POST", "PUT", "PATCH"].includes(method) && typeof init.body === "string" && init.body.length > 0) {
          let rawPayload: unknown = init.body;
          try {
            rawPayload = JSON.parse(init.body);
          } catch {
            rawPayload = init.body;
          }
          const { iv, ciphertext, tag } = await encryptBodyWithSession(session, activeAppId, rawPayload);
          finalBody = JSON.stringify({
            version: "1.0",
            app_id: activeAppId,
            key_id: serverKeyInfo.key_id || `${activeAppId.toLowerCase()}-v1-prod`,
            encrypted_key: session.encryptedKeyB64,
            iv,
            ciphertext,
            tag,
            timestamp: session.timestamp,
            nonce: session.nonce,
          });
        }
      }
    } catch (cryptoErr) {
      console.warn("[InspelDemoAPI] Payload encryption setup failed:", cryptoErr);
      session = null;
    }
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    body: finalBody,
    headers,
    cache: "no-store",
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = { detail: text || "Unexpected server response" };
  }

  if (
    session &&
    parsed &&
    typeof parsed === "object" &&
    typeof parsed.ciphertext === "string" &&
    typeof parsed.iv === "string"
  ) {
    try {
      const decrypted = await decryptResponseWithSession(
        session,
        parsed as unknown as EncryptedResponseEnvelope
      );
      parsed =
        typeof decrypted === "object" && decrypted !== null
          ? (decrypted as Record<string, unknown>)
          : { detail: String(decrypted) };
    } catch (decryptErr) {
      console.error("[InspelDemoAPI] Response decryption failed:", decryptErr);
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearDemoSession();
    }
    const detail = (parsed.detail as string) || (parsed.message as string) || `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return parsed as T;
}

export async function fetchProducts(): Promise<{
  company: string;
  currency: string;
  gst_percent: number;
  products: DemoProduct[];
}> {
  return demoFetch("/products");
}

export async function fetchProductById(productId: string): Promise<{ product: DemoProduct }> {
  return demoFetch(`/products/${encodeURIComponent(productId)}`);
}

export async function fetchContactInfo(): Promise<{ contact: DemoContactInfo }> {
  return demoFetch("/contact-info");
}

export async function submitContactEnquiry(payload: {
  name: string;
  company_name: string;
  email: string;
  mobile: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; enquiry_code: string; message: string }> {
  return demoFetch("/contact-enquiry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginVendor(payload: {
  user_id: string;
  password: string;
}): Promise<{ access_token: string; vendor: DemoVendor; redirect_to: string }> {
  return demoFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerVendor(payload: {
  name: string;
  company_name: string;
  email: string;
  mobile: string;
  password: string;
}): Promise<{ access_token: string; vendor: DemoVendor; redirect_to: string }> {
  return demoFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMe(): Promise<{ vendor: DemoVendor }> {
  return demoFetch("/auth/me", {}, true);
}

export async function initiatePayment(payload: {
  product_id: string;
  confirmed_amount: boolean;
  idempotency_key?: string;
}): Promise<{
  success: boolean;
  order: DemoOrder;
  payment: DemoPayment;
  payment_url: string;
  reference_id: string;
  bankme_order_id: string;
}> {
  return demoFetch(
    "/payments/initiate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function verifyPayment(referenceId: string): Promise<{
  order: DemoOrder;
  payment: DemoPayment;
  receipt: Record<string, unknown> | null;
}> {
  return demoFetch(`/payments/verify/${encodeURIComponent(referenceId)}`, {}, true);
}

export async function fetchDashboard(): Promise<{
  vendor: DemoVendor;
  summary: {
    total_orders: number;
    paid_orders: number;
    pending_orders: number;
    failed_orders: number;
    purchased_products_count: number;
    total_spent_inr: number;
    total_gst_paid_inr: number;
    receipts_count: number;
  };
  purchased_products: Array<Record<string, unknown>>;
  orders: DemoOrder[];
  payments: DemoPayment[];
  receipts: Array<Record<string, unknown>>;
  contact: DemoContactInfo;
}> {
  return demoFetch("/dashboard", {}, true);
}

export async function downloadReceiptFile(referenceId: string): Promise<void> {
  const token = getDemoToken();
  if (!token) {
    throw new Error("Please sign in to download this receipt.");
  }
  const res = await fetch(`${getApiBase()}/receipt/${encodeURIComponent(referenceId)}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Unable to download receipt.");
  }
  const htmlText = await res.text();
  const blob = new Blob([htmlText], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `INSPEL-Receipt-${referenceId}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function openPrintableReceipt(referenceId: string): Promise<void> {
  const token = getDemoToken();
  if (!token) {
    throw new Error("Please sign in to view receipt.");
  }
  const res = await fetch(`${getApiBase()}/receipt/${encodeURIComponent(referenceId)}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Unable to load receipt.");
  }
  const htmlText = await res.text();
  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(htmlText);
    win.document.close();
  }
}

export function resolveDemoPath(subPath: string): string {
  if (typeof window !== "undefined" && window.location.hostname.toLowerCase().startsWith("inspel.")) {
    return subPath;
  }
  return subPath === "/" ? "/demo" : `/demo${subPath}`;
}
