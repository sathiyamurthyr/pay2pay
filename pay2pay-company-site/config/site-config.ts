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
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Services", href: "#services" },
    { label: "Ecosystem", href: "#ecosystem" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Security", href: "#security" },
    { label: "Workspaces", href: "#workspaces" },
    { label: "Contact", href: "#contact" },
  ],
  hero: {
    badge: "Next-Gen Fintech Ecosystem",
    headline: "Powering the Future of Digital Financial Services",
    subheading:
      "Pay2Pay connects retailers, distributors, and service partners through a secure, high-throughput enterprise financial services infrastructure.",
    primaryCta: "Retailer Login",
    secondaryCta: "Become a Retailer",
    tertiaryCta: "Explore Services",
  },
  overview: {
    sectionBadge: "Enterprise Architecture",
    title: "One Platform. Multiple Financial Services.",
    subtitle:
      "A unified digital platform built for scale, performance, and seamless payment interoperability across assisted commerce networks.",
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
      title: "Domestic Money Transfer (DMT)",
      description: "Direct bank account transfers across India with 24x7 IMPS/NEFT verification and instant receipt.",
      iconName: "Send",
      badge: "High Speed",
      active: true,
      features: ["Instant IMPS Settlement", "IFSC Bank Validation", "Real-Time Transaction Status"],
    },
    {
      id: "bbps",
      title: "Bharat Bill Payment System (BBPS)",
      description: "Unified bill payments for electricity, gas, water, broadband, FASTag, and mobile postpaid.",
      iconName: "Zap",
      badge: "BBPS Integrated",
      active: true,
      features: ["Instant Bill Fetch", "Digital Payment Receipts", "Auto-Reconciliation"],
    },
    {
      id: "recharge",
      title: "Mobile & DTH Recharge",
      description: "Prepaid mobile and direct-to-home recharge services across all major telecom and satellite providers.",
      iconName: "Smartphone",
      badge: "Instant Top-Up",
      active: true,
      features: ["Live Plan Discovery", "Instant Confirmation", "Commission Ledger Sync"],
    },
    {
      id: "payout",
      title: "Enterprise Payout Services",
      description: "Automated single and bulk disbursement capabilities designed for commercial and retailer payouts.",
      iconName: "TrendingUp",
      badge: "Automated",
      active: true,
      features: ["Batch Processing", "Smart Fallback Routing", "Webhook Notifications"],
    },
    {
      id: "wallet",
      title: "Virtual Account & Wallet Management",
      description: "Dedicated virtual bank accounts for 24x7 instant auto-crediting and ledger transparency.",
      iconName: "Wallet",
      badge: "Real-Time Ledger",
      active: true,
      features: ["Instant Auto-Top-Up", "24x7 Zero Delay", "Detailed Transaction Statement"],
    },
    {
      id: "retailer-ops",
      title: "Retailer Enablement & Support",
      description: "End-to-end partner onboarding, relationship management, and designated support desks.",
      iconName: "Users",
      badge: "Partner First",
      active: true,
      features: ["Dedicated Relationship Manager", "Priority Helpdesk", "Interactive Workstation"],
    },
  ],
  ecosystem: {
    sectionBadge: "Assisted Banking Network",
    title: "Built Around the Retailer",
    subtitle:
      "A seamless transactional lifecycle connecting consumers at neighbourhood retail counters with core banking infrastructure.",
    steps: [
      {
        step: "01",
        title: "Walk-in Customer",
        description: "Customer visits the local retailer counter requesting financial or billing services.",
        iconName: "UserCheck",
      },
      {
        step: "02",
        title: "Authorized Retailer",
        description: "Retailer initiates transaction securely via the Pay2Pay Enterprise Workstation.",
        iconName: "Store",
      },
      {
        step: "03",
        title: "Pay2Pay Core Platform",
        description: "Intelligent payment gateway processes transaction through secure encrypted rails.",
        iconName: "Cpu",
      },
      {
        step: "04",
        title: "Banking & Billers Rail",
        description: "Real-time clearance across NPCI, sponsor banks, and service providers.",
        iconName: "Landmark",
      },
      {
        step: "05",
        title: "Instant Settlement",
        description: "Transaction completed with instant digital receipt and automated commission credit.",
        iconName: "CheckCircle2",
      },
    ],
  },
  workflow: {
    sectionBadge: "Partner Onboarding",
    title: "How to Join the Pay2Pay Network",
    subtitle: "A modern, 4-step digital onboarding process getting you started in minutes.",
    steps: [
      {
        number: "01",
        title: "Quick Registration",
        description: "Sign up with your mobile number and store basic business profile information.",
        badge: "Step 1",
      },
      {
        number: "02",
        title: "Digital Verification",
        description: "Complete paperless PAN and Aadhaar identity verification securely.",
        badge: "Step 2",
      },
      {
        number: "03",
        title: "Account Activation",
        description: "System verifies your registered banking details and unlocks portal access.",
        badge: "Step 3",
      },
      {
        number: "04",
        title: "Start Operations",
        description: "Fund your wallet and deliver seamless financial services to your customers.",
        badge: "Step 4",
      },
    ],
  },
  security: {
    sectionBadge: "Security Architecture",
    title: "Security Built Into Every Layer",
    subtitle:
      "Engineered with strict enterprise defense controls, end-to-end data encryption, and resilient session safeguards.",
    pillars: [
      {
        title: "Secure Authentication",
        description: "Multi-factor authentication, secure session tokens, and encrypted credentials guard every access.",
        iconName: "ShieldCheck",
        badge: "MFA Protected",
      },
      {
        title: "End-to-End Data Encryption",
        description: "All payload transfers are safeguarded with TLS 1.3 encryption in-transit and AES-256 at rest.",
        iconName: "Lock",
        badge: "TLS 1.3 / AES-256",
      },
      {
        title: "Digital KYC & Verification",
        description: "Automated registry verification ensuring full compliance with national identity guidelines.",
        iconName: "FileCheck",
        badge: "Paperless",
      },
      {
        title: "Role-Based Access Control (RBAC)",
        description: "Granular permission separation between Retailers, DITs, Super-Distributors, and Admins.",
        iconName: "Key",
        badge: "Isolated Portals",
      },
      {
        title: "Real-Time Transaction Monitoring",
        description: "Proactive fraud detection, anomalous request mitigation, and velocity limits on payment rails.",
        iconName: "Activity",
        badge: "Live Telemetry",
      },
      {
        title: "Audit & Compliance Logging",
        description: "Immutable transactional audit trails ensuring complete transparency and operational accountability.",
        iconName: "FileSpreadsheet",
        badge: "Immutable Trails",
      },
    ],
  },
  rolePortals: [
    {
      id: "retailer",
      title: "Retailer Workspace",
      badge: "Merchants & Agents",
      subtitle: "For Registered Retail Partners",
      description:
        "Access your point-of-sale banking workstation, wallet balances, customer records, and transaction receipts.",
      features: [
        "DMT & Bill Payment Workstation",
        "Real-Time Virtual Account Wallet",
        "Instant Commission Ledger",
        "Relationship Manager Support",
      ],
      ctaLabel: "Retailer Portal Login",
      getUrl: () => process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "https://pay2pay.in/retailer/login",
      highlighted: true,
    },
    {
      id: "dit",
      title: "Distributor Portal",
      badge: "Distribution Network",
      subtitle: "For Authorized Distributors (DIT)",
      description:
        "Manage your regional retailer network, monitor agent transactional throughput, and track commissions.",
      features: [
        "Retailer Network Management",
        "Agent Performance Analytics",
        "Territory Volume Monitoring",
        "Automated Payout Reconciliation",
      ],
      ctaLabel: "Distributor Login",
      getUrl: () => process.env.NEXT_PUBLIC_DIT_LOGIN_URL || "/dit-dashboard",
    },
    {
      id: "sd",
      title: "Super-Distributor Hub",
      badge: "Master Franchise",
      subtitle: "For Super-Distributors (SD)",
      description:
        "Comprehensive hierarchy management across multiple distributor zones, liquidity tracking, and team oversight.",
      features: [
        "Multi-Tier Hierarchy Oversight",
        "Bulk Liquidity Allocations",
        "Zonal Commission Settlements",
        "Advanced Revenue Analytics",
      ],
      ctaLabel: "Super-Distributor Login",
      getUrl: () => process.env.NEXT_PUBLIC_SD_LOGIN_URL || "/sd-dashboard",
    },
  ],
  about: {
    sectionBadge: "About Pay2Pay",
    title: "Empowering Local Merchants with Modern Financial Rails",
    description:
      "Pay2Pay Financial Technologies is dedicated to building an accessible, high-performance financial services ecosystem. We empower neighbourhood retailers with the technology, reliability, and security needed to deliver essential digital banking and payment services to every citizen.",
    mission:
      "To democratize digital payments and assisted financial services across India by equipping retailers with dependable, enterprise-grade technology.",
    vision:
      "To build India's most trusted, scalable, and connected retailer-led financial services network.",
    technologyApproach:
      "Our infrastructure utilizes low-latency microservices, fault-tolerant payment gateways, automated multi-rail routing, and real-time ledger consistency.",
  },
  legal: {
    terms: {
      id: "terms",
      title: "Terms & Conditions",
      lastUpdated: "August 2026",
      summary:
        "These terms govern the use of the Pay2Pay corporate website, portals, and assisted financial services network.",
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
