import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Key,
  FileCheck,
  Lock,
  Activity,
  Shield,
  FileSpreadsheet,
  Cpu,
  Server,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ArrowRight,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "Security & Operational Integrity | Pay2Pay Enterprise FinTech",
  description:
    "Explore the multi-layered security controls, authentication safeguards, data encryption standards, and continuous telemetry protecting the Pay2Pay platform.",
};

const fullSecurityPillars = [
  {
    title: "1. Secure Authentication",
    badge: "Controlled Auth",
    icon: ShieldCheck,
    desc: "Workstation and mobile portal access is strictly protected through multi-factor authentication, timed session tokens, and encrypted 6-digit MPIN validation.",
    points: [
      "Cryptographically hashed credential verification",
      "Encrypted 6-digit transaction MPIN required for all financial actions",
      "Dynamic one-time password (OTP) authorization for sensitive operations",
      "Automated lockout following consecutive failed attempts",
    ],
  },
  {
    title: "2. Role-Based Access Control (RBAC)",
    badge: "RBAC Architecture",
    icon: Key,
    desc: "Strictly segregated permissions ensure that every partner and internal operator only accesses features, data, and routes required for their specific role.",
    points: [
      "Dedicated workspace roles (Retailer, Distributor, Super Distributor, DIT, Admin)",
      "Strict route middleware and backend token permission enforcement",
      "Hierarchical data segregation preventing unauthorized cross-network access",
      "Principle of least privilege applied across all operational tiers",
    ],
  },
  {
    title: "3. Paperless KYC Verification",
    badge: "Identity Verification",
    icon: FileCheck,
    desc: "Mandatory digital verification processes ensure that only authenticated, verified business entities are permitted to process financial transactions.",
    points: [
      "Automated PAN card verification against statutory databases",
      "Aadhaar OTP electronic verification with biometric token verification",
      "Automated penny-drop validation for settlement bank accounts",
      "Storefront photographic evidence and GPS geolocation validation",
    ],
  },
  {
    title: "4. Granular Access Control",
    badge: "Access Policy",
    icon: Lock,
    desc: "Every API endpoint and user interaction is governed by strict authorization checks, preventing unauthorized access or parameter tampering.",
    points: [
      "Short-lived cryptographic JSON Web Tokens (JWT)",
      "IP whitelisting capabilities for enterprise gateways",
      "Cross-Origin Resource Sharing (CORS) strictly constrained",
      "Cryptographic CSRF token validation on all mutating state requests",
    ],
  },
  {
    title: "5. Real-Time Transaction Controls",
    badge: "Risk Mitigation",
    icon: Activity,
    desc: "Automated transaction controls and risk rules mitigate financial risk, preventing double-debits, velocity anomalies, and unauthorized fund movements.",
    points: [
      "Real-time transaction velocity monitoring per terminal",
      "Configurable daily and per-transaction operational caps",
      "Automated idempotency keys preventing accidental double-processing",
      "Dynamic anomaly detection flags suspicious transaction patterns",
    ],
  },
  {
    title: "6. End-to-End Data Protection",
    badge: "Encryption Standards",
    icon: Shield,
    desc: "All payload data in transit and sensitive records at rest are safeguarded using industry-standard cryptographic protocols.",
    points: [
      "TLS 1.3 encryption for all client-to-server and inter-service communications",
      "AES-256 at-rest database encryption for sensitive partner details",
      "Zero plain-text storage of passwords, MPINs, or biometric payloads",
      "Sanitized logging ensuring sensitive PII is never captured in system logs",
    ],
  },
  {
    title: "7. Immutable Audit Logging",
    badge: "Audit Trails",
    icon: FileSpreadsheet,
    desc: "Every financial operation, login event, and administrative action is recorded in immutable, chronological audit trails with unique identifiers.",
    points: [
      "Unique Transaction Reference (UTR) attached to every ledger movement",
      "Actor attribution tracking user ID, IP address, device, and timestamp",
      "Tamper-resistant audit trails for full operational transparency",
      "Real-time audit log streaming to centralized security storage",
    ],
  },
  {
    title: "8. 24x7 Monitoring & Telemetry",
    badge: "Continuous Telemetry",
    icon: Server,
    desc: "Continuous system telemetry monitors application health, gateway latency, error rates, and automated failover switches around the clock.",
    points: [
      "Sub-second latency tracking across all banking gateway switches",
      "Automated multi-rail failover when upstream partner switches degrade",
      "Real-time alerting for operational anomalies or error surges",
      "99.9% uptime SLA maintained through redundant server clusters",
    ],
  },
  {
    title: "9. Secure Document Storage",
    badge: "Encrypted Storage",
    icon: Cpu,
    desc: "Uploaded partner KYC documents and compliance artifacts are stored in encrypted cloud object storage with time-limited signed URL access.",
    points: [
      "Encrypted cloud object storage with strict private bucket permissions",
      "Short-lived (transient) signed URLs generated for verified compliance review",
      "Zero public accessibility to raw partner document files",
      "Periodic storage access audits and automated data retention policies",
    ],
  },
  {
    title: "10. Session & Device Security",
    badge: "Device Safeguards",
    icon: Smartphone,
    desc: "Workstation sessions are bound to authorized devices with single-active session concurrency controls to prevent session hijacking.",
    points: [
      "Single-session concurrency limits prevent concurrent unauthorized logins",
      "Automated idle session timeouts for unattended terminals",
      "Registered device fingerprinting and biometric driver authorization",
      "Instant remote session revocation from the user profile settings",
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Security & Risk Controls"
          titlePrefix="Enterprise"
          highlightedTitle="Security Architecture"
          titleSuffix="& Operational Safeguards"
          description="Engineered with strict enterprise defense controls, end-to-end data encryption, and resilient session safeguards protecting every partner workspace and transaction."
        />

        {/* 2. Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 2xl:gap-10 mb-16 2xl:mb-24">
          {fullSecurityPillars.map((pillar) => {
            const IconComp = pillar.icon;

            return (
              <div
                key={pillar.title}
                className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-800 hover:border-blue-500/50 transition-all shadow-xl relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <IconComp size={26} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-[11px] font-bold text-blue-300 font-mono">
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    {pillar.desc}
                  </p>

                  {/* Checklist */}
                  <div className="space-y-2.5 pt-6 border-t border-slate-800/80 mb-6">
                    {pillar.points.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Security Commitment & Responsible Disclosure */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-slate-800 mb-16 2xl:mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase">
                <AlertTriangle size={14} />
                <span>Security Assurance</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Responsible Security & Vulnerability Reporting</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Pay2Pay maintains a proactive approach to application and infrastructure defense. If you identify a potential security issue or operational vulnerability, our dedicated Grievance Redressal and Security Team welcomes your responsible disclosure report.
              </p>
              <div className="text-xs text-slate-400 pt-2 flex items-center gap-2">
                <Mail size={14} className="text-blue-400" />
                <span>Contact Security Desk: </span>
                <a href={`mailto:${siteConfig.company.grievanceEmail}`} className="text-blue-400 hover:underline font-mono">
                  {siteConfig.company.grievanceEmail}
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link
                href="/privacy"
                className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all text-center"
              >
                Read Privacy Policy →
              </Link>
              <Link
                href="/terms"
                className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all text-center"
              >
                Read Terms & Conditions →
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Call to Action Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900/60 border border-blue-500/30 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-black text-white mb-4">
            Operate with Confidence on Pay2Pay
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Built from the ground up for bank-grade reliability, data privacy, and continuous transactional integrity.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/workspaces"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              Access Partner Workspaces →
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm hover:border-slate-500 transition-all"
            >
              Contact Corporate Desk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
