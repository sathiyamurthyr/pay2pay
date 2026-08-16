export interface NavItem {
  label: string;
  href: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  badge?: string;
  active: boolean;
  features: string[];
}

export interface SecurityPillar {
  title: string;
  description: string;
  iconName: string;
  badge?: string;
}

export interface EcosystemStep {
  step: string;
  title: string;
  description: string;
  iconName: string;
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  badge: string;
}

export interface RolePortal {
  id: "retailer" | "distributor" | "super-distributor" | "dit" | "admin" | "sd";
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  features: string[];
  ctaLabel: string;
  getUrl: () => string;
  highlighted?: boolean;
}

export interface CompanyDetails {
  legalName: string;
  brandName: string;
  tagline: string;
  cin: string;
  gstin: string;
  supportPhone: string;
  tollFree: string;
  supportEmail: string;
  grievanceEmail: string;
  whatsapp: string;
  supportHours: string;
  headquarters: string;
  nodalOfficer: string;
  websiteUrl: string;
}

export interface LegalDocument {
  id: "terms" | "privacy" | "refund";
  title: string;
  lastUpdated: string;
  summary: string;
  sections: { heading: string; content: string | string[] }[];
}

export interface SiteConfig {
  company: CompanyDetails;
  navigation: NavItem[];
  hero: {
    badge: string;
    headline: string;
    subheading: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
  };
  overview: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    pillars: { title: string; desc: string; iconName: string }[];
  };
  services: ServiceItem[];
  ecosystem: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    steps: EcosystemStep[];
  };
  workflow: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    steps: WorkflowStep[];
  };
  security: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    pillars: SecurityPillar[];
  };
  rolePortals: RolePortal[];
  about: {
    sectionBadge: string;
    title: string;
    description: string;
    mission: string;
    vision: string;
    technologyApproach: string;
  };
  legal: Record<string, LegalDocument>;
}
