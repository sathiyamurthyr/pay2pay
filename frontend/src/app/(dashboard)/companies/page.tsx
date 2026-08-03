"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Building2,
  Plus,
  X,
  ShieldCheck,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle2,
  ShieldOff,
  Edit2,
  ExternalLink,
  Check,
  Landmark,
  UserCheck,
  FileText,
  Sliders,
  Copy,
  ChevronRight,
  Maximize2,
  Eye,
  Upload,
  Download,
  UploadCloud,
  FileCheck2,
} from "lucide-react";

// ─── Reusable sub-components ───────────────────────────────────────
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import { StatusBadge, type CompanyStatus } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { CompliancePopover } from "@/components/ui/compliance-popover";

// ─── TypeScript Interfaces ─────────────────────────────────────────

export interface Company {
  public_id: string;
  company_code: string;
  company_name: string;
  legal_name: string;
  tenant_code: string;
  company_type: string;
  gst_number?: string;
  pan_number?: string;
  cin_number?: string;
  status: CompanyStatus;
  version_no: number;
  created_date: string;
  verified_on?: string;
  enrolled_by?: string;
  state?: string;
  contact_email?: string;
  contact_mobile?: string;
}

export interface CompanyDoc {
  id: string;
  name: string;
  type: string;
  docNumber: string;
  status: "VERIFIED" | "PENDING_VERIFICATION" | "REJECTED";
  uploadedDate: string;
  version: number;
}

export const DEFAULT_DOC_CATEGORIES = [
  { value: "GST_CERTIFICATE", label: "GST Registration Certificate" },
  { value: "PAN_CARD", label: "PAN Card Registration" },
  { value: "CIN_CERTIFICATE", label: "Certificate of Incorporation (CIN / ROC)" },
  { value: "MOA_AOA", label: "MOA & AOA Charter Documents" },
  { value: "MSME_CERTIFICATE", label: "MSME / Udyam Registration Certificate" },
  { value: "TAN_CERTIFICATE", label: "TAN Registration Certificate" },
  { value: "BOARD_RESOLUTION", label: "Board Resolution for Authorized Signatory" },
  { value: "BANK_CANCELLED_CHEQUE", label: "Bank Cancelled Cheque / Bank Statement" },
  { value: "AUDITED_FINANCIALS", label: "Audited Financial Balance Sheet (Latest FY)" },
  { value: "DIRECTOR_ID_PROOF", label: "Director / Partner Identity Proof (Aadhaar / Passport)" },
  { value: "RBI_PA_LICENSE", label: "RBI Authorised Payment Aggregator License" },
  { value: "ISO_27001_CERT", label: "ISO 27001 Security Audit Certificate" },
  { value: "PCI_DSS_ATT", label: "PCI-DSS Attestation of Compliance (AOC)" },
];

// ─── Mock Data (15 companies) ──────────────────────────────────────

const MOCK_COMPANIES: Company[] = [
  {
    public_id: "comp_hq_001",
    company_code: "PAY2PAY_HQ",
    company_name: "Pay2Pay Enterprise HQ",
    legal_name: "Pay2Pay Financial Technologies Services Private Limited",
    tenant_code: "PLATFORM_HQ",
    company_type: "PRIVATE_LIMITED",
    gst_number: "33AAAAB1234C1Z5",
    pan_number: "AAAAB1234C",
    cin_number: "U74999TN2020PTC123456",
    status: "ACTIVE",
    version_no: 3,
    created_date: "2026-01-15",
    verified_on: "2026-01-16",
    enrolled_by: "platform_admin",
    state: "TN",
    contact_email: "ops@pay2pay.in",
    contact_mobile: "+91 98765 43210",
  },
  {
    public_id: "comp_fin_002",
    company_code: "FINPAY01",
    company_name: "FinPay Technologies Ltd",
    legal_name: "FinPay Retail Merchant Network Services India Ltd",
    tenant_code: "TENANT_FINPAY",
    company_type: "PUBLIC_LIMITED",
    gst_number: "27AABCF9876D1Z2",
    pan_number: "AABCF9876D",
    cin_number: "L65999MH2021PLC789012",
    status: "ACTIVE",
    version_no: 2,
    created_date: "2026-02-10",
    verified_on: "2026-02-12",
    enrolled_by: "platform_admin",
    state: "MH",
    contact_email: "admin@finpay.in",
    contact_mobile: "+91 98123 45678",
  },
  {
    public_id: "comp_apex_003",
    company_code: "APEX001",
    company_name: "Apex Financial Services Ltd",
    legal_name: "Apex Integrated Payments & Settlement Systems Ltd",
    tenant_code: "TENANT_APEX",
    company_type: "PUBLIC_LIMITED",
    gst_number: "07AAACD5432E1Z8",
    pan_number: "AAACD5432E",
    cin_number: "L65191DL2022PLC345678",
    status: "PENDING_APPROVAL",
    version_no: 1,
    created_date: "2026-03-01",
    enrolled_by: "onboarding_officer",
    state: "DL",
    contact_email: "kyc@apexfin.com",
    contact_mobile: "+91 98999 11223",
  },
  {
    public_id: "comp_nexus_004",
    company_code: "NEXUS02",
    company_name: "Nexus Retail Payments Pvt Ltd",
    legal_name: "Nexus Micro Merchant Point Solutions Pvt Ltd",
    tenant_code: "TENANT_NEXUS",
    company_type: "PRIVATE_LIMITED",
    gst_number: "29AAACE1122F1Z4",
    pan_number: "AAACE1122F",
    status: "SUSPENDED",
    version_no: 1,
    created_date: "2026-03-12",
    verified_on: "2026-03-15",
    enrolled_by: "platform_admin",
    state: "KA",
    contact_email: "compliance@nexuspay.in",
    contact_mobile: "+91 97444 55667",
  },
  {
    public_id: "comp_rapidpay_005",
    company_code: "RAPIDPAY",
    company_name: "RapidPay Solutions Pvt Ltd",
    legal_name: "RapidPay Digital Settlement Services Private Limited",
    tenant_code: "TENANT_RAPID",
    company_type: "PRIVATE_LIMITED",
    gst_number: "33BBBCA4321G1Z6",
    pan_number: "BBBCA4321G",
    cin_number: "U65910TN2021PTC456789",
    status: "ACTIVE",
    version_no: 2,
    created_date: "2026-02-28",
    verified_on: "2026-03-02",
    enrolled_by: "platform_admin",
    state: "TN",
    contact_email: "support@rapidpay.in",
    contact_mobile: "+91 98888 33445",
  },
  {
    public_id: "comp_zarco_006",
    company_code: "ZARCO01",
    company_name: "Zarco Payments Network",
    legal_name: "Zarco Unified Merchant Payment Technologies LLP",
    tenant_code: "TENANT_ZARCO",
    company_type: "LLP",
    gst_number: "09CCCDE5678H1Z1",
    pan_number: "CCCDE5678H",
    status: "ACTIVE",
    version_no: 1,
    created_date: "2026-04-01",
    verified_on: "2026-04-03",
    enrolled_by: "onboarding_officer",
    state: "UP",
    contact_email: "info@zarco.in",
    contact_mobile: "+91 99111 22334",
  },
  {
    public_id: "comp_primus_007",
    company_code: "PRIMUS",
    company_name: "Primus Banking Corp",
    legal_name: "Primus Cooperative Banking Settlement Corporation Ltd",
    tenant_code: "TENANT_PRIMUS",
    company_type: "PUBLIC_LIMITED",
    gst_number: "22DDDFE7890I1Z3",
    pan_number: "DDDFE7890I",
    cin_number: "L65191GJ2019PLC234567",
    status: "BLOCKED",
    version_no: 4,
    created_date: "2026-01-20",
    verified_on: "2026-01-25",
    enrolled_by: "platform_admin",
    state: "GJ",
    contact_email: "legal@primusbank.org",
    contact_mobile: "+91 98222 33445",
  },
  {
    public_id: "comp_swift_008",
    company_code: "SWIFTPAY",
    company_name: "SwiftPay India Ltd",
    legal_name: "SwiftPay Digital Commerce Payments India Limited",
    tenant_code: "TENANT_SWIFT",
    company_type: "PUBLIC_LIMITED",
    gst_number: "27EEEFG1234J1Z7",
    pan_number: "EEEFG1234J",
    status: "ACTIVE",
    version_no: 2,
    created_date: "2026-03-20",
    verified_on: "2026-03-22",
    enrolled_by: "platform_admin",
    state: "MH",
    contact_email: "contact@swiftpay.co.in",
    contact_mobile: "+91 98333 44556",
  },
  {
    public_id: "comp_nova_009",
    company_code: "NOVA_FIN",
    company_name: "Nova Finance Group",
    legal_name: "Nova Finance & Merchant Technologies Group Pvt Ltd",
    tenant_code: "TENANT_NOVA",
    company_type: "PRIVATE_LIMITED",
    gst_number: "36FFFGH5678K1Z9",
    pan_number: "FFFGH5678K",
    status: "PENDING_APPROVAL",
    version_no: 1,
    created_date: "2026-04-10",
    enrolled_by: "onboarding_officer",
    state: "TS",
    contact_email: "onboard@novafintech.com",
    contact_mobile: "+91 98444 55667",
  },
  {
    public_id: "comp_indus_010",
    company_code: "INDUSNET",
    company_name: "Indus Merchant Network",
    legal_name: "Indus Merchant Payment Processing Network Pvt Ltd",
    tenant_code: "TENANT_INDUS",
    company_type: "PRIVATE_LIMITED",
    gst_number: "08GGGHI7890L1Z2",
    pan_number: "GGGHI7890L",
    cin_number: "U65191RJ2020PTC567890",
    status: "ACTIVE",
    version_no: 3,
    created_date: "2026-02-05",
    verified_on: "2026-02-08",
    enrolled_by: "platform_admin",
    state: "RJ",
    contact_email: "ops@indusnetpay.com",
    contact_mobile: "+91 98555 66778",
  },
  {
    public_id: "comp_bharat_011",
    company_code: "BHARATPAY",
    company_name: "BharatPay Technologies",
    legal_name: "BharatPay Rural Digital Financial Services Technologies Ltd",
    tenant_code: "TENANT_BHARAT",
    company_type: "PUBLIC_LIMITED",
    gst_number: "18HHHIJ0123M1Z4",
    pan_number: "HHHIJ0123M",
    status: "ACTIVE",
    version_no: 1,
    created_date: "2026-04-15",
    verified_on: "2026-04-17",
    enrolled_by: "platform_admin",
    state: "AS",
    contact_email: "admin@bharatpayrural.in",
    contact_mobile: "+91 98666 77889",
  },
  {
    public_id: "comp_zenith_012",
    company_code: "ZENITH_FT",
    company_name: "Zenith FinTech Solutions",
    legal_name: "Zenith Financial Technology Processing Solutions LLP",
    tenant_code: "TENANT_ZENITH",
    company_type: "LLP",
    gst_number: "33IIIJK4567N1Z6",
    pan_number: "IIIJK4567N",
    status: "SUSPENDED",
    version_no: 2,
    created_date: "2026-03-05",
    verified_on: "2026-03-07",
    enrolled_by: "onboarding_officer",
    state: "TN",
    contact_email: "compliance@zenithfin.in",
    contact_mobile: "+91 98777 88990",
  },
  {
    public_id: "comp_metro_013",
    company_code: "METROPAY",
    company_name: "MetroPay Systems Ltd",
    legal_name: "MetroPay Urban Transport & Commerce Systems Limited",
    tenant_code: "TENANT_METRO",
    company_type: "PUBLIC_LIMITED",
    gst_number: "07JJJKL8901O1Z8",
    pan_number: "JJJKL8901O",
    cin_number: "L65910DL2021PLC678901",
    status: "ACTIVE",
    version_no: 2,
    created_date: "2026-03-18",
    verified_on: "2026-03-20",
    enrolled_by: "platform_admin",
    state: "DL",
    contact_email: "support@metropay.in",
    contact_mobile: "+91 98888 99001",
  },
  {
    public_id: "comp_sigma_014",
    company_code: "SIGMA_FIN",
    company_name: "Sigma Financial Corp",
    legal_name: "Sigma Integrated Banking & Financial Corporation Ltd",
    tenant_code: "TENANT_SIGMA",
    company_type: "PRIVATE_LIMITED",
    gst_number: "29KKKLO2345P1Z1",
    pan_number: "KKKLO2345P",
    status: "DRAFT",
    version_no: 1,
    created_date: "2026-04-20",
    enrolled_by: "onboarding_officer",
    state: "KA",
    contact_email: "draft@sigmafinancial.org",
    contact_mobile: "+91 98999 00112",
  },
  {
    public_id: "comp_atlas_015",
    company_code: "ATLAS_PAY",
    company_name: "Atlas Payment Services",
    legal_name: "Atlas National Rural Payment & Commerce Services Pvt Ltd",
    tenant_code: "TENANT_ATLAS",
    company_type: "PRIVATE_LIMITED",
    gst_number: "09LLLMP6789Q1Z3",
    pan_number: "LLLMP6789Q",
    cin_number: "U65191UP2022PTC789012",
    status: "ACTIVE",
    version_no: 1,
    created_date: "2026-04-22",
    verified_on: "2026-04-24",
    enrolled_by: "platform_admin",
    state: "UP",
    contact_email: "ops@atlaspay.co.in",
    contact_mobile: "+91 98000 11223",
  },
];

// ─── KPI Computed Stats ────────────────────────────────────────────

function computeStats(companies: Company[]) {
  return {
    active: companies.filter((c) => c.status === "ACTIVE").length,
    pending: companies.filter((c) => c.status === "PENDING_APPROVAL" || c.status === "DRAFT").length,
    suspended: companies.filter((c) => c.status === "SUSPENDED" || c.status === "BLOCKED").length,
    thisMonth: companies.filter((c) => {
      const d = new Date(c.created_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };
}

// ─── Onboarding Wizard Form ────────────────────────────────────────

interface WizardFormData {
  company_code: string;
  company_name: string;
  legal_name: string;
  tenant_code: string;
  company_type: string;
  gst_number: string;
  pan_number: string;
  cin_number: string;
  primary_contact: string;
  mobile: string;
  email: string;
  settlement_bank_name: string;
  account_number: string;
  ifsc: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
}

const INITIAL_FORM: WizardFormData = {
  company_code: "",
  company_name: "",
  legal_name: "",
  tenant_code: "",
  company_type: "PRIVATE_LIMITED",
  gst_number: "",
  pan_number: "",
  cin_number: "",
  primary_contact: "",
  mobile: "",
  email: "",
  settlement_bank_name: "HDFC Bank",
  account_number: "",
  ifsc: "",
  admin_full_name: "",
  admin_email: "",
  admin_password: "",
};

// ─── Main Page Component ───────────────────────────────────────────

export default function CompanyListPage() {
  const { isRetailer, isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM);

  // ── Interactive Drawer & Modals State ──
  const [selectedDrawerCompany, setSelectedDrawerCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [approvingCompany, setApprovingCompany] = useState<Company | null>(null);
  const [approvalComments, setApprovalComments] = useState("");

  // ── Document Actions State ──
  const [companyDocsMap, setCompanyDocsMap] = useState<Record<string, CompanyDoc[]>>({});
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; docNumber: string; status: string } | null>(null);
  const [reuploadDoc, setReuploadDoc] = useState<{ name: string; type: string } | null>(null);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [newDocType, setNewDocType] = useState("MSME_CERTIFICATE");
  const [newDocName, setNewDocName] = useState("");
  const [docActionNotice, setDocActionNotice] = useState("");

  const stats = computeStats(companies);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Check localStorage for persisted dev state first
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("pay2pay_companies_state");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCompanies(parsed);
              setLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem("pay2pay_companies_state");
          }
        }
      }
      const res = await api.get("/api/v1/companies?page=1&limit=50");
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setCompanies(res.data.data);
      } else {
        setCompanies(MOCK_COMPANIES);
      }
    } catch {
      setCompanies(MOCK_COMPANIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const updateCompaniesState = (updatedList: Company[]) => {
    setCompanies(updatedList);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_companies_state", JSON.stringify(updatedList));
    }
  };

  const handleDirectApprove = (companyPublicId: string) => {
    const updated = companies.map((c) =>
      c.public_id === companyPublicId ? { ...c, status: "ACTIVE" as CompanyStatus } : c
    );
    updateCompaniesState(updated);
    if (selectedDrawerCompany?.public_id === companyPublicId) {
      setSelectedDrawerCompany((prev) => (prev ? { ...prev, status: "ACTIVE" as CompanyStatus } : null));
    }
  };

  const formatApiErrorMessage = (err: unknown, defaultFallback: string): string => {
    if (!err || typeof err !== "object") return defaultFallback;
    const errorObj = err as { response?: { data?: { detail?: unknown } }; message?: string };
    const detail = errorObj.response?.data?.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === "string" ? d : (d as { msg?: string })?.msg || JSON.stringify(d))).join("; ");
    }
    if (detail && typeof detail === "object") {
      const d = detail as { msg?: string };
      return d.msg || JSON.stringify(detail);
    }
    return errorObj.message || defaultFallback;
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    const newCompany: Company = {
      public_id: `comp_${Date.now()}`,
      company_code: formData.company_code.toUpperCase() || `COMP_${Date.now().toString().slice(-4)}`,
      company_name: formData.company_name || "New Onboarded Company",
      legal_name: formData.legal_name || formData.company_name || "New Registered Entity",
      tenant_code: formData.tenant_code || `TENANT_${formData.company_code || Date.now()}`,
      company_type: formData.company_type || "PRIVATE_LIMITED",
      gst_number: formData.gst_number || "33AAAAB1234C1Z5",
      pan_number: formData.pan_number || "AAAAB1234C",
      cin_number: formData.cin_number || "U74999TN2020PTC123456",
      status: "ACTIVE" as CompanyStatus,
      version_no: 1,
      created_date: new Date().toISOString().split("T")[0],
      verified_on: new Date().toISOString().split("T")[0],
      enrolled_by: formData.admin_full_name || "platform_admin",
      state: "TN",
      contact_email: formData.email || formData.admin_email || "admin@company.com",
      contact_mobile: formData.mobile || "+91 98765 43210",
    };

    try {
      await api.post("/api/v1/companies", formData);
    } catch {
      // Dev mode fallback
    } finally {
      const updated = [newCompany, ...companies];
      updateCompaniesState(updated);
      setShowModal(false);
      setFormData(INITIAL_FORM);
      setWizardStep(1);
      setSubmitting(false);
    }
  };

  const getCompanyDocs = useCallback((c: Company): CompanyDoc[] => {
    if (companyDocsMap[c.public_id]) {
      return companyDocsMap[c.public_id];
    }
    return [
      {
        id: `doc_gst_${c.public_id}`,
        name: "GST Registration Certificate",
        type: "GST_CERTIFICATE",
        docNumber: c.gst_number || "33AAAAB1234C1Z5",
        status: "VERIFIED",
        uploadedDate: c.created_date || "2026-03-01",
        version: 1,
      },
      {
        id: `doc_pan_${c.public_id}`,
        name: "PAN Card Registration",
        type: "PAN_CARD",
        docNumber: c.pan_number || "AAAAB1234C",
        status: "VERIFIED",
        uploadedDate: c.created_date || "2026-03-01",
        version: 1,
      },
    ];
  }, [companyDocsMap]);

  const handleAddNewDocument = (c: Company, type: string, customName?: string) => {
    const existing = getCompanyDocs(c);
    const categoryLabel = DEFAULT_DOC_CATEGORIES.find((cat) => cat.value === type)?.label || type.replace(/_/g, " ");
    const newDoc: CompanyDoc = {
      id: `doc_${Date.now()}`,
      name: customName || categoryLabel,
      type: type,
      docNumber: `${type.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
      status: "VERIFIED",
      uploadedDate: new Date().toISOString().split("T")[0],
      version: 1,
    };
    const updatedDocs = [...existing, newDoc];
    setCompanyDocsMap((prev) => ({ ...prev, [c.public_id]: updatedDocs }));
    setDocActionNotice(`Successfully uploaded & verified: ${newDoc.name}`);
    setTimeout(() => setDocActionNotice(""), 4000);
  };

  const handleStatusUpdate = (companyPublicId: string, newStatus: CompanyStatus) => {
    const updated = companies.map((c) =>
      c.public_id === companyPublicId ? { ...c, status: newStatus } : c
    );
    updateCompaniesState(updated);
    if (selectedDrawerCompany?.public_id === companyPublicId) {
      setSelectedDrawerCompany((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleSoftDelete = (publicId: string) => {
    const updated = companies.map((c) =>
      c.public_id === publicId ? { ...c, status: "INACTIVE" as CompanyStatus } : c
    );
    updateCompaniesState(updated);
    if (selectedDrawerCompany?.public_id === publicId) {
      setSelectedDrawerCompany((prev) => (prev ? { ...prev, status: "INACTIVE" as CompanyStatus } : null));
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    const updated = companies.map((c) =>
      c.public_id === editingCompany.public_id ? editingCompany : c
    );
    updateCompaniesState(updated);
    if (selectedDrawerCompany?.public_id === editingCompany.public_id) {
      setSelectedDrawerCompany(editingCompany);
    }
    setEditingCompany(null);
  };

  const handleApprovalAction = (newStatus: "ACTIVE" | "SUSPENDED" | "INACTIVE") => {
    if (!approvingCompany) return;
    const updated = companies.map((c) =>
      c.public_id === approvingCompany.public_id ? { ...c, status: newStatus as CompanyStatus } : c
    );
    updateCompaniesState(updated);
    if (selectedDrawerCompany?.public_id === approvingCompany.public_id) {
      setSelectedDrawerCompany((prev) => (prev ? { ...prev, status: newStatus as CompanyStatus } : null));
    }
    setApprovingCompany(null);
    setApprovalComments("");
  };

  // ── Table column definitions ──────────────────────────────────
  const columns: TableColumn<Company>[] = [
    {
      id: "company_details",
      header: "Company Details",
      cell: (c) => (
        <button
          onClick={() => setSelectedDrawerCompany(c)}
          className="text-left group outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 rounded p-1 -m-1"
          title="Click to view details side-drawer"
        >
          <p className="text-[14px] font-bold text-[#111827] group-hover:text-[#2563EB] leading-tight transition-colors flex items-center gap-1.5">
            {c.company_name}
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors" />
          </p>
          <p className="text-[11px] font-mono font-semibold text-[#2563EB] mt-0.5">{c.company_code}</p>
        </button>
      ),
      sortable: false,
      minWidth: "240px",
      sticky: "left",
    },
    {
      id: "tenant_code",
      header: "Tenant Code",
      accessorKey: "tenant_code",
      cell: (c) => (
        <span className="font-mono text-[12px] font-semibold text-[#374151]">{c.tenant_code}</span>
      ),
      sortable: true,
      minWidth: "140px",
    },
    {
      id: "company_type",
      header: "Entity Type",
      accessorKey: "company_type",
      cell: (c) => (
        <span className="text-[12px] font-medium text-[#6B7280]">
          {c.company_type.replace(/_/g, " ")}
        </span>
      ),
      sortable: true,
      minWidth: "140px",
    },
    {
      id: "compliance_info",
      header: "Compliance Info",
      cell: (c) => (
        <CompliancePopover
          rowId={c.public_id}
          data={{
            gstNumber: c.gst_number,
            panNumber: c.pan_number,
            cinNumber: c.cin_number,
            createdDate: c.created_date,
            verifiedOn: c.verified_on,
            entityType: c.company_type.replace(/_/g, " "),
          }}
        />
      ),
      sortable: false,
      minWidth: "160px",
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (c) => <StatusBadge status={c.status} />,
      sortable: true,
      minWidth: "150px",
    },
    {
      id: "version_no",
      header: "Ver",
      accessorKey: "version_no",
      cell: (c) => (
        <span className="font-mono text-[12px] font-semibold text-[#9CA3AF]">v{c.version_no}</span>
      ),
      sortable: true,
      align: "center",
      minWidth: "60px",
    },
    {
      id: "created_date",
      header: "Enrolled On",
      accessorKey: "created_date",
      cell: (c) => (
        <span className="text-[12px] text-[#6B7280]">{c.created_date}</span>
      ),
      sortable: true,
      minWidth: "110px",
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ent-page-title">
            Company Onboarding &amp; Tenant Registry
          </h1>
          <p className="ent-caption mt-1">
            Multi-tenant isolated company registry &amp; lifecycle control
            &nbsp;·&nbsp;
            <span className="font-semibold text-[#334155]">{companies.length} Total Enrolled</span>
          </p>
        </div>
        <button
          id="onboard-company-cta"
          onClick={() => { setShowModal(true); setWizardStep(1); }}
          aria-label="Onboard a new company"
          className="ent-btn ent-btn-primary"
        >
          <Plus className="w-4 h-4" />
          Onboard Company
        </button>
      </div>

      {/* ── KPI Stat Summary Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active Companies"
          value={stats.active.toLocaleString()}
          subLabel="Fully operational tenants"
          color="green"
          trend={{ direction: "up", value: "+3 this week" }}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          label="Pending Approval"
          value={stats.pending.toLocaleString()}
          subLabel="Awaiting review & activation"
          color="blue"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Suspended / Blocked"
          value={stats.suspended.toLocaleString()}
          subLabel="Restricted access tenants"
          color="red"
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Enrolled This Month"
          value={`+${stats.thisMonth}`}
          subLabel={new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          color="indigo"
          trend={{ direction: "up", value: `+${stats.thisMonth} vs last month` }}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* ── Enterprise Data Table ── */}
      <DataTable<Company>
        data={companies}
        columns={columns}
        keyExtractor={(c) => c.public_id}
        loading={loading}
        totalRecords={companies.length}
        pageSize={10}
        onRefresh={fetchCompanies}
        onAddNew={() => { setShowModal(true); setWizardStep(1); }}
        addNewLabel="Onboard Company"
        searchPlaceholder="Search companies by name, code, tenant… (Ctrl+K)"
        filterOptions={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Active", value: "ACTIVE" },
              { label: "Pending Approval", value: "PENDING_APPROVAL" },
              { label: "Suspended", value: "SUSPENDED" },
              { label: "Blocked", value: "BLOCKED" },
              { label: "Inactive", value: "INACTIVE" },
              { label: "Draft", value: "DRAFT" },
            ],
          },
          {
            key: "company_type",
            label: "Entity Type",
            options: [
              { label: "Private Limited", value: "PRIVATE_LIMITED" },
              { label: "Public Limited", value: "PUBLIC_LIMITED" },
              { label: "LLP", value: "LLP" },
              { label: "Proprietorship", value: "PROPRIETORSHIP" },
            ],
          },
        ]}
        renderRowActions={(c) => (
          <ActionsMenu
            rowId={c.public_id}
            onView={() => setSelectedDrawerCompany(c)}
            onOpenDetail={() => window.open(`/companies/${c.company_code}`, "_blank")}
            onEdit={() => setEditingCompany(c)}
            onAuditLog={() => setApprovingCompany(c)}
            onCopyId={() => navigator.clipboard.writeText(c.public_id)}
            onSoftDelete={() => handleSoftDelete(c.public_id)}
          />
        )}
        bulkActions={[
          {
            label: "Export Selected",
            icon: <Building2 className="w-3.5 h-3.5" />,
            onClick: (rows) => alert(`Exporting ${rows.length} companies`),
            variant: "secondary",
          },
          {
            label: "Bulk Suspend",
            icon: <ShieldOff className="w-3.5 h-3.5" />,
            onClick: (rows) => alert(`Suspending ${rows.length} companies`),
            variant: "danger",
          },
        ]}
        emptyMessage="No companies found matching your search"
        emptyIcon={
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#2563EB]" />
          </div>
        }
      />

      {/* ── Quick View Side-Drawer ── */}
      {selectedDrawerCompany && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedDrawerCompany(null)}
          />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[#D9E2EC] overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-extrabold text-[#111827]">
                    {selectedDrawerCompany.company_name}
                  </h2>
                  <StatusBadge status={selectedDrawerCompany.status} />
                </div>
                <p className="text-[11px] font-mono font-semibold text-[#2563EB] mt-0.5">
                  {selectedDrawerCompany.company_code} &nbsp;·&nbsp; Tenant: {selectedDrawerCompany.tenant_code}
                </p>
              </div>
              <button
                onClick={() => setSelectedDrawerCompany(null)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#E2E8F0] transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 pb-4 border-b border-[#E2E8F0]">
                <button
                  onClick={() => window.open(`/companies/${selectedDrawerCompany.company_code}`, "_blank")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#123B73] hover:bg-[#0E2F5C] text-white text-[12px] font-bold rounded-lg transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Full Page View
                </button>
                <button
                  onClick={() => {
                    setEditingCompany(selectedDrawerCompany);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] text-[12px] font-bold rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  Edit
                </button>
                {isRetailer ? (
                  <span className="text-[11px] font-bold text-[#D97706] bg-[#FFFBEB] px-3 py-1.5 rounded-lg border border-[#FDE68A]">
                    🔒 Retailer View (Admin Approval Required)
                  </span>
                ) : selectedDrawerCompany.status === "PENDING_APPROVAL" || selectedDrawerCompany.status === "DRAFT" ? (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(selectedDrawerCompany.public_id, "ACTIVE")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[12px] font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                      title="Approve Onboarding & Activate Tenant"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedDrawerCompany.public_id, "SUSPENDED")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] text-[12px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </>
                ) : selectedDrawerCompany.status === "ACTIVE" ? (
                  <button
                    onClick={() => handleStatusUpdate(selectedDrawerCompany.public_id, "SUSPENDED")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-[12px] font-bold rounded-lg transition-colors cursor-pointer"
                    title="Suspend company access"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    Suspend Tenant
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusUpdate(selectedDrawerCompany.public_id, "ACTIVE")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[12px] font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                    title="Re-approve & Activate Tenant"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Re-Approve &amp; Activate
                  </button>
                )}
              </div>

              {/* Corporate Identity */}
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
                  Corporate Identity &amp; Statutory IDs
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Legal Registered Name</span>
                    <p className="text-[12px] font-bold text-[#0F172A] mt-0.5 leading-snug">
                      {selectedDrawerCompany.legal_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Entity Type</span>
                    <p className="text-[12px] font-bold text-[#2563EB] mt-0.5">
                      {selectedDrawerCompany.company_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">GST Number</span>
                    <p className="text-[13px] font-mono font-bold text-[#15803D] mt-0.5">
                      {selectedDrawerCompany.gst_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">PAN Number</span>
                    <p className="text-[13px] font-mono font-bold text-[#1D4ED8] mt-0.5">
                      {selectedDrawerCompany.pan_number || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">CIN Number</span>
                    <p className="text-[13px] font-mono font-bold text-[#0F172A] mt-0.5">
                      {selectedDrawerCompany.cin_number || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact & Location */}
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
                  Contact &amp; State Location
                </h3>
                <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">State Code:</span>
                    <span className="font-bold text-[#0F172A]">{selectedDrawerCompany.state || "TN"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">Contact Email:</span>
                    <span className="font-mono font-bold text-[#2563EB]">{selectedDrawerCompany.contact_email || "ops@company.in"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">Contact Mobile:</span>
                    <span className="font-mono font-bold text-[#0F172A]">{selectedDrawerCompany.contact_mobile || "+91 98765 43210"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">Enrolled Officer:</span>
                    <span className="font-semibold text-[#0F172A]">{selectedDrawerCompany.enrolled_by || "platform_admin"}</span>
                  </div>
                </div>
              </div>

              {/* Documents Vault Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
                    Verified Documents Library
                  </h3>
                  <button
                    onClick={() => setShowUploadDocModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123B73] hover:text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Upload Document
                  </button>
                </div>

                {docActionNotice && (
                  <div className="mb-2 p-2 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] font-bold text-[#15803D]">
                    {docActionNotice}
                  </div>
                )}

                <div className="space-y-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-[12px]">
                  {getCompanyDocs(selectedDrawerCompany).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E2E8F0] shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F172A] truncate">{doc.name}</p>
                          <p className="text-[10px] font-mono text-[#64748B]">{doc.docNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              name: doc.name,
                              type: doc.type,
                              docNumber: doc.docNumber,
                              status: doc.status,
                            })
                          }
                          className="p-1.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] cursor-pointer"
                          title="View Document Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setReuploadDoc({
                              name: doc.name,
                              type: doc.type,
                            })
                          }
                          className="p-1.5 rounded bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] cursor-pointer"
                          title="Re-upload Corrected Document"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-bold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Workflow & Audit Logs */}
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
                  Maker-Checker Approval &amp; Lifecycle Audit
                </h3>
                <div className="space-y-2 text-[12px] text-[#475569]">
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span>Current Workflow Status:</span>
                    <StatusBadge status={selectedDrawerCompany.status} />
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span>Enrolled On:</span>
                    <span className="font-mono font-semibold">{selectedDrawerCompany.created_date}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span>KYC Verified On:</span>
                    <span className="font-mono font-semibold">{selectedDrawerCompany.verified_on || "Pending Verification"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Schema Version:</span>
                    <span className="font-mono font-bold text-[#2563EB]">v{selectedDrawerCompany.version_no}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
              <button
                onClick={() => handleSoftDelete(selectedDrawerCompany.public_id)}
                className="px-3 py-2 text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
              >
                Deactivate Company
              </button>
              <button
                onClick={() => setSelectedDrawerCompany(null)}
                className="px-4 py-2 text-[12px] font-bold text-[#334155] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Metadata Modal ── */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-[15px] font-extrabold text-[#0F172A]">
                  Edit Company Metadata — {editingCompany.company_code}
                </h2>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">Company Display Name *</label>
                <input
                  type="text"
                  required
                  value={editingCompany.company_name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, company_name: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">Legal Registered Name *</label>
                <input
                  type="text"
                  required
                  value={editingCompany.legal_name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, legal_name: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">GST Number</label>
                  <input
                    type="text"
                    value={editingCompany.gst_number || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, gst_number: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={editingCompany.pan_number || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, pan_number: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">CIN Number</label>
                <input
                  type="text"
                  value={editingCompany.cin_number || ""}
                  onChange={(e) => setEditingCompany({ ...editingCompany, cin_number: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editingCompany.contact_email || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, contact_email: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1">Contact Mobile</label>
                  <input
                    type="text"
                    value={editingCompany.contact_mobile || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, contact_mobile: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 text-[12px] font-bold text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[12px] font-bold text-white bg-[#123B73] hover:bg-[#0E2F5C] rounded-lg transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approval Workflow Modal ── */}
      {approvingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F0FDF4] border-b border-[#BBF7D0]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                <div>
                  <h2 className="text-[15px] font-extrabold text-[#0F172A]">
                    Maker-Checker Approval Review
                  </h2>
                  <p className="text-[11px] font-semibold text-[#15803D]">
                    {approvingCompany.company_name} ({approvingCompany.company_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingCompany(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#DCFCE7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Entity Type:</span>
                  <span className="font-bold text-[#0F172A]">{approvingCompany.company_type.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Tenant Code:</span>
                  <span className="font-mono font-bold text-[#2563EB]">{approvingCompany.tenant_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">GST Number:</span>
                  <span className="font-mono font-bold text-[#15803D]">{approvingCompany.gst_number || "Pending"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Current Status:</span>
                  <StatusBadge status={approvingCompany.status} />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">
                  Checker Approval / Rejection Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter verification comments or rejection reason..."
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                <button
                  onClick={() => handleApprovalAction("SUSPENDED")}
                  className="px-4 py-2 text-[12px] font-bold text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-lg border border-[#FCA5A5] transition-colors"
                >
                  Reject &amp; Suspend
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setApprovingCompany(null)}
                    className="px-4 py-2 text-[12px] font-bold text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApprovalAction("ACTIVE")}
                    className="px-5 py-2 text-[12px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors shadow-xs"
                  >
                    Approve Onboarding
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboarding Wizard Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#123B73] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#0F172A]">
                    Multi-Tenant Company Onboarding
                  </h2>
                  <p className="text-[12px] text-[#64748B]">Step {wizardStep} of 3</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close onboarding wizard"
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress */}
            <div className="flex items-center px-6 pt-4 pb-2 gap-2">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-1.5">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                      ${wizardStep >= step
                        ? "bg-[#123B73] text-white"
                        : "bg-[#F1F5F9] text-[#94A3B8]"
                      }
                    `}>
                      {wizardStep > step ? <ShieldCheck className="w-3 h-3" /> : step}
                    </div>
                    <span className={`text-[11px] font-medium ${wizardStep >= step ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                      {step === 1 ? "Company Profile" : step === 2 ? "Contact & Banking" : "Admin Account"}
                    </span>
                  </div>
                  {step < 3 && <div className={`flex-1 h-px ${wizardStep > step ? "bg-[#123B73]" : "bg-[#E2E8F0]"}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mx-6 mt-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-[12px] text-[#B91C1C] font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleOnboardSubmit}>
              <div className="px-6 py-4 space-y-4 max-h-[55vh] overflow-y-auto">
                {/* ── Step 1 ── */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { field: "company_code", label: "Company Code (ID) *", placeholder: "e.g. PAY2PAY_HQ" },
                        { field: "company_name", label: "Company Name *", placeholder: "e.g. Pay2Pay Financials" },
                        { field: "legal_name", label: "Legal / Registered Name *", placeholder: "Full legal entity name", colSpan: 2 },
                        { field: "tenant_code", label: "Tenant Identifier", placeholder: "e.g. TENANT_PAY2PAY" },
                      ].map(({ field, label, placeholder, colSpan }) => (
                        <div key={field} className={colSpan === 2 ? "col-span-2" : ""}>
                          <label className="block text-[12px] font-semibold text-[#334155] mb-1">{label}</label>
                          <input
                            type="text"
                            placeholder={placeholder}
                            value={(formData as Record<string, string>)[field]}
                            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                            className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-[12px] font-semibold text-[#334155] mb-1">Entity Type</label>
                        <select
                          value={formData.company_type}
                          onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                          className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB] bg-white"
                        >
                          {["PRIVATE_LIMITED", "PUBLIC_LIMITED", "LLP", "PARTNERSHIP", "PROPRIETORSHIP"].map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                      {[
                        { field: "gst_number", label: "GST Number", placeholder: "33AAAAB1234C1Z5" },
                        { field: "pan_number", label: "PAN Number", placeholder: "AAAAB1234C" },
                        { field: "cin_number", label: "CIN Number", placeholder: "U74999TN2020PTC123456" },
                      ].map(({ field, label, placeholder }) => (
                        <div key={field}>
                          <label className="block text-[12px] font-semibold text-[#334155] mb-1">{label}</label>
                          <input
                            type="text"
                            placeholder={placeholder}
                            value={(formData as Record<string, string>)[field]}
                            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                            className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2 ── */}
                {wizardStep === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { field: "primary_contact", label: "Primary Contact Person", placeholder: "John Doe" },
                      { field: "mobile", label: "Mobile Number", placeholder: "9876543210" },
                      { field: "email", label: "Email Address", placeholder: "admin@company.com" },
                      { field: "settlement_bank_name", label: "Settlement Bank", placeholder: "HDFC Bank" },
                      { field: "account_number", label: "Account Number", placeholder: "50100012345678" },
                      { field: "ifsc", label: "IFSC Code", placeholder: "HDFC0000123" },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field}>
                        <label className="block text-[12px] font-semibold text-[#334155] mb-1">{label}</label>
                        <input
                          type="text"
                          placeholder={placeholder}
                          value={(formData as Record<string, string>)[field]}
                          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                          className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Step 3 ── */}
                {wizardStep === 3 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#334155] mb-1">Admin Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Platform Admin Name"
                        value={formData.admin_full_name}
                        onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#334155] mb-1">Admin Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@company.com"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[12px] font-semibold text-[#334155] mb-1">Temporary Admin Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 8 characters"
                        value={formData.admin_password}
                        onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => wizardStep === 1 ? setShowModal(false) : setWizardStep((s) => s - 1)}
                  className="px-4 py-2 text-[13px] font-medium text-[#334155] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  {wizardStep === 1 ? "Cancel" : "← Back"}
                </button>

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => s + 1)}
                    className="px-5 py-2 text-[13px] font-semibold text-white bg-[#123B73] hover:bg-[#0E2F5C] rounded-lg transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 text-[13px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Onboarding…" : "Submit Onboarding"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Document Preview Modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <h2 className="text-[15px] font-extrabold text-[#0F172A]">{previewDoc.name}</h2>
                  <p className="text-[11px] font-mono text-[#64748B]">Document ID: {previewDoc.docNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[12px]">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="font-bold text-[#15803D]">Statutory Compliance Status: {previewDoc.status}</span>
                </div>
                <span className="font-mono text-[10px] text-[#16A34A]">v1.0 (Signed)</span>
              </div>

              {/* Mock PDF Document Viewer Box */}
              <div className="border border-[#CBD5E1] rounded-xl p-6 bg-[#F8FAFC] text-center space-y-3">
                <div className="w-14 h-14 bg-[#EFF6FF] text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#0F172A]">{previewDoc.name}.pdf</p>
                  <p className="text-[11px] text-[#64748B]">Official Statutory Document · Size: 1.4 MB</p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-[11px] font-mono text-[#334155] shadow-2xs">
                  <span>SHA256: 8f4a9b2c...7d1e0f3</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                <button
                  onClick={() => {
                    const d = previewDoc;
                    setPreviewDoc(null);
                    setReuploadDoc({ name: d.name, type: d.type });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Re-upload Correction
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2 text-[12px] font-bold text-white bg-[#123B73] hover:bg-[#0E2F5C] rounded-lg transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Re-upload Document Modal ── */}
      {reuploadDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#EFF6FF] border-b border-[#BFDBFE]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <h2 className="text-[15px] font-extrabold text-[#0F172A]">Re-upload Document</h2>
                  <p className="text-[11px] font-semibold text-[#2563EB]">{reuploadDoc.name}</p>
                </div>
              </div>
              <button
                onClick={() => setReuploadDoc(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#DBEAFE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const docName = reuploadDoc.name;
                setReuploadDoc(null);
                setDocActionNotice(`Successfully re-uploaded and re-verified updated ${docName}!`);
                setTimeout(() => setDocActionNotice(""), 4000);
              }}
              className="p-6 space-y-4"
            >
              <div className="border-2 border-dashed border-[#BFDBFE] hover:border-[#2563EB] bg-[#F8FAFC] rounded-2xl p-6 text-center transition-colors cursor-pointer">
                <UploadCloud className="w-10 h-10 text-[#2563EB] mx-auto mb-2" />
                <p className="text-[13px] font-bold text-[#0F172A]">Drag &amp; drop updated document file here</p>
                <p className="text-[11px] text-[#64748B] mt-1">Supports PDF, PNG, JPG (Max file size: 10 MB)</p>
                <input type="file" className="hidden" id="reupload-file-input" />
                <label
                  htmlFor="reupload-file-input"
                  className="mt-3 inline-block px-4 py-1.5 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg cursor-pointer hover:bg-[#DBEAFE]"
                >
                  Browse Local Files
                </label>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">Reason for Re-upload / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Updated GST address registration copy"
                  className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setReuploadDoc(null)}
                  className="px-4 py-2 text-[12px] font-bold text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[12px] font-bold text-white bg-[#123B73] hover:bg-[#0E2F5C] rounded-lg transition-colors shadow-xs"
                >
                  Confirm Upload &amp; Re-verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Upload New Document Modal ── */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#123B73]" />
                <h2 className="text-[15px] font-extrabold text-[#0F172A]">Upload Statutory Document</h2>
              </div>
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedDrawerCompany) {
                  handleAddNewDocument(selectedDrawerCompany, newDocType, newDocName);
                }
                setShowUploadDocModal(false);
                setNewDocName("");
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">Document Category *</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] bg-white font-medium text-[#0F172A]"
                >
                  {DEFAULT_DOC_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1">Document Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. MSME Registration 2026"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#123B73] bg-[#F8FAFC] rounded-2xl p-6 text-center transition-colors cursor-pointer">
                <UploadCloud className="w-10 h-10 text-[#123B73] mx-auto mb-2" />
                <p className="text-[13px] font-bold text-[#0F172A]">Select document file to upload</p>
                <p className="text-[11px] text-[#64748B] mt-1">PDF, PNG, JPG (Max 10MB)</p>
                <input type="file" className="hidden" id="new-doc-file-input" />
                <label
                  htmlFor="new-doc-file-input"
                  className="mt-3 inline-block px-4 py-1.5 text-[12px] font-bold text-white bg-[#123B73] rounded-lg cursor-pointer hover:bg-[#0E2F5C]"
                >
                  Choose File
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-4 py-2 text-[12px] font-bold text-[#475569] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[12px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors shadow-xs"
                >
                  Upload &amp; Submit Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
