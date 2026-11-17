"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Key,
  Server,
  Smartphone,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Database,
  Users,
  RefreshCw,
  FileCode,
  ArrowRight,
  ShieldAlert,
  Globe,
  Building2,
  CheckCircle,
  HelpCircle,
  Code2,
  Clock,
  Zap,
  Terminal,
  ChevronRight,
  FileText
} from "lucide-react";

// ─── DOMAIN CONFIGURATIONS ───
interface DomainConfig {
  id: string;
  name: string;
  appId: string;
  domain: string;
  keyPairName: string;
  keyId: string;
  brandColor: string;
  gradient: string;
  description: string;
  status: "ACTIVE" | "PRODUCTION_READY";
}

const DOMAINS: DomainConfig[] = [
  {
    id: "smspay",
    name: "SMSPAY",
    appId: "SMSPAY",
    domain: "api.smspay.com",
    keyPairName: "key_smspay_rsa",
    keyId: "k-2026-smspay-v1",
    brandColor: "#059669",
    gradient: "linear-gradient(135deg, #102A43 0%, #1D4ED8 60%, #0D9488 100%)",
    description: "Retailer PayIn, DMT, AEPS, BBPS and UPI collection infrastructure.",
    status: "ACTIVE"
  },
  {
    id: "near4you",
    name: "Near4You",
    appId: "NEAR4YOU",
    domain: "api.near4you.com",
    keyPairName: "key_near4you_rsa",
    keyId: "k-2026-near4you-v1",
    brandColor: "#A20A3A",
    gradient: "linear-gradient(135deg, #6B0525 0%, #A20A3A 60%, #EDC11E 100%)",
    description: "Hyperlocal merchant payments, QR soundbox & assisted commerce network.",
    status: "ACTIVE"
  },
  {
    id: "pay2pay",
    name: "Pay2Pay",
    appId: "PAY2PAY",
    domain: "api.pay2pay.com",
    keyPairName: "key_pay2pay_rsa",
    keyId: "k-2026-pay2pay-v1",
    brandColor: "#2563EB",
    gradient: "linear-gradient(135deg, #0F172A 0%, #1E40AF 60%, #38BDF8 100%)",
    description: "Core banking switch, multi-tenant settlement & B2B liquidity routing.",
    status: "PRODUCTION_READY"
  }
];

// ─── ROLE HIERARCHY DEFINITIONS ───
interface RoleDefinition {
  level: number;
  roleCode: string;
  roleTitle: string;
  slug: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  scope: string;
  responsibilities: string[];
  keyStoredProcedure: string;
  sampleEndpoint: string;
}

const ROLE_HIERARCHY: RoleDefinition[] = [
  {
    level: 1,
    roleCode: "SUPER_ADMIN",
    roleTitle: "Super Admin",
    slug: "sadmin",
    color: "#6B21A8",
    badgeBg: "#FAF5FF",
    badgeBorder: "#E9D5FF",
    scope: "Platform-wide master control",
    responsibilities: [
      "Platform configuration & emergency kill-switches",
      "UPI vendor routing & gateway circuit breakers",
      "Global fee schedule, ledger auditing & key rotation"
    ],
    keyStoredProcedure: "sp_toggle_upi_vendor_status(vendor_id, status)",
    sampleEndpoint: "/api/v1/sadmin/toggle-vendor"
  },
  {
    level: 2,
    roleCode: "ADMIN",
    roleTitle: "Admin",
    slug: "admin",
    color: "#1E40AF",
    badgeBg: "#EFF6FF",
    badgeBorder: "#BFDBFE",
    scope: "Company & operational governance",
    responsibilities: [
      "Daily open-close statements & settlement batches",
      "Bank transaction reconciliation & chargebacks",
      "Company-level MDR configuration & vendor mapping"
    ],
    keyStoredProcedure: "sp_admin_daily_reconcile(company_id, batch_date)",
    sampleEndpoint: "/api/v1/admin/reconciliation/run"
  },
  {
    level: 3,
    roleCode: "SUPER_DISTRIBUTOR",
    roleTitle: "Super Distributor",
    slug: "sd",
    color: "#0F766E",
    badgeBg: "#F0FDFA",
    badgeBorder: "#99F6E4",
    scope: "Regional territory & distributor network",
    responsibilities: [
      "Onboards regional Distributors into network",
      "Bulk wallet liquidity distribution & credit limit setting",
      "Territory sales performance & commission tracking"
    ],
    keyStoredProcedure: "sp_sales_create_distributor(sd_id, dist_data)",
    sampleEndpoint: "/api/v1/sd/create-distributor"
  },
  {
    level: 4,
    roleCode: "DISTRIBUTOR",
    roleTitle: "Distributor",
    slug: "dist",
    color: "#059669",
    badgeBg: "#ECFDF5",
    badgeBorder: "#A7F3D0",
    scope: "Local retailer network manager",
    responsibilities: [
      "Manages retailer accounts & onboarding verifications",
      "Instant wallet balance transfer to agents",
      "Reviews network transaction volume & fraud flags"
    ],
    keyStoredProcedure: "sp_dist_transfer_balance(dist_id, ret_id, amount)",
    sampleEndpoint: "/api/v1/dist/transfer-balance"
  },
  {
    level: 5,
    roleCode: "RETAILER",
    roleTitle: "Retailer (Agent)",
    slug: "retailer",
    color: "#D97706",
    badgeBg: "#FFFBEB",
    badgeBorder: "#FDE68A",
    scope: "Frontline customer operations",
    responsibilities: [
      "Customer mobile recharges, utility bill payments (BBPS)",
      "Card-to-Cash, AEPS biometric withdrawals & DMT",
      "Customer PayIn top-ups & soundbox payment receipts"
    ],
    keyStoredProcedure: "sp_recharge_create_transaction(agent_id, payload)",
    sampleEndpoint: "/api/v1/retailer/recharge"
  }
];

export default function GlobalSecurityPage() {
  const [selectedDomain, setSelectedDomain] = useState<DomainConfig>(DOMAINS[0]);
  const [selectedRole, setSelectedRole] = useState<RoleDefinition>(ROLE_HIERARCHY[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground simulation state
  const [simAmount, setSimAmount] = useState<string>("5000");
  const [simRetailer, setSimRetailer] = useState<string>("RET_88291");
  const [simStep, setSimStep] = useState<"IDLE" | "ENCRYPTED" | "REPLAY_TEST">("IDLE");
  const [simLog, setSimLog] = useState<string[]>([]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const runEncryptionSimulation = () => {
    const timestamp = new Date().toISOString();
    const nonce = "550e8400-e29b-41d4-a716-" + Math.floor(10000000 + Math.random() * 90000000);
    const payload = JSON.stringify({
      retailer_id: simRetailer,
      amount: parseFloat(simAmount) || 0,
      timestamp
    });

    setSimStep("ENCRYPTED");
    setSimLog([
      `[CLIENT INIT] Selected domain: ${selectedDomain.appId} (${selectedDomain.domain})`,
      `[HKDF EXTRACT] Derived symmetric session key with salt: "${selectedDomain.appId}"`,
      `[AES-256-GCM] Encrypted payload: ${payload.length} bytes -> Ciphertext: 84 bytes`,
      `[SECURITY HEADERS] Attached x-sathus-nonce: "${nonce}"`,
      `[SECURITY HEADERS] Attached x-sathus-app-id: "${selectedDomain.appId}"`,
      `[SECURITY HEADERS] Attached x-sathus-key-id: "${selectedDomain.keyId}"`,
      `[SERVER RESPONSE] HTTP 200 OK - Nonce validated, replay cache saved (TTL: 60s).`
    ]);
  };

  const testReplayAttack = () => {
    setSimStep("REPLAY_TEST");
    setSimLog((prev) => [
      ...prev,
      `------------------------------------------------------------`,
      `[SIMULATED REPLAY ATTACK] Resending identical nonce & timestamp...`,
      `[SERVER VERIFY] Checking in-memory & Redis nonce cache for key: "nonce:..."`,
      `[REPLAY DETECTED] Duplicate nonce found within active 60-second window!`,
      `[SERVER RESPONSE] HTTP 409 Conflict: {"error": "SEC_REPLAY_DETECTED", "message": "Transaction replay blocked."}`
    ]);
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg-page,#F3F6FC)] text-[var(--color-primary-navy,#102A43)] font-sans antialiased pb-24">
      {/* ── TOP HERO HEADER ── */}
      <header className="w-full bg-[linear-gradient(110deg,#102A43_0%,#1D4ED8_65%,#0D9488_100%)] text-white px-4 sm:px-8 py-10 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/20 border border-white/30 backdrop-blur-md flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-300" />
                sathus-global-security
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                v2.4.0-ENTERPRISE
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
                AES-256-GCM + HKDF
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Sathus Global Security Architecture
            </h1>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl mt-1.5 font-medium">
              Enterprise cryptographic isolation across multi-domain fintech products and strict 5-tier role hierarchy authorization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/retailer/payin"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-[#102A43] hover:bg-white/90 transition-all shadow-md flex items-center gap-2"
            >
              <span>Retailer PayIn</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/15 text-white hover:bg-white/25 border border-white/25 transition-all flex items-center gap-2"
            >
              <span>Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 space-y-8">
        
        {/* ── 1. MULTI-DOMAIN ARCHITECTURE & CRYPTOGRAPHIC ISOLATION ── */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#102A43]">
                  1. Multi-Domain Architecture & Isolation
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Each product operates with its own unique <code className="text-blue-600 font-mono font-bold">app_id</code> and dedicated RSA cryptographic keypair.
                </p>
              </div>
            </div>

            {/* Anti-tamper banner */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Cross-Domain Decryption Impossible by HKDF Proof</span>
            </div>
          </div>

          {/* Architecture Visual Topology Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
            {DOMAINS.map((domain) => {
              const isSelected = selectedDomain.id === domain.id;
              return (
                <div
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-black text-[#102A43] flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: domain.brandColor }}
                        />
                        {domain.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                        {domain.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium mb-4">
                      {domain.description}
                    </p>

                    <div className="space-y-2 text-xs font-mono bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">app_id:</span>
                        <span className="font-bold text-blue-700">"{domain.appId}"</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">domain:</span>
                        <span className="text-slate-800 font-semibold">{domain.domain}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">keypair:</span>
                        <span className="text-emerald-700 font-bold">{domain.keyPairName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">key_id:</span>
                        <span className="text-slate-600">{domain.keyId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">HKDF Salt Token:</span>
                    <span className="text-blue-600 font-mono">{domain.appId}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cryptographic Proof Highlight */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 via-emerald-50/60 to-slate-50 border border-blue-100 text-xs sm:text-sm text-slate-700 leading-relaxed flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#102A43] font-bold block mb-1">
                Why Cross-Project Attacks Are Mathematically Prevented:
              </strong>
              Because <code className="font-mono font-bold text-blue-700">sathus-global-security</code> injects the <code className="font-mono font-bold text-blue-700">app_id</code> as the <strong>HKDF Salt</strong> during key derivation, an encrypted payload created for <strong>SMSPAY</strong> can <em>never</em> be decrypted or replayed against <strong>Near4You</strong> or <strong>Pay2Pay</strong>, even if the application servers share database clusters or network infrastructure.
            </div>
          </div>
        </section>

        {/* ── 2. ROLE HIERARCHY MATRIX ── */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#102A43]">
                  2. 5-Tier Role Hierarchy in Fintech Ecosystem
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Linear authority hierarchy: Super Admin → Admin → Super Distributor → Distributor → Retailer.
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Selected Level: <span className="text-[#102A43] font-black">{selectedRole.roleTitle} (Tier {selectedRole.level})</span>
            </div>
          </div>

          {/* Interactive Tier Stack */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-6">
            {ROLE_HIERARCHY.map((role) => {
              const isSelected = selectedRole.level === role.level;
              return (
                <div
                  key={role.level}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-purple-600/30 shadow-md border-purple-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  style={{
                    backgroundColor: isSelected ? role.badgeBg : "#FFFFFF"
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ backgroundColor: role.color }}
                      >
                        {role.level}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {role.slug}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-[#102A43] mb-1">
                      {role.roleTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                      {role.scope}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] font-mono font-bold text-slate-600 flex items-center justify-between">
                    <span>{role.roleCode}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Role Details Panel */}
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-lg text-xs font-extrabold text-white"
                  style={{ backgroundColor: selectedRole.color }}
                >
                  Tier {selectedRole.level}: {selectedRole.roleCode}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {selectedRole.scope}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                <span>Stored Procedure:</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-blue-700">
                  {selectedRole.keyStoredProcedure}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
                  Authority & Responsibilities
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                  {selectedRole.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
                  Sample Protected Endpoint
                </h4>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-emerald-700">POST {selectedRole.sampleEndpoint}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                    Encrypted Body
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. BACKEND PYTHON / FASTAPI INTEGRATION ── */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#102A43]">
                  3. Backend Implementation (FastAPI / Python)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Transparent decryption middleware + hierarchical role dependency guards.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
              Python 3.10+ / FastAPI
            </span>
          </div>

          {/* Step Tabs / Code Snippets */}
          <div className="space-y-6 mt-6">
            
            {/* Step A: Middleware Config */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span>app/main.py — Domain-Specific Middleware Configuration</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      `# app/main.py\nimport os\nfrom fastapi import FastAPI\nfrom sathus_security import SecurityConfig, SathusSecurityMiddleware\n\nAPP_DOMAIN = os.getenv("FINTECH_APP_ID", "${selectedDomain.appId}")\n\nsecurity_config = SecurityConfig(\n    app_id=APP_DOMAIN,\n    private_key_pem=os.environ["SERVER_RSA_PRIVATE_KEY"],\n    public_key_pem=os.environ["SERVER_RSA_PUBLIC_KEY"],\n    key_id=f"k-2026-{APP_DOMAIN.lower()}-v1",\n    exempt_paths=[\n        "/health",\n        "/docs",\n        "/api/v1/auth/public-key",\n        "/api/v1/webhook/payout"\n    ]\n)\n\napp = FastAPI(title=f"{APP_DOMAIN} Enterprise API")\napp.add_middleware(SathusSecurityMiddleware, config=security_config)`,
                      "backend_middleware"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  {copiedKey === "backend_middleware" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "backend_middleware" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-blue-200">
{`# 1. Initialize for the target domain (e.g. SMSPAY, NEAR4YOU, or PAY2PAY)
APP_DOMAIN = os.getenv("FINTECH_APP_ID", "${selectedDomain.appId}")

security_config = SecurityConfig(
    app_id=APP_DOMAIN,
    private_key_pem=os.environ["SERVER_RSA_PRIVATE_KEY"],
    public_key_pem=os.environ["SERVER_RSA_PUBLIC_KEY"],
    key_id=f"k-2026-{APP_DOMAIN.lower()}-v1",
    exempt_paths=[
        "/health",
        "/docs",
        "/api/v1/auth/public-key",
        "/api/v1/webhook/payout"  # External bank webhooks are exempt
    ]
)

app = FastAPI(title=f"{APP_DOMAIN} Enterprise API")
app.add_middleware(SathusSecurityMiddleware, config=security_config)`}
              </pre>
            </div>

            {/* Step B: Role Guard */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>app/auth/roles.py — Role-Based Authorization Guard</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      `# app/auth/roles.py\nfrom enum import Enum\nfrom fastapi import Depends, HTTPException, Header\nimport jwt, os\n\nclass UserRole(str, Enum):\n    SUPER_ADMIN = "SUPER_ADMIN"\n    ADMIN = "ADMIN"\n    SUPER_DISTRIBUTOR = "SUPER_DISTRIBUTOR"\n    DISTRIBUTOR = "DISTRIBUTOR"\n    RETAILER = "RETAILER"\n\ndef require_role(allowed_roles: list[UserRole]):\n    def role_checker(authorization: str = Header(...)):\n        token = authorization.replace("Bearer ", "")\n        try:\n            payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])\n            user_role = payload.get("role")\n            if user_role not in [r.value for r in allowed_roles]:\n                raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")\n            return payload\n        except Exception:\n            raise HTTPException(status_code=401, detail="Invalid token")\n    return role_checker`,
                      "backend_roles"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  {copiedKey === "backend_roles" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "backend_roles" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-purple-200">
{`from enum import Enum
from fastapi import Depends, HTTPException, Header
import jwt, os

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    SUPER_DISTRIBUTOR = "SUPER_DISTRIBUTOR"
    DISTRIBUTOR = "DISTRIBUTOR"
    RETAILER = "RETAILER"

def require_role(allowed_roles: list[UserRole]):
    def role_checker(authorization: str = Header(...)):
        token = authorization.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
            user_role = payload.get("role")
            if user_role not in [r.value for r in allowed_roles]:
                raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
            return payload
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
    return role_checker`}
              </pre>
            </div>

            {/* Step C: Secure Endpoints Matching Hierarchy */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>app/api/endpoints.py — Hierarchy Enforced Endpoints</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      `# 1. Super Admin: Vendor control\n@app.post("/api/v1/sadmin/toggle-vendor")\ndef toggle_vendor(data: dict, user = Depends(require_role([UserRole.SUPER_ADMIN]))):\n    return {"status": "SUCCESS", "message": f"Vendor {data['vendor_id']} updated"}\n\n# 2. Super Distributor: Onboard a Distributor\n@app.post("/api/v1/sd/create-distributor")\ndef create_distributor(data: dict, user = Depends(require_role([UserRole.SUPER_DISTRIBUTOR, UserRole.SUPER_ADMIN]))):\n    return {"status": "SUCCESS", "distributor_code": "DIST_88219"}\n\n# 3. Distributor: Transfer Balance\n@app.post("/api/v1/dist/transfer-balance")\ndef transfer_balance(data: dict, user = Depends(require_role([UserRole.DISTRIBUTOR]))):\n    return {"status": "SUCCESS", "new_balance": 45000}\n\n# 4. Retailer: Recharge / Payout\n@app.post("/api/v1/retailer/recharge")\ndef execute_recharge(data: dict, user = Depends(require_role([UserRole.RETAILER]))):\n    return {"status": "SUCCESS", "txn_id": "RC_991823"}`,
                      "backend_endpoints"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  {copiedKey === "backend_endpoints" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "backend_endpoints" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-emerald-200">
{`# 1. Super Admin Endpoint: Platform configuration & vendor control
@app.post("/api/v1/sadmin/toggle-vendor")
def toggle_vendor(data: dict, user = Depends(require_role([UserRole.SUPER_ADMIN]))):
    # Payload 'data' arrived fully encrypted and was safely decrypted
    vendor_id = data["vendor_id"]
    status = data["status"]
    # sp_toggle_upi_vendor_status(vendor_id, status)
    return {"status": "SUCCESS", "message": f"Vendor {vendor_id} updated"}

# 2. Super Distributor Endpoint: Onboard a Distributor
@app.post("/api/v1/sd/create-distributor")
def create_distributor(data: dict, user = Depends(require_role([UserRole.SUPER_DISTRIBUTOR, UserRole.SUPER_ADMIN]))):
    return {"status": "SUCCESS", "distributor_code": "DIST_88219"}

# 3. Distributor Endpoint: Transfer Wallet Balance to Retailer
@app.post("/api/v1/dist/transfer-balance")
def transfer_balance(data: dict, user = Depends(require_role([UserRole.DISTRIBUTOR]))):
    # Replay protection in Sathus Security prevents duplicate money transfers!
    return {"status": "SUCCESS", "new_balance": 45000}

# 4. Retailer Endpoint: Mobile Recharge or Payout
@app.post("/api/v1/retailer/recharge")
def execute_recharge(data: dict, user = Depends(require_role([UserRole.RETAILER]))):
    return {"status": "SUCCESS", "txn_id": "RC_991823"}`}
              </pre>
            </div>
          </div>
        </section>

        {/* ── 4. FRONTEND / MOBILE CLIENT INTEGRATION (TYPESCRIPT) ── */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#102A43]">
                  4. Frontend & Mobile Integration (TypeScript)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Transparent Axios interceptors encrypt outgoing requests and decrypt incoming responses.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              @sathus/security
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Client Setup Snippet */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">
                  src/services/apiClient.ts
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `import axios from 'axios';\nimport { attachSecurityInterceptors } from '@sathus/security';\n\nconst APP_NAME = process.env.NEXT_PUBLIC_FINTECH_APP || '${selectedDomain.appId}';\nconst API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://${selectedDomain.domain}';\nconst SERVER_PUBLIC_KEY = process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY!;\n\nexport const apiClient = axios.create({\n  baseURL: API_BASE_URL,\n});\n\n// Attach transparent encryption/decryption\nattachSecurityInterceptors(apiClient, {\n  appId: APP_NAME,\n  serverPublicKeyPem: SERVER_PUBLIC_KEY,\n  exemptPaths: ['/health', '/api/v1/auth/public-key']\n});`,
                      "frontend_client"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  {copiedKey === "frontend_client" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "frontend_client" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-blue-200">
{`import axios from 'axios';
import { attachSecurityInterceptors } from '@sathus/security';

// Target domain: '${selectedDomain.appId}'
const APP_NAME = process.env.NEXT_PUBLIC_FINTECH_APP || '${selectedDomain.appId}';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://${selectedDomain.domain}';
const SERVER_PUBLIC_KEY = process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY!;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach transparent encryption/decryption
attachSecurityInterceptors(apiClient, {
  appId: APP_NAME,
  serverPublicKeyPem: SERVER_PUBLIC_KEY,
  exemptPaths: ['/health', '/api/v1/auth/public-key']
});`}
              </pre>
            </div>

            {/* UI Usage Snippet */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">
                  src/pages/transfer.tsx
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `// Distributor Portal: Send money to retailer\nasync function handleSendBalance(retailerId: string, amount: number) {\n  // Outgoing JSON is encrypted with AES-256-GCM + unique nonce + timestamp\n  const response = await apiClient.post('/api/v1/dist/transfer-balance', {\n    retailer_id: retailerId,\n    amount: amount\n  });\n  \n  // Response is transparently decrypted\n  console.log('Balance updated:', response.data);\n}`,
                      "frontend_usage"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  {copiedKey === "frontend_usage" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "frontend_usage" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-amber-200">
{`// Distributor Portal: Send money to retailer
async function handleSendBalance(retailerId: string, amount: number) {
  // Outgoing JSON is encrypted with AES-256-GCM
  // sathus-global-security attaches unique nonce + timestamp
  const response = await apiClient.post('/api/v1/dist/transfer-balance', {
    retailer_id: retailerId,
    amount: amount
  });
  
  // Response is transparently decrypted
  console.log('Balance updated:', response.data);
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* ── 5. INTERACTIVE LIVE CRYPTOGRAPHIC SIMULATOR ── */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#102A43]">
                  5. Interactive Cryptographic & Anti-Replay Simulator
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Simulate AES-256-GCM payload encryption, HKDF salt isolation and duplicate transaction replay detection.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runEncryptionSimulation}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Simulate Encryption</span>
              </button>
              {simStep !== "IDLE" && (
                <button
                  onClick={testReplayAttack}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-2 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Test Replay Attack</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Input Controls */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                Simulated Financial Request
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Active Domain (HKDF Salt)
                </label>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs font-bold text-blue-700 flex items-center justify-between">
                  <span>{selectedDomain.appId}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{selectedDomain.domain}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Recipient Retailer ID
                </label>
                <input
                  type="text"
                  value={simRetailer}
                  onChange={(e) => setSimRetailer(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Transfer Amount (INR)
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-500">
                Click <strong>"Simulate Encryption"</strong> to view real-time wire framing, then click <strong>"Test Replay Attack"</strong> to verify server defense.
              </div>
            </div>

            {/* Live Terminal Output */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 min-h-[220px] flex flex-col justify-between overflow-x-auto shadow-inner">
              <div className="space-y-1.5">
                <div className="text-slate-500 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>SATHUS-SECURITY KERNEL AUDIT STREAM</span>
                  <span className="text-[10px] text-emerald-400 font-bold">● LISTENING</span>
                </div>

                {simLog.length === 0 ? (
                  <div className="text-slate-600 italic pt-6 text-center">
                    Awaiting simulation action. Select domain and click "Simulate Encryption".
                  </div>
                ) : (
                  simLog.map((line, idx) => {
                    let color = "text-slate-300";
                    if (line.includes("REPLAY DETECTED") || line.includes("409 Conflict")) color = "text-rose-400 font-bold";
                    else if (line.includes("HTTP 200") || line.includes("AES-256-GCM")) color = "text-emerald-400";
                    else if (line.includes("HKDF EXTRACT")) color = "text-amber-300";
                    else if (line.includes("SECURITY HEADERS")) color = "text-blue-300";

                    return (
                      <div key={idx} className={color}>
                        {line}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Nonce Cache: Redis Cluster (100% In-Memory)</span>
                <span>Clock Drift Tolerated: ±30 sec</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. SECURITY CHECKLIST FOR HIGH-VALUE FINTECH TRANSACTIONS ── */}
        <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#102A43]">
                6. Security Checklist for High-Value Fintech Transactions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Core architectural mandates required for production operations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 mb-3 text-blue-700 font-black text-sm">
                <Clock className="w-4 h-4" />
                <span>1. Anti-Replay On Financial Requests</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                <code className="font-mono text-blue-700 font-bold">sathus-global-security</code> attaches a unique UUID <code className="font-mono text-slate-800">nonce</code> and microsecond timestamp to every request. If an interceptor copies a ₹10,000 transfer, the server detects the duplicate nonce and rejects it with <code className="font-mono text-rose-600 font-bold">SEC_REPLAY_DETECTED (HTTP 409)</code>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 mb-3 text-emerald-700 font-black text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>2. Zero Shared RSA Keys</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Never reuse keys across <strong>SMSPAY</strong>, <strong>Near4You</strong>, and <strong>Pay2Pay</strong>. Key rotation occurs every 90 days with backward compatibility for in-flight requests using timestamped <code className="font-mono text-slate-800">key_id</code> versioning.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 mb-3 text-purple-700 font-black text-sm">
                <Database className="w-4 h-4" />
                <span>3. Atomic Stored Procedures</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Always pass decrypted <code className="font-mono text-slate-800">user_id</code> and verified role claims directly to PostgreSQL stored procedures (<code className="font-mono text-purple-700 font-bold">sp_sales_hierarchy_authorization</code>, <code className="font-mono text-purple-700 font-bold">sp_recharge_execute_accounting</code>) to guarantee row-level isolation and atomic ledger consistency.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Cpu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

