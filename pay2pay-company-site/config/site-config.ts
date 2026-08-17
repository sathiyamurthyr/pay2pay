import { SiteConfig } from "@/types/site";

export const siteConfig: SiteConfig = {
  company: {
    legalName: "Pay2Pay Financial Technologies Private Limited",
    brandName: "PAY2PAY",
    tagline: "Enterprise Digital Payments & Retailer Services Platform",
    cin: "U72900TN2024PTC168920",
    gstin: "33AAACP1234F1Z5",
    supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "1800 292 982",
    tollFree: "1800 292 982",
    supportEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@pay2pay.in",
    grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || "grievance@pay2pay.in",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+91 70139 14767",
    supportHours: "Monday – Saturday | 09:00 AM – 07:00 PM IST",
    headquarters: "Shop No: 7, 1st Floor, Chittaramma Temple Complex, Moosapet, Hyderabad, Telangana - 500018, India",
    nodalOfficer: "Grievance Redressal Officer, Pay2Pay",
    websiteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://pay2pay.in",
  },
  navigation: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Ecosystem", href: "/ecosystem" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Security", href: "/security" },
    { label: "Workspaces", href: "/workspaces" },
    { label: "Contact", href: "/contact" },
  ],
  hero: {
    badge: "Next-Gen Fintech Ecosystem",
    headline: "Powering the Future of Digital Financial Services",
    subheading:
      "Pay2Pay connects retailers, distributors, service partners and customers through a secure digital financial services ecosystem.",
    primaryCta: "Retailer Login",
    secondaryCta: "Become a Retailer",
    tertiaryCta: "Explore Services",
  },
  overview: {
    sectionBadge: "Enterprise Architecture",
    title: "One Platform. Multiple Financial Services.",
    subtitle:
      "Our platform brings multiple financial and utility services together through a unified partner network, enabling businesses to manage customer transactions and operational activities from one secure workspace.",
    pillars: [
      {
        title: "Digital Payments",
        desc: "Instant payment collection, QR integration, and assisted payout operations with multi-rail routing.",
        iconName: "CreditCard",
      },
      {
        title: "Retailer Services",
        desc: "Comprehensive counter-service toolkit enabling merchants to serve daily banking and billing needs.",
        iconName: "Store",
      },
      {
        title: "Money Transfer",
        desc: "High-concurrency Domestic Money Transfer (DMT) with instant IMPS/NEFT account settlement.",
        iconName: "ArrowLeftRight",
      },
      {
        title: "Bill Payments (BBPS)",
        desc: "Connected utility, electricity, water, gas, and broadband collections with instant confirmation.",
        iconName: "Receipt",
      },
      {
        title: "Enterprise Wallet",
        desc: "Virtual accounts, real-time ledger accounting, auto top-up, and instant commission settlements.",
        iconName: "Wallet",
      },
    ],
  },
  services: [
    {
      id: "dmt",
      title: "Domestic Money Transfer",
      category: "financial",
      description: "Direct bank account transfers across India with 24x7 IMPS/NEFT verification and instant receipt.",
      iconName: "Send",
      badge: "High Speed",
      active: true,
      features: ["Instant IMPS Settlement", "IFSC Bank Validation", "Real-Time Transaction Status"],
    },
    {
      id: "aeps",
      title: "AEPS (Aadhaar Banking)",
      category: "financial",
      description: "Aadhaar Enabled Payment System supporting biometric cash withdrawal, balance enquiry, and mini-statements.",
      iconName: "Fingerprint",
      badge: "Biometric Banking",
      active: true,
      features: ["Aadhaar Biometric Auth", "Cash Withdrawal", "Mini Statement Fetch"],
    },
    {
      id: "pan",
      title: "PAN Services",
      category: "financial",
      description: "Seamless online new PAN card application, correction, and verification assistance.",
      iconName: "FileText",
      badge: "Paperless KYC",
      active: true,
      features: ["New PAN Application", "Correction Support", "Digital Document Verification"],
    },
    {
      id: "insurance",
      title: "Insurance Premium Support",
      category: "financial",
      description: "Premium collection and policy support for two-wheeler, four-wheeler, life, and health insurance.",
      iconName: "Shield",
      badge: "Protection Plans",
      active: true,
      features: ["Two & Four Wheeler", "Health & Life Premium", "Instant Policy Issuance"],
    },
    {
      id: "bbps",
      title: "Bharat Bill Payment System (BBPS)",
      category: "bill_payment",
      description: "Unified Bharat Bill Payment System covering electricity, water, gas, broadband, FASTag, and municipal bills.",
      iconName: "Receipt",
      badge: "BBPS Integrated",
      active: true,
      features: ["Instant Bill Fetch", "Digital Payment Receipts", "Auto-Reconciliation"],
    },
    {
      id: "electricity",
      title: "Electricity Bill Payment",
      category: "bill_payment",
      description: "Fast and secure electricity utility bill fetch and instant payment processing via BBPS.",
      iconName: "Zap",
      badge: "Utility BBPS",
      active: true,
      features: ["State & Private Boards", "Auto Bill Fetch", "Digital Tax Invoices"],
    },
    {
      id: "water",
      title: "Water Bill Payment",
      category: "bill_payment",
      description: "Municipal and state water utility bill verification and instant settlement.",
      iconName: "Droplets",
      badge: "Municipal Utility",
      active: true,
      features: ["Municipal Boards", "Instant Receipt Generation", "Zero Latency Processing"],
    },
    {
      id: "gas",
      title: "Gas / LPG Payment",
      category: "bill_payment",
      description: "Piped gas bill payments and LPG cylinder booking collections.",
      iconName: "Flame",
      badge: "Energy Utility",
      active: true,
      features: ["Piped Gas & Cylinders", "Provider Integration", "Instant Booking ID"],
    },
    {
      id: "mobile-recharge",
      title: "Mobile Prepaid Recharge",
      category: "bill_payment",
      description: "Prepaid mobile recharge across all major telecom operators with instant top-up and live plan discovery.",
      iconName: "Smartphone",
      badge: "Instant Top-Up",
      active: true,
      features: ["All Major Operators", "Live Plan Discovery", "Instant Confirmation"],
    },
    {
      id: "dth-recharge",
      title: "DTH Satellite Recharge",
      category: "bill_payment",
      description: "Direct-to-home satellite television subscription recharge across all major satellite providers.",
      iconName: "Tv",
      badge: "Instant Active",
      active: true,
      features: ["Major DTH Operators", "Customer Info Lookup", "Immediate Activation"],
    },
  ],
  ecosystem: {
    sectionBadge: "Connected Partner Network",
    title: "Connected Partner Ecosystem",
    subtitle:
      "A connected multi-tier partner ecosystem designed to support secure digital financial service operations across India.",
    steps: [
      {
        step: "01",
        title: "Customer",
        description: "Customers access supported financial and utility services through authorized Pay2Pay retail counters.",
        iconName: "UserCheck",
      },
      {
        step: "02",
        title: "Retailer",
        description: "Retailers provide counter-assisted digital banking and payment services through their dedicated workstation.",
        iconName: "Store",
      },
      {
        step: "03",
        title: "Distributor",
        description: "Distributors support, onboard, and manage their assigned retailer network with liquidity provisioning.",
        iconName: "Users",
      },
      {
        step: "04",
        title: "Super Distributor",
        description: "Super Distributors oversee master franchise operations across distributor and retailer hierarchies.",
        iconName: "Network",
      },
      {
        step: "05",
        title: "DIT",
        description: "DIT partners access technical network facilitation, integration diagnostics, and operational telemetry.",
        iconName: "Layers",
      },
      {
        step: "06",
        title: "Pay2Pay Core",
        description: "Pay2Pay Core delivers multi-rail routing, real-time ledger accounting, and transaction orchestration.",
        iconName: "Cpu",
      },
      {
        step: "07",
        title: "Banking & Service Partners",
        description: "Supported services are cleared through NPCI, authorized sponsor banks, and regulated payment aggregators.",
        iconName: "Landmark",
      },
    ],
  },
  workflow: {
    sectionBadge: "Operational Flow",
    title: "How Pay2Pay Works",
    subtitle: "A structured, end-to-end operational flow ensuring speed, compliance, and real-time settlement.",
    steps: [
      {
        number: "01",
        title: "Partner Registration",
        description: "Prospective retail and distribution partners submit their application through our digital onboarding portal.",
        badge: "Registration",
      },
      {
        number: "02",
        title: "KYC & Verification",
        description: "Automated digital verification validates PAN, Aadhaar OTP credentials, and bank account details.",
        badge: "Compliance",
      },
      {
        number: "03",
        title: "Admin Approval",
        description: "Pay2Pay compliance team reviews application documents and approves the partner account.",
        badge: "Verification",
      },
      {
        number: "04",
        title: "Workspace Activation",
        description: "Dedicated virtual accounts and role-segregated workstations are provisioned instantly.",
        badge: "Activation",
      },
      {
        number: "05",
        title: "Service Access",
        description: "Partners connect biometric devices, micro-ATMs, and activate supported banking and utility modules.",
        badge: "Setup",
      },
      {
        number: "06",
        title: "Customer Transaction",
        description: "Retailer assists walk-in customers with DMT transfers, AEPS withdrawals, or utility bill payments.",
        badge: "Operation",
      },
      {
        number: "07",
        title: "Transaction Processing",
        description: "Pay2Pay Core routes the transaction across optimal banking rails with real-time status verification.",
        badge: "Processing",
      },
      {
        number: "08",
        title: "Settlement & Reconciliation",
        description: "Commissions are instantly credited to the partner wallet with automated ledger reconciliation.",
        badge: "Settlement",
      },
    ],
  },
  security: {
    sectionBadge: "Security Architecture",
    title: "Security & Operational Integrity",
    subtitle:
      "Engineered with strict enterprise defense controls, end-to-end data encryption, and resilient session safeguards.",
    pillars: [
      {
        title: "Secure Authentication",
        description: "Protect access to Pay2Pay workspaces through multi-factor authentication and secure MPIN controls.",
        iconName: "ShieldCheck",
        badge: "Controlled Auth",
      },
      {
        title: "Role-Based Access (RBAC)",
        description: "Strictly segregated permissions across Retailer, Distributor, Super Distributor, DIT, and Admin roles.",
        iconName: "Key",
        badge: "RBAC Controls",
      },
      {
        title: "KYC Verification",
        description: "Mandatory digital verification with tamper-resistant identity checks prior to service activation.",
        iconName: "FileCheck",
        badge: "Paperless KYC",
      },
      {
        title: "Access Control",
        description: "Granular API authorization, IP whitelisting capabilities, and device validation on every request.",
        iconName: "Lock",
        badge: "Access Policy",
      },
      {
        title: "Transaction Controls",
        description: "Real-time velocity checks, anti-fraud rules, and controlled operational caps to mitigate financial risk.",
        iconName: "Activity",
        badge: "Risk Controls",
      },
      {
        title: "Data Protection",
        description: "End-to-end TLS 1.3 payload transit encryption and AES-256 encryption for sensitive stored data.",
        iconName: "Shield",
        badge: "Data Encryption",
      },
      {
        title: "Audit Logging",
        description: "Immutable chronological audit trails capturing transactional events with unique UTR identifiers.",
        iconName: "FileSpreadsheet",
        badge: "Audit Logs",
      },
      {
        title: "24x7 Monitoring",
        description: "Continuous operational health telemetry, automated gateway failover, and real-time latency monitoring.",
        iconName: "Activity",
        badge: "Telemetry",
      },
      {
        title: "Secure Document Storage",
        description: "Encrypted object storage infrastructure with short-lived, signed URLs for verified document retrieval.",
        iconName: "FileCheck",
        badge: "Storage Security",
      },
      {
        title: "Session & Device Security",
        description: "Single-active session concurrency controls and biometric binding to prevent unauthorized takeover.",
        iconName: "ShieldCheck",
        badge: "Device Binding",
      },
    ],
  },
  rolePortals: [
    {
      id: "retailer",
      title: "Retailer",
      badge: "Merchants & Agents",
      subtitle: "For Registered Retail Partners",
      description: "Access the Pay2Pay Retailer Workspace for counter-assisted digital banking and utility collections.",
      features: [
        "Digital Banking & DMT Workstation",
        "AEPS Biometric Cash Services",
        "Utility & BBPS Bill Collections",
        "Real-Time Virtual Account Wallet",
      ],
      ctaLabel: "Retailer Login",
      getUrl: () => "/retailer/login",
      highlighted: true,
    },
    {
      id: "distributor",
      title: "Distributor",
      badge: "Distribution Network",
      subtitle: "For Authorized Distributors",
      description: "Manage assigned retailer operations, agent onboarding, and territory network liquidity.",
      features: [
        "Retailer Network Management",
        "Agent Performance Analytics",
        "Territory Volume Monitoring",
        "Automated Payout Reconciliation",
      ],
      ctaLabel: "Distributor Login",
      getUrl: () => "/distributor/login",
    },
    {
      id: "super-distributor",
      title: "Super Distributor",
      badge: "Master Franchise",
      subtitle: "For Super Distributors",
      description: "Manage distributor and retailer network operations across master franchise territories.",
      features: [
        "Multi-Tier Hierarchy Oversight",
        "Bulk Liquidity Allocations",
        "Zonal Commission Settlements",
        "Advanced Revenue Analytics",
      ],
      ctaLabel: "Super Distributor Login",
      getUrl: () => "/super-distributor/login",
    },
    {
      id: "dit",
      title: "DIT",
      badge: "Operations Support",
      subtitle: "For DIT Operations",
      description: "Access DIT operational services, technical network facilitation, and gateway diagnostics.",
      features: [
        "Technical Network Facilitation",
        "Operational Health Telemetry",
        "Service Gateway Verification",
        "Integration Diagnostics",
      ],
      ctaLabel: "DIT Login",
      getUrl: () => "/dit/login",
    },
    {
      id: "admin",
      title: "Company Admin",
      badge: "Enterprise Control",
      subtitle: "For Enterprise Administrators",
      description: "Manage enterprise configuration, KYC verification, settlement policies, and platform operations.",
      features: [
        "Retailer KYC Verification & Approvals",
        "Platform Configuration & Policy Rules",
        "Transaction Settlement Management",
        "Enterprise Audit & Error Oversight",
      ],
      ctaLabel: "Company Admin Login",
      getUrl: () => "/company-admin/login",
    },
  ],
  about: {
    sectionBadge: "About Pay2Pay",
    title: "About Pay2Pay",
    description:
      "Pay2Pay is a digital financial services platform designed to connect customers, retailers, distributors and service partners through a secure and reliable technology ecosystem.",
    mission:
      "Our platform brings multiple financial and utility services together through a unified partner network, enabling businesses to manage customer transactions and operational activities from one secure workspace.",
    vision:
      "To build India's most trusted, scalable, and connected digital financial services network.",
    technologyApproach:
      "Pay2Pay provides the technology, transaction processing and operational infrastructure connecting the partner ecosystem with authorized banking and service integrations.",
  },
  legal: {
    terms: {
      id: "terms",
      title: "Terms & Conditions",
      lastUpdated: "August 2026",
      summary:
        "These terms govern the use of the Pay2Pay corporate website, partner portals, and digital financial services ecosystem.",
      sections: [
        {
          heading: "1. Acceptance of Terms",
          content:
            "By accessing the Pay2Pay website, partner portals, or related services, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not access or use the platform.",
        },
        {
          heading: "2. Eligibility & Partner Onboarding",
          content:
            "Retailers and distributors must be legally competent entities operating in compliance with applicable Indian commercial laws. Registration is subject to mandatory KYC verification and approval by Pay2Pay.",
        },
        {
          heading: "3. Permitted Platform Use",
          content:
            "Partners agree to use the platform solely for lawful transactions, adhering strictly to RBI guidelines, anti-money laundering regulations, and cyber security best practices. Fraudulent activities will result in immediate termination and legal action.",
        },
        {
          heading: "4. Wallet & Transaction Settlement",
          content:
            "Virtual account credits and wallet balances represent pre-funded operational capital. Transactions are routed in real-time through authorized sponsor banks. Pay2Pay is not liable for upstream banking network delays beyond its reasonable control.",
        },
        {
          heading: "5. Limitation of Liability",
          content:
            "In no event shall Pay2Pay Financial Technologies Private Limited be liable for indirect, incidental, or consequential damages arising from the use or inability to use the platform services.",
        },
      ],
    },
    privacy: {
      id: "privacy",
      title: "Privacy Policy",
      lastUpdated: "August 2026",
      summary:
        "We are committed to safeguarding personal and business information in accordance with applicable data protection laws.",
      sections: [
        {
          heading: "1. Information We Collect",
          content:
            "We collect business registration details, contact info (email, phone, address), identity verification artifacts (PAN, Aadhaar verification tokens), device/network telemetry, and transactional records for compliance.",
        },
        {
          heading: "2. How We Use Information",
          content:
            "Data is used strictly to process transactions, satisfy statutory KYC requirements, prevent fraudulent activities, deliver customer support, and communicate service alerts.",
        },
        {
          heading: "3. Data Security & Storage",
          content:
            "Information is stored on encrypted, access-controlled servers adhering to industry-standard encryption (TLS 1.3 and AES-256). Sensitive credentials such as MPINs or passwords are encrypted and never exposed in plaintext.",
        },
        {
          heading: "4. Disclosure to Third Parties",
          content:
            "We do not sell personal information. Data is shared solely with regulated partner banks, payment gateways, and statutory regulatory authorities as required by law to execute financial transactions.",
        },
        {
          heading: "5. Grievance Redressal",
          content:
            "Users may reach out to our designated Grievance Redressal Officer at grievance@pay2pay.in for privacy-related questions or data concerns.",
        },
      ],
    },
    refund: {
      id: "refund",
      title: "Refund & Cancellation Policy",
      lastUpdated: "August 2026",
      summary:
        "Guidelines governing transaction cancellations, failed payment reversals, and wallet refund timelines.",
      sections: [
        {
          heading: "1. Failed Transaction Reversals",
          content:
            "If funds are debited from a partner wallet but the transaction fails at the upstream bank/biller network, the debited amount is automatically reversed back to the wallet as per NPCI/banking turnaround timelines (typically instant or within T+2 working days).",
        },
        {
          heading: "2. Successful Transactions",
          content:
            "Transactions successfully confirmed by the beneficiary bank or biller (such as utility bill payments, mobile recharges, or completed IMPS transfers) are irrevocable and cannot be cancelled or refunded.",
        },
        {
          heading: "3. Disputed Transactions",
          content:
            "Partners can raise a dispute ticket through their portal dashboard or via support@pay2pay.in with the Unique Transaction Reference (UTR) number. Our dispute resolution team investigates with partner banks within 24–48 hours.",
        },
        {
          heading: "4. Wallet Balance Withdrawal",
          content:
            "Unutilized wallet funds can be settled back to the partner's verified settlement bank account in accordance with regulatory settlement rules.",
        },
      ],
    },
  },
};
