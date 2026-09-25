"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/api";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UploadCloud,
  Camera,
  Video,
  Copy,
  ExternalLink,
  MapPin,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Building,
  Check,
  Store,
  Sparkles,
  ArrowRight,
  Pencil,
  RotateCcw,
  X,
  FileImage,
  Maximize2,
  Layers,
  Search,
  HelpCircle,
  FileCheck2,
  Clock,
  ArrowUpRight,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";

// ── File Preview Lightbox Modal (portal-based for true full-screen) ──
function FileLightbox({
  url, name, onClose, mimeType
}: { url: string; name: string; onClose: () => void; mimeType?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(url);
  const isImage = !isPdf && (
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url) ||
    url.startsWith("data:image") ||
    (url.startsWith("blob:") && !!mimeType?.startsWith("image/"))
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        style={{ position: "relative", maxWidth: 960, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E7B631", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>
            {name}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={url} download={name} target="_blank" rel="noopener noreferrer"
              style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", display: "flex", alignItems: "center" }}
              title="Open in new tab">
              <ExternalLink style={{ width: 16, height: 16 }} />
            </a>
            <button onClick={onClose}
              style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(231,182,49,0.3)",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxHeight: "82vh",
        }}>
          {isImage ? (
            <img src={url} alt={name}
              style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", display: "block" }} />
          ) : isPdf ? (
            <iframe src={url} title={name} style={{ width: "100%", height: "80vh", border: "none" }} />
          ) : (
            <div style={{ padding: 40, textAlign: "center" }}>
              <FileImage style={{ width: 64, height: 64, color: "#94003A", margin: "0 auto 16px" }} />
              <p style={{ color: "#1F2937", fontWeight: 600, marginBottom: 16 }}>{name}</p>
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: "#F8E6EE", border: "1px solid #94003A", color: "#94003A", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                <ExternalLink style={{ width: 16, height: 16 }} /> Open File
              </a>
            </div>
          )}
        </div>
        <p style={{ marginTop: 8, fontSize: 11, color: "#94A3B8" }}>Press ESC or click outside to close</p>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

// ── Document Upload Card with Local Preview Thumbnail (Light Maroon + Gold Design) ──
function DocUploadCard({
  label, docFile, previewUrl, uploading, onUpload, accept, hint, icon: Icon, previewLabel
}: {
  label: string;
  docFile: File | null;
  previewUrl: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  hint?: string;
  icon?: React.ElementType;
  previewLabel?: string;
}) {
  const [lightbox, setLightbox] = useState(false);
  const hasPreview = !!previewUrl;
  const mimeType = docFile?.type || "";
  const isImage = hasPreview && (
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(previewUrl) ||
    previewUrl.startsWith("data:image") ||
    mimeType.startsWith("image/")
  );
  return (
    <>
      {lightbox && previewUrl && (
        <FileLightbox url={previewUrl} name={previewLabel || docFile?.name || label} onClose={() => setLightbox(false)} mimeType={mimeType} />
      )}
      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden h-full flex flex-col justify-between ${
        hasPreview
          ? "border-[#86EFAC] bg-[#F0FDF4]"
          : "border-[#D1D5DB] bg-[#FAFAFC] hover:border-[#94003A] hover:bg-[#FDF3F7]"
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch flex-1">
          <div
            className={`relative flex-shrink-0 flex items-center justify-center ${hasPreview ? "cursor-pointer group" : ""}`}
            style={{ width: hasPreview ? 110 : 80, minHeight: 90 }}
            onClick={() => hasPreview && setLightbox(true)}
          >
            {hasPreview ? (
              <>
                {isImage ? (
                  <img src={previewUrl} alt={previewLabel || label}
                    className="w-full h-full object-cover" style={{ minHeight: 90, maxHeight: 120 }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#DCFCE7] px-2" style={{ minHeight: 90 }}>
                    <FileText className="w-6 h-6 text-[#16A34A]" />
                    <span className="text-[9px] text-[#166534] font-bold text-center leading-tight">
                      {docFile?.name?.split(".").pop()?.toUpperCase() || "PDF"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 90 }}>
                {Icon ? <Icon className="w-8 h-8 text-[#94003A]" /> : <UploadCloud className="w-8 h-8 text-[#94003A]" />}
              </div>
            )}
          </div>

          <div className="flex-1 p-3.5 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-[#1F2937] truncate">{label}</span>
              {hasPreview && (
                <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3 text-[#16A34A]" />
                  <span>Ready</span>
                </span>
              )}
            </div>
            {hint && <p className="text-[11px] text-[#6B7280] mb-2.5">{hint}</p>}

            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold transition-all shadow-sm">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploading ? "Analyzing OCR..." : hasPreview ? "Replace File" : "Choose File"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept={accept || "image/*,application/pdf"}
                  onChange={onUpload}
                  disabled={uploading}
                />
              </label>
              {hasPreview && (
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-semibold"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export interface EntityType {
  user_type_ref_id: number;
  user_type_code: string;
  user_type_name: string;
  description: string;
}

export interface SuperDistributorOption {
  public_id: string;
  super_distributor_ref_id?: number;
  super_distributor_code?: string;
  business_name: string;
  owner_name?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  status?: string;
  is_active?: boolean;
}

export interface DistributorOption {
  public_id: string;
  distributor_ref_id?: number;
  distributor_code?: string;
  business_name: string;
  owner_name?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  super_distributor_id?: string;
  super_distributor_name?: string;
  status?: string;
  is_active?: boolean;
}

interface SinglePageOnboardingFormProps {
  initialUserTypeRefId?: number;
  initialMobile?: string;
  initialLinkToken?: string;
}

export function SinglePageOnboardingForm({
  initialUserTypeRefId,
  initialMobile = "",
  initialLinkToken = ""
}: SinglePageOnboardingFormProps) {
  // ── Entity Types State ──
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([
    { user_type_ref_id: 2, user_type_code: "RETAILER", user_type_name: "Retailer", description: "Retail transactions, AEPS, DMT, Bill Payments, QR collections & instant payouts." },
    { user_type_ref_id: 3, user_type_code: "DISTRIBUTOR", user_type_name: "Distributor", description: "Manages retailer network, commercial commissions, business operations & channel liquidity." },
    { user_type_ref_id: 4, user_type_code: "SD", user_type_name: "Super Distributor", description: "Master regional distributor managing multi-district distributor network across territory." },
  ]);
  const [selectedUserTypeRefId, setSelectedUserTypeRefId] = useState<number>(initialUserTypeRefId || 2);
  const [salesLinkContext, setSalesLinkContext] = useState<any>(null);
  const [salesLinkLocked, setSalesLinkLocked] = useState<boolean>(false);

  // ── Hierarchy State (Super Distributor for Dist, Distributor for Retailer) ──
  const [sdsList, setSdsList] = useState<SuperDistributorOption[]>([]);
  const [distributorsList, setDistributorsList] = useState<DistributorOption[]>([]);
  const [selectedSdId, setSelectedSdId] = useState<string>("");
  const [selectedDistId, setSelectedDistId] = useState<string>("");
  const [loadingHierarchy, setLoadingHierarchy] = useState<boolean>(false);
  const [hierarchySearch, setHierarchySearch] = useState<string>("");
  const [hierarchySdFilter, setHierarchySdFilter] = useState<string>("ALL");
  const [hierarchyCityFilter, setHierarchyCityFilter] = useState<string>("ALL");
  const [hierarchyViewMode, setHierarchyViewMode] = useState<"grid" | "list">("grid");
  const [hierarchyPage, setHierarchyPage] = useState<number>(1);
  const [hierarchyPageSize, setHierarchyPageSize] = useState<number>(6);
  const [isChangingHierarchy, setIsChangingHierarchy] = useState<boolean>(false);

  // ── Filter & Search Computations for 50+ SDs and Distributors ──
  const uniqueParentSds = useMemo(() => {
    const sdsSet = new Set<string>();
    distributorsList.forEach((d) => {
      if (d.super_distributor_name) sdsSet.add(d.super_distributor_name);
    });
    return Array.from(sdsSet).sort();
  }, [distributorsList]);

  const uniqueDistCities = useMemo(() => {
    const citiesSet = new Set<string>();
    distributorsList.forEach((d) => {
      if (d.city) citiesSet.add(d.city);
    });
    return Array.from(citiesSet).sort();
  }, [distributorsList]);

  const uniqueSdCities = useMemo(() => {
    const citiesSet = new Set<string>();
    sdsList.forEach((s) => {
      if (s.city) citiesSet.add(s.city);
    });
    return Array.from(citiesSet).sort();
  }, [sdsList]);

  const filteredSds = useMemo(() => {
    return sdsList.filter((sd) => {
      if (hierarchyCityFilter !== "ALL" && sd.city !== hierarchyCityFilter) return false;
      if (!hierarchySearch.trim()) return true;
      const q = hierarchySearch.toLowerCase().trim();
      return (
        (sd.business_name || "").toLowerCase().includes(q) ||
        (sd.super_distributor_code || "").toLowerCase().includes(q) ||
        (sd.owner_name || "").toLowerCase().includes(q) ||
        (sd.city || "").toLowerCase().includes(q) ||
        (sd.state || "").toLowerCase().includes(q) ||
        (sd.mobile || "").includes(q)
      );
    });
  }, [sdsList, hierarchySearch, hierarchyCityFilter]);

  const totalSdPages = Math.max(1, Math.ceil(filteredSds.length / hierarchyPageSize));
  const paginatedSds = useMemo(() => {
    const start = (hierarchyPage - 1) * hierarchyPageSize;
    return filteredSds.slice(start, start + hierarchyPageSize);
  }, [filteredSds, hierarchyPage, hierarchyPageSize]);

  const filteredDistributors = useMemo(() => {
    return distributorsList.filter((dist) => {
      if (hierarchySdFilter !== "ALL" && dist.super_distributor_name !== hierarchySdFilter) return false;
      if (hierarchyCityFilter !== "ALL" && dist.city !== hierarchyCityFilter) return false;
      if (!hierarchySearch.trim()) return true;
      const q = hierarchySearch.toLowerCase().trim();
      return (
        (dist.business_name || "").toLowerCase().includes(q) ||
        (dist.distributor_code || "").toLowerCase().includes(q) ||
        (dist.owner_name || "").toLowerCase().includes(q) ||
        (dist.super_distributor_name || "").toLowerCase().includes(q) ||
        (dist.city || "").toLowerCase().includes(q) ||
        (dist.state || "").toLowerCase().includes(q) ||
        (dist.mobile || "").includes(q)
      );
    });
  }, [distributorsList, hierarchySearch, hierarchySdFilter, hierarchyCityFilter]);

  const totalDistPages = Math.max(1, Math.ceil(filteredDistributors.length / hierarchyPageSize));
  const paginatedDistributors = useMemo(() => {
    const start = (hierarchyPage - 1) * hierarchyPageSize;
    return filteredDistributors.slice(start, start + hierarchyPageSize);
  }, [filteredDistributors, hierarchyPage, hierarchyPageSize]);

  // ── Basic Info (Header) ──
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [registrationId, setRegistrationId] = useState(`REG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);

  // ── 1. Mobile Number ──
  const [mobileNumber, setMobileNumber] = useState(initialMobile);
  const [mobileChecking, setMobileChecking] = useState(false);
  const [mobileConflict, setMobileConflict] = useState<string | null>(null);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileVerifying, setMobileVerifying] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileCountdown, setMobileCountdown] = useState(60);

  // ── 2. Email ──
  const [email, setEmail] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailConflict, setEmailConflict] = useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // ── 3. PAN Card ──
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panFileUrl, setPanFileUrl] = useState("");
  const [panUploading, setPanUploading] = useState(false);
  const [panNumber, setPanNumber] = useState("");
  const [panHolderName, setPanHolderName] = useState("");
  const [panDob, setPanDob] = useState("");
  const [panType, setPanType] = useState("Individual");
  const [panVerifying, setPanVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panError, setPanError] = useState("");
  const [panExtracted, setPanExtracted] = useState(false);

  // ── 4. Aadhaar ──
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarFileUrl, setAadhaarFileUrl] = useState("");
  const [aadhaarUploading, setAadhaarUploading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarRefId, setAadhaarRefId] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarSendingOtp, setAadhaarSendingOtp] = useState(false);
  const [aadhaarVerifying, setAadhaarVerifying] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");
  const [aadhaarHolderName, setAadhaarHolderName] = useState("");
  const [aadhaarMasked, setAadhaarMasked] = useState("");
  const [aadhaarExtracted, setAadhaarExtracted] = useState(false);

  // ── 5. GST (Optional) ──
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstFileUrl, setGstFileUrl] = useState("");
  const [gstUploading, setGstUploading] = useState(false);
  const [gstVerifying, setGstVerifying] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [gstDetails, setGstDetails] = useState<any>(null);
  const [gstError, setGstError] = useState("");
  const [gstExtracted, setGstExtracted] = useState(false);

  // ── 6. Bank Account ──
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [bankFileUrl, setBankFileUrl] = useState("");
  const [bankUploading, setBankUploading] = useState(false);
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountType, setBankAccountType] = useState("SAVINGS");
  const [bankVerifying, setBankVerifying] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [bankError, setBankError] = useState("");
  const [bankExtracted, setBankExtracted] = useState(false);

  // ── 7. Personal Photo + Geo Location ──
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState("");
  const [personalPhotoUploading, setPersonalPhotoUploading] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  // ── 8. Shop Photo ──
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [shopPhotoUploading, setShopPhotoUploading] = useState(false);

  // ── 9. Video KYC ──
  const [videoKycUrl, setVideoKycUrl] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoCountdown, setVideoCountdown] = useState(15);
  const [videoCopied, setVideoCopied] = useState(false);
  const [videoUploadFile, setVideoUploadFile] = useState<File | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  // ── 10. Personal Address ──
  const [personalAddress1, setPersonalAddress1] = useState("");
  const [personalAddress2, setPersonalAddress2] = useState("");
  const [personalState, setPersonalState] = useState("Tamil Nadu");
  const [personalCity, setPersonalCity] = useState("Chennai");
  const [personalDistrict, setPersonalDistrict] = useState("Chennai");
  const [personalPincode, setPersonalPincode] = useState("");
  const [personalCitiesList, setPersonalCitiesList] = useState<string[]>([]);
  const [customPersonalCity, setCustomPersonalCity] = useState(false);

  // ── 11. Shop Address ──
  const [sameAsPersonal, setSameAsPersonal] = useState(false);
  const [shopAddress1, setShopAddress1] = useState("");
  const [shopAddress2, setShopAddress2] = useState("");
  const [shopState, setShopState] = useState("Tamil Nadu");
  const [shopCity, setShopCity] = useState("Chennai");
  const [shopDistrict, setShopDistrict] = useState("Chennai");
  const [shopPincode, setShopPincode] = useState("");
  const [shopCitiesList, setShopCitiesList] = useState<string[]>([]);
  const [customShopCity, setCustomShopCity] = useState(false);

  // ── 12. Shop Category ──
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("General Store / Kirana");

  // ── Reference Data ──
  const [statesList, setStatesList] = useState<string[]>([]);

  // ── Submission State ──
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [formError, setFormError] = useState("");

  // ── Auto-save Draft Status ──
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // ── Local Preview State ──
  const [panLocalPreview, setPanLocalPreview] = useState("");
  const [aadhaarLocalPreview, setAadhaarLocalPreview] = useState("");
  const [gstLocalPreview, setGstLocalPreview] = useState("");
  const [bankLocalPreview, setBankLocalPreview] = useState("");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Entity Types, States, Shop Categories, & Sales Link
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const etRes = await fetch("/api/v1/onboarding/entity-types");
        if (etRes.ok) {
          const etData = await etRes.json();
          if (Array.isArray(etData) && etData.length > 0) setEntityTypes(etData);
        }
      } catch (err) {
        console.warn("Entity types load error:", err);
      }

      try {
        const stRes = await fetch("/api/v1/onboarding/states");
        if (stRes.ok) {
          const stData = await stRes.json();
          if (Array.isArray(stData) && stData.length > 0) setStatesList(stData);
        }
      } catch (err) {
        console.warn("States load error:", err);
      }

      try {
        const catRes = await fetch("/api/v1/onboarding/shop-categories");
        if (catRes.ok) {
          const catData = await catRes.json();
          if (Array.isArray(catData) && catData.length > 0) {
            setCategoriesList(catData);
            if (!catData.includes(selectedCategory)) setSelectedCategory(catData[0]);
          }
        }
      } catch (err) {
        console.warn("Categories load error:", err);
      }

      const linkToken = initialLinkToken || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("link_token") : null);
      if (linkToken) {
        try {
          const slRes = await fetch(`/api/v1/onboarding/sales-link/validate/${linkToken}`);
          if (slRes.ok) {
            const slData = await slRes.json();
            if (slData.valid) {
              setSalesLinkContext(slData);
              setSelectedUserTypeRefId(slData.user_type_ref_id);
              if (slData.mapped_sd_id) setSelectedSdId(slData.mapped_sd_id);
              if (slData.mapped_dist_id) setSelectedDistId(slData.mapped_dist_id);
              setSalesLinkLocked(true);
            }
          }
        } catch (err) {
          console.warn("Sales link validate error:", err);
        }
      }
    }
    loadReferenceData();
  }, [initialLinkToken, initialUserTypeRefId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1b. Load Hierarchy (Super Distributors for Dist, Distributors for Retailer)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function loadHierarchy() {
      setLoadingHierarchy(true);
      setHierarchySearch("");
      try {
        if (selectedUserTypeRefId === 3) {
          let data: SuperDistributorOption[] = [];
          try {
            const res = await apiClient.get("/sales/hierarchy/sds-for-registration");
            data = Array.isArray(res.data) ? res.data : [];
          } catch {
            const fb = await fetch("/api/v1/onboarding/hierarchy/sds");
            if (fb.ok) data = await fb.json();
          }
          if (isMounted) {
            setSdsList(data);
            if (data.length === 1 && !selectedSdId) {
              setSelectedSdId(data[0].public_id);
            }
          }
        } else if (selectedUserTypeRefId === 2) {
          let data: DistributorOption[] = [];
          try {
            const res = await apiClient.get("/sales/hierarchy/distributors-for-registration");
            data = Array.isArray(res.data) ? res.data : [];
          } catch {
            const fb = await fetch("/api/v1/onboarding/hierarchy/distributors");
            if (fb.ok) data = await fb.json();
          }
          if (isMounted) {
            setDistributorsList(data);
            if (data.length === 1 && !selectedDistId) {
              setSelectedDistId(data[0].public_id);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load hierarchy data:", err);
      } finally {
        if (isMounted) setLoadingHierarchy(false);
      }
    }
    loadHierarchy();
    return () => { isMounted = false; };
  }, [selectedUserTypeRefId]);

  // Load cities when state changes
  useEffect(() => {
    async function loadCities(state: string, setFn: (c: string[]) => void) {
      if (!state) return;
      try {
        const res = await fetch(`/api/v1/onboarding/cities?state=${encodeURIComponent(state)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setFn(data);
        }
      } catch (err) {
        console.warn("Cities load error:", err);
      }
    }
    loadCities(personalState, setPersonalCitiesList);
  }, [personalState]);

  useEffect(() => {
    async function loadCities(state: string, setFn: (c: string[]) => void) {
      if (!state) return;
      try {
        const res = await fetch(`/api/v1/onboarding/cities?state=${encodeURIComponent(state)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setFn(data);
        }
      } catch (err) {
        console.warn("Cities load error:", err);
      }
    }
    loadCities(shopState, setShopCitiesList);
  }, [shopState]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-Save Draft to Database
  // ─────────────────────────────────────────────────────────────────────────────
  const autoSaveDraftToDb = useCallback(async () => {
    if (!mobileNumber && !fullName && !shopName) return;
    try {
      const payload = {
        registration_id: registrationId,
        user_type_ref_id: selectedUserTypeRefId,
        mapped_super_distributor_id: selectedSdId || null,
        mapped_distributor_id: selectedDistId || null,
        full_name: fullName,
        shop_name: shopName,
        mobile_number: mobileNumber,
        email: email,
        pan: {
          pan_number: panNumber,
          holder_name: panHolderName,
          dob: panDob,
          pan_type: panType,
          verified: panVerified,
          doc_url: panFileUrl
        },
        aadhaar: {
          aadhaar_number: aadhaarNumber,
          masked: aadhaarMasked,
          holder_name: aadhaarHolderName,
          verified: aadhaarVerified,
          doc_url: aadhaarFileUrl
        },
        gst: isGstRegistered ? {
          gst_number: gstNumber,
          verified: gstVerified,
          details: gstDetails,
          doc_url: gstFileUrl
        } : null,
        bank: {
          account_number: bankAccount,
          ifsc: bankIfsc,
          account_type: bankAccountType,
          verified: bankVerified,
          doc_url: bankFileUrl,
          details: bankDetails
        },
        personal_photo_url: personalPhotoUrl,
        geo_location: geoLocation,
        shop_photo_url: shopPhotoUrl,
        video_kyc_url: videoKycUrl,
        personal_address: {
          address1: personalAddress1,
          address2: personalAddress2,
          state: personalState,
          city: personalCity,
          district: personalDistrict,
          pincode: personalPincode
        },
        shop_address: {
          address1: shopAddress1,
          address2: shopAddress2,
          state: shopState,
          city: shopCity,
          district: shopDistrict,
          pincode: shopPincode
        },
        shop_category: selectedCategory,
        sales_link_token: initialLinkToken || undefined
      };
      const res = await fetch("/api/v1/onboarding/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.warn("Draft auto-save warning:", e);
    }
  }, [
    registrationId, selectedUserTypeRefId, selectedSdId, selectedDistId, fullName, shopName, mobileNumber, email,
    panNumber, panHolderName, panDob, panType, panVerified, panFileUrl,
    aadhaarNumber, aadhaarMasked, aadhaarHolderName, aadhaarVerified, aadhaarFileUrl,
    isGstRegistered, gstNumber, gstVerified, gstDetails, gstFileUrl,
    bankAccount, bankIfsc, bankAccountType, bankVerified, bankFileUrl, bankDetails,
    personalPhotoUrl, geoLocation, shopPhotoUrl, videoKycUrl,
    personalAddress1, personalAddress2, personalState, personalCity, personalDistrict, personalPincode,
    shopAddress1, shopAddress2, shopState, shopCity, shopDistrict, shopPincode,
    selectedCategory, initialLinkToken
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      autoSaveDraftToDb();
    }, 1500);
    return () => clearTimeout(t);
  }, [autoSaveDraftToDb]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Mobile WhatsApp OTP Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendMobileOtp = async () => {
    if (mobileNumber.length !== 10) {
      setMobileConflict("Please enter a valid 10-digit mobile number.");
      return;
    }
    setMobileChecking(true);
    setMobileConflict(null);
    try {
      const checkRes = await fetch(`/api/v1/onboarding/check-mobile/${mobileNumber}`);
      const checkData = await checkRes.json();
      if (!checkRes.ok || checkData.conflict) {
        setMobileConflict(checkData.message || "This mobile number is already registered with another account.");
        setMobileChecking(false);
        return;
      }
      const otpRes = await fetch("/api/v1/onboarding/send-whatsapp-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileNumber, registration_id: registrationId })
      });
      if (otpRes.ok) {
        setMobileOtpSent(true);
        setMobileCountdown(60);
      } else {
        setMobileConflict("Failed to send WhatsApp OTP. Please try again.");
      }
    } catch {
      setMobileConflict("Network error while verifying mobile. Please check connection.");
    } finally {
      setMobileChecking(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length < 4) return;
    setMobileVerifying(true);
    try {
      const res = await fetch("/api/v1/onboarding/verify-whatsapp-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileNumber, otp: mobileOtp, registration_id: registrationId })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setMobileVerified(true);
        setMobileConflict(null);
      } else {
        setMobileConflict(data.message || "Invalid OTP code. Please check WhatsApp message.");
      }
    } catch {
      setMobileConflict("Error verifying OTP.");
    } finally {
      setMobileVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Email OTP Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      setEmailConflict("Please enter a valid email address.");
      return;
    }
    setEmailChecking(true);
    setEmailConflict(null);
    try {
      const checkRes = await fetch(`/api/v1/onboarding/check-email?email=${encodeURIComponent(email)}`);
      const checkData = await checkRes.json();
      if (!checkRes.ok || checkData.conflict) {
        setEmailConflict(checkData.message || "This email address is already registered with another account.");
        setEmailChecking(false);
        return;
      }
      const otpRes = await fetch("/api/v1/onboarding/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, registration_id: registrationId })
      });
      if (otpRes.ok) {
        setEmailOtpSent(true);
      } else {
        setEmailConflict("Failed to send verification code. Please retry.");
      }
    } catch {
      setEmailConflict("Network error sending email verification code.");
    } finally {
      setEmailChecking(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length < 4) return;
    setEmailVerifying(true);
    try {
      const res = await fetch("/api/v1/onboarding/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: emailOtp, registration_id: registrationId })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setEmailVerified(true);
        setEmailConflict(null);
      } else {
        setEmailConflict(data.message || "Invalid verification code.");
      }
    } catch {
      setEmailConflict("Error verifying email code.");
    } finally {
      setEmailVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PAN File Upload & OCR
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPanFile(file);
    setPanLocalPreview(URL.createObjectURL(file));
    setPanUploading(true);
    setPanError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "PAN");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/auto-read-doc", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPanFileUrl(data.doc_url || "");
        if (data.extracted?.pan_number) {
          setPanNumber(data.extracted.pan_number);
          setPanExtracted(true);
        }
        if (data.extracted?.holder_name) {
          setPanHolderName(data.extracted.holder_name);
          if (!fullName) setFullName(data.extracted.holder_name);
        }
        if (data.extracted?.dob) setPanDob(data.extracted.dob);
      } else {
        setPanError(data.detail || "Could not auto-read PAN. Please enter details manually.");
      }
    } catch {
      setPanError("Failed to upload PAN document.");
    } finally {
      setPanUploading(false);
    }
  };

  const handleVerifyPan = async () => {
    if (panNumber.length !== 10) {
      setPanError("Please enter a valid 10-digit PAN number.");
      return;
    }
    setPanVerifying(true);
    setPanError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pan_number: panNumber,
          holder_name: panHolderName,
          registration_id: registrationId
        })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setPanVerified(true);
        if (data.registered_name) setPanHolderName(data.registered_name);
        if (!fullName && data.registered_name) setFullName(data.registered_name);
      } else {
        setPanError(data.message || data.detail || "PAN verification failed via NSDL / Cashfree.");
      }
    } catch {
      setPanError("Network error verifying PAN.");
    } finally {
      setPanVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Aadhaar File Upload, OCR & UIDAI OTP
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAadhaarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarFile(file);
    setAadhaarLocalPreview(URL.createObjectURL(file));
    setAadhaarUploading(true);
    setAadhaarError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "AADHAAR");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/auto-read-doc", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAadhaarFileUrl(data.doc_url || "");
        if (data.extracted?.aadhaar_number) {
          setAadhaarNumber(data.extracted.aadhaar_number);
          setAadhaarExtracted(true);
        }
        if (data.extracted?.holder_name && !fullName) {
          setFullName(data.extracted.holder_name);
        }
      }
    } catch {
      setAadhaarError("Failed to upload Aadhaar card.");
    } finally {
      setAadhaarUploading(false);
    }
  };

  const handleSendAadhaarOtp = async () => {
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      setAadhaarError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setAadhaarSendingOtp(true);
    setAadhaarError("");
    try {
      const res = await fetch("/api/v1/onboarding/send-aadhaar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar_number: cleanAadhaar, registration_id: registrationId })
      });
      const data = await res.json();
      if (res.ok && data.ref_id) {
        setAadhaarRefId(data.ref_id);
        setAadhaarOtpSent(true);
      } else {
        setAadhaarError(data.message || data.detail || "Failed to send UIDAI Aadhaar OTP.");
      }
    } catch {
      setAadhaarError("Network error requesting Aadhaar OTP.");
    } finally {
      setAadhaarSendingOtp(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp || aadhaarOtp.length < 4) return;
    setAadhaarVerifying(true);
    setAadhaarError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-aadhaar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: aadhaarOtp,
          ref_id: aadhaarRefId,
          aadhaar_number: aadhaarNumber.replace(/\D/g, ""),
          registration_id: registrationId
        })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setAadhaarVerified(true);
        setAadhaarHolderName(data.name || "");
        setAadhaarMasked(data.masked_aadhaar || `XXXX XXXX ${aadhaarNumber.slice(-4)}`);
        if (!fullName && data.name) setFullName(data.name);

        // Auto-fill address from Aadhaar eKYC response
        if (data.address) {
          const addr = data.address;
          if (addr.house || addr.street) {
            setPersonalAddress1(`${addr.house || ""} ${addr.street || ""}`.trim());
          }
          if (addr.landmark || addr.locality) {
            setPersonalAddress2(`${addr.landmark || ""} ${addr.locality || ""}`.trim());
          }
          if (addr.state) setPersonalState(addr.state);
          if (addr.district) setPersonalDistrict(addr.district);
          if (addr.city || addr.vtc) setPersonalCity(addr.city || addr.vtc || "Chennai");
          if (addr.pincode) setPersonalPincode(addr.pincode);
        }
      } else {
        setAadhaarError(data.message || data.detail || "Aadhaar OTP verification failed.");
      }
    } catch {
      setAadhaarError("Network error validating Aadhaar OTP.");
    } finally {
      setAadhaarVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GST File Upload & Verification
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGstFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGstFile(file);
    setGstLocalPreview(URL.createObjectURL(file));
    setGstUploading(true);
    setGstError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "GST");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/auto-read-doc", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGstFileUrl(data.doc_url || "");
        if (data.extracted?.gst_number) {
          setGstNumber(data.extracted.gst_number);
          setGstExtracted(true);
        }
        if (data.extracted?.trade_name && !shopName) {
          setShopName(data.extracted.trade_name);
        }
      }
    } catch {
      setGstError("Failed to upload GST certificate.");
    } finally {
      setGstUploading(false);
    }
  };

  const handleVerifyGst = async () => {
    if (gstNumber.length < 15) {
      setGstError("Please enter a valid 15-digit GSTIN.");
      return;
    }
    setGstVerifying(true);
    setGstError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gst_number: gstNumber, registration_id: registrationId })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setGstVerified(true);
        setGstDetails(data);
        if (data.legal_name && !shopName) setShopName(data.legal_name);
      } else {
        setGstError(data.message || data.detail || "GSTIN verification failed.");
      }
    } catch {
      setGstError("Network error checking GSTIN.");
    } finally {
      setGstVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Bank Document Upload & Penny Drop Verification
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBankFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankFile(file);
    setBankLocalPreview(URL.createObjectURL(file));
    setBankUploading(true);
    setBankError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "BANK");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/auto-read-doc", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBankFileUrl(data.doc_url || "");
        if (data.extracted?.account_number) {
          setBankAccount(data.extracted.account_number);
          setBankExtracted(true);
        }
        if (data.extracted?.ifsc) {
          setBankIfsc(data.extracted.ifsc);
          setBankExtracted(true);
        }
      }
    } catch {
      setBankError("Failed to upload Bank document.");
    } finally {
      setBankUploading(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!bankAccount || !bankIfsc) {
      setBankError("Account Number and IFSC Code are mandatory.");
      return;
    }
    setBankVerifying(true);
    setBankError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: bankAccount,
          ifsc: bankIfsc,
          name: fullName || panHolderName || "Merchant",
          registration_id: registrationId
        })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setBankVerified(true);
        setBankDetails(data);
      } else {
        setBankError(data.message || data.detail || "Bank Penny Drop verification failed.");
      }
    } catch {
      setBankError("Network error validating bank account.");
    } finally {
      setBankVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Personal Photo & GPS Capture
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePersonalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonalPhotoUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "PERSONAL_PHOTO");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/upload-photo", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.photo_url) {
        setPersonalPhotoUrl(data.photo_url);
      }
    } catch {
      console.warn("Personal photo upload error");
    } finally {
      setPersonalPhotoUploading(false);
    }
  };

  const captureDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        };
        try {
          const revRes = await fetch(`/api/v1/onboarding/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`);
          if (revRes.ok) {
            const revData = await revRes.json();
            setGeoLocation({
              ...coords,
              address: revData.display_name,
              city: revData.city,
              state: revData.state,
              pincode: revData.pincode
            });
          } else {
            setGeoLocation(coords);
          }
        } catch {
          setGeoLocation(coords);
        } finally {
          setGeoLocating(false);
        }
      },
      (err) => {
        setGeoError(`Location access denied or unavailable: ${err.message}`);
        setGeoLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Shop Photo Upload
  // ─────────────────────────────────────────────────────────────────────────────
  const handleShopPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShopPhotoUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "SHOP_PHOTO");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/upload-photo", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.photo_url) {
        setShopPhotoUrl(data.photo_url);
      }
    } catch {
      console.warn("Shop photo upload error");
    } finally {
      setShopPhotoUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Video KYC File Upload & Recording
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCopyScript = () => {
    const script = `My name is ${fullName || "your name"}, my mobile is ${mobileNumber || "your mobile"}, and I confirm my registration for ${shopName || "your business"} on Pay2Pay.`;
    navigator.clipboard.writeText(script).then(() => {
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 3000);
    });
  };

  const handleCopyVideoUrl = () => {
    if (!videoKycUrl) return;
    navigator.clipboard.writeText(videoKycUrl).then(() => {
      setVideoCopied(true);
      setTimeout(() => setVideoCopied(false), 3000);
    });
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploadFile(file);
    setVideoUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "VIDEO_KYC");
    formData.append("registration_id", registrationId);

    try {
      const res = await fetch("/api/v1/onboarding/upload-video", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.video_url) {
        setVideoKycUrl(data.video_url);
      } else {
        alert(data.detail || "Video upload failed. Please try again.");
      }
    } catch {
      alert("Video upload failed. Please check your connection.");
    } finally {
      setVideoUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 10 & 11. Pincode Dynamic Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePersonalPincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setPersonalPincode(clean);
    if (clean.length === 6) {
      try {
        const res = await fetch(`/api/v1/onboarding/pincode/${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            if (data.state) setPersonalState(data.state);
            if (data.district) setPersonalDistrict(data.district);
            if (data.city) setPersonalCity(data.city);
            if (data.cities && data.cities.length > 0) setPersonalCitiesList(data.cities);
          }
        }
      } catch (e) {
        console.warn("Personal pincode lookup error:", e);
      }
    }
  };

  const handleShopPincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setShopPincode(clean);
    if (clean.length === 6) {
      try {
        const res = await fetch(`/api/v1/onboarding/pincode/${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            if (data.state) setShopState(data.state);
            if (data.district) setShopDistrict(data.district);
            if (data.city) setShopCity(data.city);
            if (data.cities && data.cities.length > 0) setShopCitiesList(data.cities);
          }
        }
      } catch (e) {
        console.warn("Shop pincode lookup error:", e);
      }
    }
  };

  const handleCopyPersonalToShopAddress = () => {
    setSameAsPersonal(true);
    setShopAddress1(personalAddress1);
    setShopAddress2(personalAddress2);
    setShopState(personalState);
    setShopCity(personalCity);
    setShopDistrict(personalDistrict);
    setShopPincode(personalPincode);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Final Submission
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim()) {
      setFormError("Full Name is mandatory.");
      scrollToSection("section_business");
      return;
    }
    if (!shopName.trim()) {
      setFormError("Shop / Business Name is mandatory.");
      scrollToSection("section_business");
      return;
    }
    if (selectedUserTypeRefId === 3 && sdsList.length > 0 && !selectedSdId) {
      setFormError("Please select an authorized Parent Super Distributor (SD) for this Distributor.");
      scrollToSection("section_hierarchy");
      return;
    }
    if (selectedUserTypeRefId === 2 && distributorsList.length > 0 && !selectedDistId) {
      setFormError("Please select an authorized Parent Distributor for this Retailer.");
      scrollToSection("section_hierarchy");
      return;
    }
    if (!mobileVerified) {
      setFormError("Mobile Number WhatsApp OTP verification is mandatory.");
      scrollToSection("section_contact");
      return;
    }
    if (!emailVerified) {
      setFormError("Email Address verification is mandatory.");
      scrollToSection("section_contact");
      return;
    }
    if (!panVerified) {
      setFormError("PAN Card Cashfree verification is mandatory.");
      scrollToSection("section_kyc");
      return;
    }
    if (!aadhaarVerified) {
      setFormError("Aadhaar eKYC verification is mandatory.");
      scrollToSection("section_kyc");
      return;
    }
    if (!bankVerified) {
      setFormError("Bank Account Penny Drop verification is mandatory.");
      scrollToSection("section_bank");
      return;
    }
    if (!personalPhotoUrl) {
      setFormError("Personal Photo is mandatory.");
      scrollToSection("section_media");
      return;
    }
    if (!geoLocation) {
      setFormError("GPS Location capture is mandatory for compliance verification.");
      scrollToSection("section_media");
      return;
    }
    if (!shopPhotoUrl) {
      setFormError("Shop / Commercial Premises Photo is mandatory.");
      scrollToSection("section_shop_photo");
      return;
    }
    if (!personalAddress1.trim() || !personalPincode.trim()) {
      setFormError("Personal Address is mandatory.");
      scrollToSection("section_address");
      return;
    }
    if (!shopAddress1.trim() || !shopPincode.trim()) {
      setFormError("Shop Address is mandatory.");
      scrollToSection("section_address");
      return;
    }

    setSubmitting(true);
    try {
      await autoSaveDraftToDb();

      const res = await fetch("/api/v1/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          user_type_ref_id: selectedUserTypeRefId,
          mapped_super_distributor_id: selectedSdId || undefined,
          mapped_distributor_id: selectedDistId || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setSubmittedResult(data);
      } else {
        setFormError(data.message || data.detail || "Application submission rejected by server.");
      }
    } catch {
      setFormError("Network error while submitting application.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEntity = entityTypes.find((e) => e.user_type_ref_id === selectedUserTypeRefId) || entityTypes[0];

  // ── Smooth Scroll to Section Helper ──
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // ── Calculated Progress Metrics ──
  const verificationChecklist = [
    { id: "section_business", label: "Business Identity", completed: Boolean(fullName.trim() && shopName.trim()), desc: shopName || "Shop & Owner Name" },
    {
      id: "section_hierarchy",
      label: "Hierarchy Mapping",
      completed: selectedUserTypeRefId === 4 ? true : (selectedUserTypeRefId === 3 ? Boolean(selectedSdId || sdsList.length === 0) : Boolean(selectedDistId || distributorsList.length === 0)),
      desc: selectedUserTypeRefId === 4 ? "Direct Master" : (selectedUserTypeRefId === 3 ? (sdsList.find(s => s.public_id === selectedSdId)?.business_name || "Parent SD") : (distributorsList.find(d => d.public_id === selectedDistId)?.business_name || "Parent Dist"))
    },
    { id: "section_contact", label: "Mobile WhatsApp OTP", completed: mobileVerified, desc: mobileVerified ? `+91 ${mobileNumber}` : "Pending OTP" },
    { id: "section_contact", label: "Email Address OTP", completed: emailVerified, desc: emailVerified ? email : "Pending OTP" },
    { id: "section_kyc", label: "PAN Card (Cashfree)", completed: panVerified, desc: panVerified ? panNumber : "Pending OCR/NSDL" },
    { id: "section_kyc", label: "Aadhaar eKYC (UIDAI)", completed: aadhaarVerified, desc: aadhaarVerified ? aadhaarMasked : "Pending OTP" },
    { id: "section_gst", label: "GST Registration", completed: !isGstRegistered || gstVerified, optional: true, desc: isGstRegistered ? (gstVerified ? "GST Verified" : "Pending GST") : "Skipped (Optional)" },
    { id: "section_bank", label: "Bank Account (Penny Drop)", completed: bankVerified, desc: bankVerified ? (bankDetails?.bank_name || "Verified") : "Pending Penny Drop" },
    { id: "section_media", label: "Selfie & GPS Location", completed: Boolean(personalPhotoUrl && geoLocation), desc: geoLocation ? "GPS Coordinates Locked" : "Pending Capture" },
    { id: "section_shop_photo", label: "Commercial Shop Photo", completed: Boolean(shopPhotoUrl), desc: shopPhotoUrl ? "Uploaded to B2" : "Pending Photo" },
    { id: "section_video", label: "Video KYC Statement", completed: Boolean(videoKycUrl), desc: videoKycUrl ? "Recorded / Uploaded" : "Pending Video" },
    { id: "section_address", label: "Personal & Shop Address", completed: Boolean(personalAddress1.trim() && personalPincode.trim() && shopAddress1.trim() && shopPincode.trim()), desc: personalPincode ? `Pincode: ${personalPincode}` : "Pending Address" },
  ];

  const mandatoryItems = verificationChecklist.filter(i => !i.optional);
  const completedCount = mandatoryItems.filter(i => i.completed).length;
  const totalMandatory = mandatoryItems.length;
  const progressPercent = Math.round((completedCount / totalMandatory) * 100);

  // 7 Macro Milestones for Top Header
  const milestones = [
    { id: "section_business", label: "Business", done: Boolean(fullName.trim() && shopName.trim()) },
    { id: "section_contact", label: "Contact", done: mobileVerified && emailVerified },
    { id: "section_kyc", label: "KYC", done: panVerified && aadhaarVerified },
    { id: "section_bank", label: "Bank", done: bankVerified },
    { id: "section_media", label: "Media & GPS", done: Boolean(personalPhotoUrl && geoLocation && shopPhotoUrl) },
    { id: "section_address", label: "Address", done: Boolean(personalAddress1.trim() && shopAddress1.trim()) },
    { id: "section_review", label: "Review", done: completedCount === totalMandatory }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN (Maroon + Gold Light Theme)
  // ─────────────────────────────────────────────────────────────────────────────
  if (submittedResult) {
    return (
      <div className="w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto my-6 p-6 sm:p-12 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] shadow-xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-[#F8E6EE] border-2 border-[#94003A] flex items-center justify-center mx-auto text-[#94003A] shadow-lg shadow-[#94003A]/10">
          <CheckCircle2 className="w-10 h-10 text-[#94003A]" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-xs font-bold border border-[#86EFAC]">
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Application Submitted Successfully</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#94003A] tracking-tight">
            Welcome, {fullName}!
          </h2>
          <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl mx-auto">
            Your single-page onboarding application for{" "}
            <span className="text-[#94003A] font-bold">{selectedEntity.user_type_name}</span> (
            <span className="text-[#B8860B] font-bold">{shopName}</span>) has been safely recorded and queued for Admin Approval.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-left space-y-3.5 max-w-xl mx-auto shadow-sm">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-[#6B7280]">Application Reference</span>
            <span className="font-mono font-bold text-[#94003A]">{submittedResult.application_ref}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-[#6B7280]">Entity Type</span>
            <span className="font-bold text-[#1F2937]">{selectedEntity.user_type_name}</span>
          </div>
          {selectedUserTypeRefId === 3 && selectedSdId && (
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-[#6B7280]">Mapped Super Distributor</span>
              <span className="font-bold text-[#94003A]">
                {sdsList.find((s) => s.public_id === selectedSdId)?.business_name || "Assigned Super Distributor"}
              </span>
            </div>
          )}
          {selectedUserTypeRefId === 2 && selectedDistId && (
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-[#6B7280]">Mapped Distributor</span>
              <span className="font-bold text-[#94003A]">
                {distributorsList.find((d) => d.public_id === selectedDistId)?.business_name || "Assigned Distributor"}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-[#6B7280]">Registered Mobile</span>
            <span className="font-bold text-[#1F2937]">+91 {mobileNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-[#6B7280]">Admin Approval Status</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs border border-[#FCD34D]">
              PENDING APPROVAL
            </span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-[#6B7280]">Estimated Review Time</span>
            <span className="font-bold text-[#166534]">2 to 4 Business Hours</span>
          </div>
        </div>

        <p className="text-xs text-[#6B7280] max-w-xl mx-auto leading-relaxed">
          Our compliance and operations team will review your verified KYC documents. You will receive an instant WhatsApp alert as soon as your console is activated.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-sm shadow-lg shadow-[#94003A]/25 transition-all"
          >
            Go to Portal Login
          </a>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SINGLE-PAGE ONBOARDING FORM (Wide Desktop Layout + Maroon Gold Light Theme)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto my-3 px-2 sm:px-4 space-y-6 text-[#1F2937]">
      {/* ── 1. EXPANDED FULL-WIDTH TOP PROGRESS / MILESTONE TRACKER (Sticky Header) ── */}
      <div
        className="sticky top-2 z-40 p-4 sm:p-5 rounded-3xl text-white shadow-xl backdrop-blur-md transition-all border border-[#78002F]"
        style={{
          background: "linear-gradient(135deg, #94003A 0%, #78002F 100%)",
          boxShadow: "0 12px 30px -8px rgba(148,0,58,0.35)"
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-[#E7B631] text-lg shadow-inner">
              P2P
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#E7B631] text-[#1F2937]">
                  PAY2PAY
                </span>
                <span className="text-xs font-bold text-white/90">
                  Business Onboarding Portal
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-white border border-white/25 text-[10px] font-bold">
                  {selectedEntity.user_type_name}
                </span>
                {salesLinkContext && (
                  <span className="px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/30 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#E7B631]" />
                    <span>Sales Rep: {salesLinkContext.sales_rep_name}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {shopName ? shopName : "New Merchant / Distributor Registration"}
                </h2>
                {lastSaved && (
                  <span className="text-[10px] text-[#E7B631] font-semibold hidden md:inline">
                    ● Draft Saved {lastSaved}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-black text-[#E7B631] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E7B631] animate-pulse" />
                  {progressPercent}% Complete
                </span>
                <span className="text-xs text-white/80 font-semibold">({completedCount}/{totalMandatory} steps)</span>
              </div>
              <div className="w-48 sm:w-64 h-2.5 rounded-full bg-black/25 overflow-hidden mt-1.5 border border-white/20">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, #E7B631, #EDC11E)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Full-Width Milestones Breadcrumbs */}
        <div className="mt-3.5 pt-3.5 border-t border-white/15 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {milestones.map((m, idx) => {
            const isCompleted = m.done;
            const isCurrent = !m.done && milestones.slice(0, idx).every(prev => prev.done);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => scrollToSection(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0 transition-all font-bold text-xs cursor-pointer ${
                  isCompleted
                    ? "bg-white/20 text-white border border-white/30 hover:bg-white/25"
                    : isCurrent
                    ? "bg-[#E7B631] text-[#1F2937] font-black border border-[#EDC11E] shadow-sm"
                    : "bg-white/10 text-white/70 border border-white/10 hover:bg-white/15"
                }`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isCompleted ? "bg-[#16A34A] text-white" : isCurrent ? "bg-[#1F2937] text-[#E7B631]" : "bg-black/25 text-white/80"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. REGISTRATION ENTITY SELECTOR (Spacious Full-Width 3-Column Radio Cards) ── */}
      <div id="section_business" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
            <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#94003A]" />
            </div>
            <span>SELECT REGISTRATION TYPE</span>
          </div>
          <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 1 of 7</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entityTypes.map((et) => {
            const active = et.user_type_ref_id === selectedUserTypeRefId;
            return (
              <div
                key={et.user_type_ref_id}
                onClick={() => {
                  if (!salesLinkLocked) setSelectedUserTypeRefId(et.user_type_ref_id);
                }}
                className={`p-5 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                  active
                    ? "bg-[#FDF3F7] border-[#94003A] text-[#1F2937] shadow-md shadow-[#94003A]/5"
                    : "bg-white border-[#E5E7EB] text-[#1F2937] hover:border-[#94003A]/40 hover:bg-[#FFFBFC]"
                } ${salesLinkLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                      active ? "border-[#94003A] bg-[#94003A] text-white shadow-sm" : "border-[#D1D5DB] bg-white text-transparent"
                    }`}>
                      {active ? "●" : "○"}
                    </div>
                    <span className={`font-black text-base tracking-tight ${active ? "text-[#94003A]" : "text-[#1F2937]"}`}>
                      {et.user_type_name}
                    </span>
                  </div>
                  {active && <CheckCircle2 className="w-5 h-5 text-[#94003A] shrink-0" />}
                </div>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {et.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── 3. PARENT HIERARCHY SELECTOR (Distributor -> SD, Retailer -> Dist) ── */}
        <div id="section_hierarchy">
          {/* ── 3A. SUPER DISTRIBUTOR SELECTION (FOR DISTRIBUTOR ONBOARDING) ── */}
          {selectedUserTypeRefId === 3 && (
            <div className="pt-5 border-t border-[#E5E7EB] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#94003A]" />
                    <label className="text-xs font-black text-[#94003A] uppercase tracking-wider">
                      ASSIGN PARENT SUPER DISTRIBUTOR (SD) *
                    </label>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Select the authorized Super Distributor in your tenant &amp; company whom this distributor will report to.
                  </p>
                </div>
                {sdsList.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#F8E6EE] text-[#94003A] border border-[#94003A]/20 text-xs font-bold self-start sm:self-auto">
                    {sdsList.length} Authorized SD{sdsList.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {loadingHierarchy ? (
                <div className="flex items-center justify-center py-8 px-4 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB]">
                  <Loader2 className="w-5 h-5 text-[#94003A] animate-spin mr-2" />
                  <span className="text-xs text-[#4B5563] font-semibold">Loading authorized Super Distributors...</span>
                </div>
              ) : sdsList.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">No Super Distributors Found in Company Scope</p>
                    <p className="text-[11px] text-[#92400E]/80 mt-0.5">
                      This distributor will be mapped directly to master company hierarchy, or you can register a Super Distributor first.
                    </p>
                  </div>
                </div>
              ) : selectedSdId && !isChangingHierarchy ? (
                /* ── COLLAPSED SELECTED SD PROFILE CARD ── */
                (() => {
                  const selectedSd = sdsList.find((s) => s.public_id === selectedSdId) || sdsList[0];
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FDF3F7] to-[#FFFDF8] border-2 border-[#94003A] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#94003A] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#94003A]/20">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#94003A] text-white text-[10px] font-black uppercase tracking-wider">
                              ASSIGNED SUPER DISTRIBUTOR
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                              Verified SD Partner
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-[#1F2937] mt-1 truncate">
                            {selectedSd?.business_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4B5563] mt-1 font-medium">
                            <span className="font-mono font-bold text-[#94003A] bg-white px-2 py-0.5 rounded border border-[#E5E7EB]">
                              {selectedSd?.super_distributor_code || "P2P-SD"}
                            </span>
                            {selectedSd?.owner_name && <span>👤 {selectedSd.owner_name}</span>}
                            {selectedSd?.mobile && <span>📞 +91 {selectedSd.mobile}</span>}
                            {selectedSd?.city && <span>📍 {selectedSd.city}{selectedSd.state ? `, ${selectedSd.state}` : ""}</span>}
                          </div>
                        </div>
                      </div>
                      {!salesLinkLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingHierarchy(true);
                            setHierarchyPage(1);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FDF3F7] text-[#94003A] border-2 border-[#94003A] font-bold text-xs transition-all shadow-sm shrink-0 self-start md:self-center"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Change SD ({sdsList.length} Available)</span>
                        </button>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* ── EXPANDED SEARCH & PAGINATED GRID / LIST MODE ── */
                <div className="p-4 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5">
                  {/* Filter Toolbar */}
                  <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                      <input
                        type="text"
                        value={hierarchySearch}
                        onChange={(e) => {
                          setHierarchySearch(e.target.value);
                          setHierarchyPage(1);
                        }}
                        placeholder="Search SD by business name, code, owner, city, mobile..."
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-xs sm:text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      />
                      {hierarchySearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setHierarchySearch("");
                            setHierarchyPage(1);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {uniqueSdCities.length > 1 && (
                        <select
                          value={hierarchyCityFilter}
                          onChange={(e) => {
                            setHierarchyCityFilter(e.target.value);
                            setHierarchyPage(1);
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-xs font-semibold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
                        >
                          <option value="ALL">All Cities ({uniqueSdCities.length})</option>
                          {uniqueSdCities.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      )}

                      {/* View Switcher */}
                      <div className="inline-flex rounded-xl border border-[#D1D5DB] bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setHierarchyViewMode("grid")}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                            hierarchyViewMode === "grid" ? "bg-[#94003A] text-white" : "text-[#6B7280] hover:text-[#1F2937]"
                          }`}
                          title="Card Grid View"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHierarchyViewMode("list")}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                            hierarchyViewMode === "list" ? "bg-[#94003A] text-white" : "text-[#6B7280] hover:text-[#1F2937]"
                          }`}
                          title="Compact List View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {selectedSdId && isChangingHierarchy && (
                        <button
                          type="button"
                          onClick={() => setIsChangingHierarchy(false)}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-[#4B5563] hover:text-[#1F2937] text-xs font-bold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results Count Bar */}
                  <div className="flex items-center justify-between text-xs text-[#6B7280] px-1">
                    <span>
                      Showing <strong>{filteredSds.length === 0 ? 0 : (hierarchyPage - 1) * hierarchyPageSize + 1}–{Math.min(hierarchyPage * hierarchyPageSize, filteredSds.length)}</strong> of <strong>{filteredSds.length}</strong> SDs
                      {hierarchySearch && <span className="text-[#94003A] font-semibold ml-1">(Filtered)</span>}
                    </span>
                    {totalSdPages > 1 && (
                      <span className="font-semibold text-[#4B5563]">
                        Page {hierarchyPage} of {totalSdPages}
                      </span>
                    )}
                  </div>

                  {/* Empty state */}
                  {filteredSds.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-white border border-dashed border-[#D1D5DB]">
                      <AlertCircle className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#1F2937]">No Super Distributors matched your search</p>
                      <p className="text-[11px] text-[#6B7280] mt-1">Try adjusting keywords or clearing city filter</p>
                      <button
                        type="button"
                        onClick={() => {
                          setHierarchySearch("");
                          setHierarchyCityFilter("ALL");
                          setHierarchyPage(1);
                        }}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#F8E6EE] text-[#94003A] text-xs font-bold border border-[#94003A]/20"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : hierarchyViewMode === "grid" ? (
                    /* ── GRID MODE ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {paginatedSds.map((sd) => {
                        const isSelected = selectedSdId === sd.public_id;
                        return (
                          <div
                            key={sd.public_id}
                            onClick={() => {
                              setSelectedSdId(sd.public_id);
                              setIsChangingHierarchy(false);
                            }}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left relative ${
                              isSelected
                                ? "bg-[#FDF3F7] border-[#94003A] text-[#1F2937] shadow-sm ring-2 ring-[#94003A]/10"
                                : "bg-white border-[#E5E7EB] text-[#4B5563] hover:border-[#94003A]/40 hover:bg-[#FFFBFC]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#94003A]" : "text-[#6B7280]"}`} />
                                  <h4 className={`font-bold text-xs sm:text-sm truncate ${isSelected ? "text-[#94003A]" : "text-[#1F2937]"}`}>
                                    {sd.business_name}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                                  {sd.super_distributor_code} {sd.owner_name ? `• ${sd.owner_name}` : ""}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] text-[#6B7280]">
                                  {sd.mobile && <span>📞 +91 {sd.mobile}</span>}
                                  {sd.city && <span>📍 {sd.city}{sd.state ? `, ${sd.state}` : ""}</span>}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                                isSelected ? "bg-[#94003A] border-[#94003A] text-white" : "border-[#D1D5DB] bg-white"
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── COMPACT LIST MODE (GREAT FOR 50+ ITEMS) ── */
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white divide-y divide-[#F3F4F6]">
                      {paginatedSds.map((sd) => {
                        const isSelected = selectedSdId === sd.public_id;
                        return (
                          <div
                            key={sd.public_id}
                            onClick={() => {
                              setSelectedSdId(sd.public_id);
                              setIsChangingHierarchy(false);
                            }}
                            className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isSelected ? "bg-[#FDF3F7] text-[#94003A]" : "hover:bg-[#FFFBFC]"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-[#94003A] text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                              }`}>
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs sm:text-sm text-[#1F2937] truncate">{sd.business_name}</span>
                                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                                    {sd.super_distributor_code}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#6B7280] flex flex-wrap gap-2 mt-0.5">
                                  {sd.owner_name && <span>👤 {sd.owner_name}</span>}
                                  {sd.mobile && <span>📞 +91 {sd.mobile}</span>}
                                  {sd.city && <span>📍 {sd.city}</span>}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                isSelected
                                  ? "bg-[#94003A] text-white"
                                  : "bg-white border border-[#D1D5DB] text-[#4B5563] hover:border-[#94003A] hover:text-[#94003A]"
                              }`}
                            >
                              {isSelected ? "✓ Selected" : "Select"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── PAGINATION CONTROLS ── */}
                  {totalSdPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={hierarchyPage <= 1}
                          onClick={() => setHierarchyPage(1)}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={hierarchyPage <= 1}
                          onClick={() => setHierarchyPage((p) => Math.max(1, p - 1))}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalSdPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            if (totalSdPages <= 7) return true;
                            if (pageNum === 1 || pageNum === totalSdPages) return true;
                            return Math.abs(pageNum - hierarchyPage) <= 1;
                          })
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;
                            return (
                              <React.Fragment key={pageNum}>
                                {showEllipsis && <span className="px-1 text-xs text-[#9CA3AF]">...</span>}
                                <button
                                  type="button"
                                  onClick={() => setHierarchyPage(pageNum)}
                                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                                    hierarchyPage === pageNum
                                      ? "bg-[#94003A] text-white shadow-sm"
                                      : "bg-white border border-[#D1D5DB] text-[#4B5563] hover:bg-[#F9FAFB]"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={hierarchyPage >= totalSdPages}
                          onClick={() => setHierarchyPage((p) => Math.min(totalSdPages, p + 1))}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="Next Page"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={hierarchyPage >= totalSdPages}
                          onClick={() => setHierarchyPage(totalSdPages)}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 3B. DISTRIBUTOR SELECTION (FOR RETAILER ONBOARDING) ── */}
          {selectedUserTypeRefId === 2 && (
            <div className="pt-5 border-t border-[#E5E7EB] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#94003A]" />
                    <label className="text-xs font-black text-[#94003A] uppercase tracking-wider">
                      ASSIGN PARENT DISTRIBUTOR *
                    </label>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Select the authorized Distributor in your tenant &amp; company whom this retailer will be mapped under.
                  </p>
                </div>
                {distributorsList.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#F8E6EE] text-[#94003A] border border-[#94003A]/20 text-xs font-bold self-start sm:self-auto">
                    {distributorsList.length} Authorized Distributor{distributorsList.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {loadingHierarchy ? (
                <div className="flex items-center justify-center py-8 px-4 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB]">
                  <Loader2 className="w-5 h-5 text-[#94003A] animate-spin mr-2" />
                  <span className="text-xs text-[#4B5563] font-semibold">Loading authorized Distributors...</span>
                </div>
              ) : distributorsList.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">No Distributors Found in Company Scope</p>
                    <p className="text-[11px] text-[#92400E]/80 mt-0.5">
                      This retailer will be mapped directly to master company hierarchy, or you can register a Distributor first.
                    </p>
                  </div>
                </div>
              ) : selectedDistId && !isChangingHierarchy ? (
                /* ── COLLAPSED SELECTED DISTRIBUTOR PROFILE CARD ── */
                (() => {
                  const selectedDist = distributorsList.find((d) => d.public_id === selectedDistId) || distributorsList[0];
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FDF3F7] to-[#FFFDF8] border-2 border-[#94003A] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#94003A] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#94003A]/20">
                          <Store className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#94003A] text-white text-[10px] font-black uppercase tracking-wider">
                              ASSIGNED PARENT DISTRIBUTOR
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                              Verified Distributor Partner
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-[#1F2937] mt-1 truncate">
                            {selectedDist?.business_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4B5563] mt-1 font-medium">
                            <span className="font-mono font-bold text-[#94003A] bg-white px-2 py-0.5 rounded border border-[#E5E7EB]">
                              {selectedDist?.distributor_code || "P2P-DIST"}
                            </span>
                            {selectedDist?.owner_name && <span>👤 {selectedDist.owner_name}</span>}
                            {selectedDist?.mobile && <span>📞 +91 {selectedDist.mobile}</span>}
                            {selectedDist?.city && <span>📍 {selectedDist.city}{selectedDist.state ? `, ${selectedDist.state}` : ""}</span>}
                          </div>
                          {selectedDist?.super_distributor_name && (
                            <div className="mt-2 text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FCD34D] px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 font-semibold">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Parent SD: <strong>{selectedDist.super_distributor_name}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                      {!salesLinkLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingHierarchy(true);
                            setHierarchyPage(1);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FDF3F7] text-[#94003A] border-2 border-[#94003A] font-bold text-xs transition-all shadow-sm shrink-0 self-start md:self-center"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Change Distributor ({distributorsList.length} Available)</span>
                        </button>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* ── EXPANDED SEARCH & PAGINATED GRID / LIST MODE ── */
                <div className="p-4 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5">
                  {/* Filter Toolbar */}
                  <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                      <input
                        type="text"
                        value={hierarchySearch}
                        onChange={(e) => {
                          setHierarchySearch(e.target.value);
                          setHierarchyPage(1);
                        }}
                        placeholder="Search Distributor by name, code, SD, owner, city, mobile..."
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-xs sm:text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      />
                      {hierarchySearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setHierarchySearch("");
                            setHierarchyPage(1);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Filter by Parent SD */}
                      {uniqueParentSds.length > 1 && (
                        <select
                          value={hierarchySdFilter}
                          onChange={(e) => {
                            setHierarchySdFilter(e.target.value);
                            setHierarchyPage(1);
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-xs font-semibold text-[#1F2937] focus:outline-none focus:border-[#94003A] max-w-[200px] truncate"
                        >
                          <option value="ALL">All Parent SDs ({uniqueParentSds.length})</option>
                          {uniqueParentSds.map((sdName) => (
                            <option key={sdName} value={sdName}>{sdName}</option>
                          ))}
                        </select>
                      )}

                      {/* Filter by City */}
                      {uniqueDistCities.length > 1 && (
                        <select
                          value={hierarchyCityFilter}
                          onChange={(e) => {
                            setHierarchyCityFilter(e.target.value);
                            setHierarchyPage(1);
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-xs font-semibold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
                        >
                          <option value="ALL">All Cities ({uniqueDistCities.length})</option>
                          {uniqueDistCities.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      )}

                      {/* View Switcher */}
                      <div className="inline-flex rounded-xl border border-[#D1D5DB] bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setHierarchyViewMode("grid")}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                            hierarchyViewMode === "grid" ? "bg-[#94003A] text-white" : "text-[#6B7280] hover:text-[#1F2937]"
                          }`}
                          title="Card Grid View"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHierarchyViewMode("list")}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                            hierarchyViewMode === "list" ? "bg-[#94003A] text-white" : "text-[#6B7280] hover:text-[#1F2937]"
                          }`}
                          title="Compact List View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {selectedDistId && isChangingHierarchy && (
                        <button
                          type="button"
                          onClick={() => setIsChangingHierarchy(false)}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-[#4B5563] hover:text-[#1F2937] text-xs font-bold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results Count Bar */}
                  <div className="flex items-center justify-between text-xs text-[#6B7280] px-1">
                    <span>
                      Showing <strong>{filteredDistributors.length === 0 ? 0 : (hierarchyPage - 1) * hierarchyPageSize + 1}–{Math.min(hierarchyPage * hierarchyPageSize, filteredDistributors.length)}</strong> of <strong>{filteredDistributors.length}</strong> Distributors
                      {(hierarchySearch || hierarchySdFilter !== "ALL" || hierarchyCityFilter !== "ALL") && (
                        <span className="text-[#94003A] font-semibold ml-1">(Filtered)</span>
                      )}
                    </span>
                    {totalDistPages > 1 && (
                      <span className="font-semibold text-[#4B5563]">
                        Page {hierarchyPage} of {totalDistPages}
                      </span>
                    )}
                  </div>

                  {/* Empty state */}
                  {filteredDistributors.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-white border border-dashed border-[#D1D5DB]">
                      <AlertCircle className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#1F2937]">No Distributors matched your search or filters</p>
                      <p className="text-[11px] text-[#6B7280] mt-1">Try adjusting keywords or clearing SD / City filters</p>
                      <button
                        type="button"
                        onClick={() => {
                          setHierarchySearch("");
                          setHierarchySdFilter("ALL");
                          setHierarchyCityFilter("ALL");
                          setHierarchyPage(1);
                        }}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#F8E6EE] text-[#94003A] text-xs font-bold border border-[#94003A]/20"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : hierarchyViewMode === "grid" ? (
                    /* ── GRID MODE ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {paginatedDistributors.map((dist) => {
                        const isSelected = selectedDistId === dist.public_id;
                        return (
                          <div
                            key={dist.public_id}
                            onClick={() => {
                              setSelectedDistId(dist.public_id);
                              setIsChangingHierarchy(false);
                            }}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left relative ${
                              isSelected
                                ? "bg-[#FDF3F7] border-[#94003A] text-[#1F2937] shadow-sm ring-2 ring-[#94003A]/10"
                                : "bg-white border-[#E5E7EB] text-[#4B5563] hover:border-[#94003A]/40 hover:bg-[#FFFBFC]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Store className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#94003A]" : "text-[#6B7280]"}`} />
                                  <h4 className={`font-bold text-xs sm:text-sm truncate ${isSelected ? "text-[#94003A]" : "text-[#1F2937]"}`}>
                                    {dist.business_name}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                                  {dist.distributor_code} {dist.owner_name ? `• ${dist.owner_name}` : ""}
                                </p>
                                {dist.super_distributor_name && (
                                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold border border-[#FCD34D] truncate max-w-full">
                                    SD: {dist.super_distributor_name}
                                  </span>
                                )}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] text-[#6B7280]">
                                  {dist.mobile && <span>📞 +91 {dist.mobile}</span>}
                                  {dist.city && <span>📍 {dist.city}{dist.state ? `, ${dist.state}` : ""}</span>}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                                isSelected ? "bg-[#94003A] border-[#94003A] text-white" : "border-[#D1D5DB] bg-white"
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── COMPACT LIST MODE (FAST SCAN FOR 50+ DISTRIBUTORS) ── */
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white divide-y divide-[#F3F4F6]">
                      {paginatedDistributors.map((dist) => {
                        const isSelected = selectedDistId === dist.public_id;
                        return (
                          <div
                            key={dist.public_id}
                            onClick={() => {
                              setSelectedDistId(dist.public_id);
                              setIsChangingHierarchy(false);
                            }}
                            className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isSelected ? "bg-[#FDF3F7] text-[#94003A]" : "hover:bg-[#FFFBFC]"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-[#94003A] text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                              }`}>
                                <Store className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-[#1F2937] truncate">{dist.business_name}</span>
                                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                                    {dist.distributor_code}
                                  </span>
                                  {dist.super_distributor_name && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] font-bold">
                                      SD: {dist.super_distributor_name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#6B7280] flex flex-wrap gap-2 mt-0.5">
                                  {dist.owner_name && <span>👤 {dist.owner_name}</span>}
                                  {dist.mobile && <span>📞 +91 {dist.mobile}</span>}
                                  {dist.city && <span>📍 {dist.city}{dist.state ? `, ${dist.state}` : ""}</span>}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                isSelected
                                  ? "bg-[#94003A] text-white"
                                  : "bg-white border border-[#D1D5DB] text-[#4B5563] hover:border-[#94003A] hover:text-[#94003A]"
                              }`}
                            >
                              {isSelected ? "✓ Selected" : "Select"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── PAGINATION CONTROLS ── */}
                  {totalDistPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={hierarchyPage <= 1}
                          onClick={() => setHierarchyPage(1)}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={hierarchyPage <= 1}
                          onClick={() => setHierarchyPage((p) => Math.max(1, p - 1))}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalDistPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            if (totalDistPages <= 7) return true;
                            if (pageNum === 1 || pageNum === totalDistPages) return true;
                            return Math.abs(pageNum - hierarchyPage) <= 1;
                          })
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;
                            return (
                              <React.Fragment key={pageNum}>
                                {showEllipsis && <span className="px-1 text-xs text-[#9CA3AF]">...</span>}
                                <button
                                  type="button"
                                  onClick={() => setHierarchyPage(pageNum)}
                                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                                    hierarchyPage === pageNum
                                      ? "bg-[#94003A] text-white shadow-sm"
                                      : "bg-white border border-[#D1D5DB] text-[#4B5563] hover:bg-[#F9FAFB]"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={hierarchyPage >= totalDistPages}
                          onClick={() => setHierarchyPage((p) => Math.min(totalDistPages, p + 1))}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="Next Page"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={hierarchyPage >= totalDistPages}
                          onClick={() => setHierarchyPage(totalDistPages)}
                          className="p-2 rounded-lg border border-[#D1D5DB] bg-white text-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 3C. SUPER DISTRIBUTOR DIRECT ASSIGNMENT ── */}
          {selectedUserTypeRefId === 4 && (
            <div className="pt-5 border-t border-[#E5E7EB]">
              <div className="p-4 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/30 text-[#94003A] text-xs sm:text-sm flex items-center gap-3">
                <Building2 className="w-6 h-6 text-[#94003A] shrink-0" />
                <div>
                  <p className="font-bold text-[#94003A]">Direct Enterprise Company Assignment</p>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    Super Distributors are master distribution partners mapped directly to your tenant &amp; company administration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Business & Owner Names (Spacious 2 Columns) ── */}
        <div className="pt-5 border-t border-[#E5E7EB] grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1.5 uppercase tracking-wider">
              Full Name (as per PAN / Aadhaar) *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name as per PAN / Aadhaar"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] font-semibold text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1.5 uppercase tracking-wider">
              Shop / Business Name *
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter shop / business / enterprise name"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] font-semibold text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* ── Main Single-Page Form ── */}
      <form onSubmit={handleFinalSubmit} className="space-y-6">
        {/* ── 4. CONTACT VERIFICATION (Mobile & Email 2-Column Desktop Grid) ── */}
        <div id="section_contact" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>2. CONTACT VERIFICATION (MOBILE &amp; EMAIL) *</span>
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 2 of 7</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mobile Sub-Section */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                    Mobile Number (WhatsApp OTP) *
                  </label>
                  {mobileVerified && (
                    <span className="text-xs font-bold text-[#166534] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Verified ✓</span>
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3.5 top-3 text-xs font-bold text-[#6B7280]">
                      +91
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      disabled={mobileVerified}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] font-mono font-bold text-sm disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                    />
                  </div>

                  {mobileVerified ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileVerified(false);
                        setMobileOtpSent(false);
                        setMobileOtp("");
                        setMobileConflict(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      disabled={mobileChecking || mobileNumber.length !== 10}
                      className="px-4 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#94003A]/20 shrink-0"
                    >
                      {mobileChecking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <span>Send WhatsApp OTP</span>
                      )}
                    </button>
                  )}
                </div>

                {mobileConflict && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <span>{mobileConflict}</span>
                  </div>
                )}
              </div>

              {mobileOtpSent && !mobileVerified && (
                <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#4B5563]">
                    <span className="font-bold text-[#1F2937]">Enter WhatsApp OTP</span>
                    <span className="text-[#6B7280] font-mono">Sent to +91 {mobileNumber}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit OTP"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono text-center font-bold tracking-widest text-base focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyMobileOtp}
                      disabled={mobileVerifying || mobileOtp.length < 4}
                      className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {mobileVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email Sub-Section */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                    Email Address (Activation &amp; Invoices) *
                  </label>
                  {emailVerified && (
                    <span className="text-xs font-bold text-[#166534] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Email Verified ✓</span>
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    disabled={emailVerified}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. merchant@pay2pay.in"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] font-semibold text-sm disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                  />
                  {emailVerified ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailVerified(false);
                        setEmailOtpSent(false);
                        setEmailOtp("");
                        setEmailConflict(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={emailChecking || !email.includes("@")}
                      className="px-4 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#94003A]/20 shrink-0"
                    >
                      {emailChecking ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Send Code</span>}
                    </button>
                  )}
                </div>

                {emailConflict && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <span>{emailConflict}</span>
                  </div>
                )}
              </div>

              {emailOtpSent && !emailVerified && (
                <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#4B5563]">
                    <span className="font-bold text-[#1F2937]">Enter Verification Code</span>
                    <span className="text-[#6B7280] font-mono">Sent to {email}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit Code"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono text-center font-bold tracking-widest text-base focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmailOtp}
                      disabled={emailVerifying || emailOtp.length < 4}
                      className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {emailVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 5. KYC VERIFICATION (PAN & AADHAAR Side-by-Side on Desktop) ── */}
        <div id="section_kyc" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>3. KYC COMPLIANCE (PAN &amp; AADHAAR eKYC) *</span>
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 3 of 7</span>
          </div>

          {/* PAN Section (2-Column Desktop Grid) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#94003A] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>PAN CARD (NSDL / CASHFREE) *</span>
              </span>
              {panVerified ? (
                <span className="text-xs font-bold text-[#166534] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>PAN Verified ✓</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-[#92400E] flex items-center gap-1 bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FCD34D]">
                  <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Status: Verification Pending</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <DocUploadCard
                  label="Upload PAN Card Document"
                  docFile={panFile}
                  previewUrl={panLocalPreview || panFileUrl}
                  uploading={panUploading}
                  onUpload={handlePanFileUpload}
                  accept="image/*,application/pdf"
                  hint="JPG, PNG, PDF · OCR extracts PAN number and Holder Name"
                  icon={CreditCard}
                  previewLabel="PAN Card"
                />
              </div>

              <div className="lg:col-span-7 p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">PAN Number *</label>
                      {panExtracted && <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">✓ Extracted</span>}
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      value={panNumber}
                      disabled={panVerified}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Name as per PAN</label>
                      {panExtracted && <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">✓ Extracted</span>}
                    </div>
                    <input
                      type="text"
                      value={panHolderName}
                      disabled={panVerified}
                      onChange={(e) => setPanHolderName(e.target.value)}
                      placeholder="Auto-read or enter name"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                  {!panVerified ? (
                    <button
                      type="button"
                      onClick={handleVerifyPan}
                      disabled={panVerifying || panNumber.length !== 10}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#94003A]/20"
                    >
                      {panVerifying ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                      <span>Verify PAN with NSDL</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full py-2 px-3 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] font-bold text-xs">
                      <span>✓ NSDL Active &amp; Verified</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPanVerified(false);
                          setPanError("");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 text-xs font-bold cursor-pointer shadow-sm"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {panError && (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>{panError}</span>
              </div>
            )}
          </div>

          {/* Aadhaar Section (2-Column Desktop Grid) */}
          <div className="space-y-4 pt-5 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#94003A] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>AADHAAR eKYC (UIDAI AUTH) *</span>
              </span>
              {aadhaarVerified ? (
                <span className="text-xs font-bold text-[#166534] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Aadhaar Verified ✓</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-[#92400E] flex items-center gap-1 bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FCD34D]">
                  <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Status: eKYC Pending</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <DocUploadCard
                  label="Upload Aadhaar Card (Front / Back / PDF)"
                  docFile={aadhaarFile}
                  previewUrl={aadhaarLocalPreview || aadhaarFileUrl}
                  uploading={aadhaarUploading}
                  onUpload={handleAadhaarFileUpload}
                  accept="image/*,application/pdf"
                  hint="OCR extracts 12-digit Aadhaar number automatically"
                  icon={ShieldCheck}
                  previewLabel="Aadhaar Card"
                />
              </div>

              <div className="lg:col-span-7 p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">12-digit Aadhaar Number *</label>
                    {aadhaarExtracted && <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">✓ Extracted</span>}
                  </div>
                  <input
                    type="text"
                    maxLength={14}
                    value={aadhaarNumber}
                    disabled={aadhaarVerified}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="1234 5678 9012"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                  />
                </div>

                <div className="pt-2 border-t border-[#E5E7EB]">
                  {!aadhaarVerified ? (
                    <button
                      type="button"
                      onClick={handleSendAadhaarOtp}
                      disabled={aadhaarSendingOtp || aadhaarNumber.replace(/\D/g, "").length !== 12}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#94003A]/20"
                    >
                      {aadhaarSendingOtp ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Send Aadhaar UIDAI OTP</span>}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full py-2 px-3 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] font-bold text-xs">
                      <span>✓ UIDAI Auth Successful</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAadhaarVerified(false);
                          setAadhaarOtpSent(false);
                          setAadhaarOtp("");
                          setAadhaarError("");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 text-xs font-bold cursor-pointer shadow-sm"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {aadhaarOtpSent && !aadhaarVerified && (
                  <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-2.5">
                    <span className="text-xs font-bold text-[#4B5563]">
                      Enter UIDAI Aadhaar eKYC OTP sent to registered mobile
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={aadhaarOtp}
                        onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="6-digit OTP"
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono text-center font-bold tracking-widest text-base focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyAadhaarOtp}
                        disabled={aadhaarVerifying || aadhaarOtp.length < 4}
                        className="px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {aadhaarVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Verify Aadhaar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {aadhaarError && (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>{aadhaarError}</span>
              </div>
            )}

            {aadhaarVerified && (
              <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#86EFAC] text-xs text-[#166534] font-semibold space-y-1">
                <p>✓ Aadhaar eKYC Verified via Cashfree API.</p>
                <p className="text-xs text-[#4B5563]">
                  Holder: <strong>{aadhaarHolderName}</strong> · Masked UID: {aadhaarMasked}
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  Personal Residential Address has been automatically auto-filled from Aadhaar records below.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 6. GST SECTION (Compact & Optional) ── */}
        <div id="section_gst" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <Building className="w-4 h-4 text-[#94003A]" />
              </div>
              <span className="text-xs sm:text-sm font-black text-[#94003A] uppercase tracking-wider">GST REGISTRATION</span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#FAFAFC] text-[#6B7280] border border-[#D1D5DB] text-[10px] font-bold">
                OPTIONAL
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#4B5563]">GST Registered?</span>
              <div className="flex rounded-xl bg-[#FAFAFC] p-1 border border-[#D1D5DB]">
                <button
                  type="button"
                  onClick={() => setIsGstRegistered(false)}
                  className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    !isGstRegistered ? "bg-[#94003A] text-white shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setIsGstRegistered(true)}
                  className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    isGstRegistered ? "bg-[#94003A] text-white shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>

          {!isGstRegistered ? (
            <p className="text-xs text-[#6B7280]">
              Not registered for GST. You can proceed with onboarding without GST.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-2">
              <div className="lg:col-span-5">
                <DocUploadCard
                  label="Upload GST Certificate (REG-06)"
                  docFile={gstFile}
                  previewUrl={gstLocalPreview || gstFileUrl}
                  uploading={gstUploading}
                  onUpload={handleGstFileUpload}
                  accept="image/*,application/pdf"
                  hint="OCR auto-reads 15-digit GSTIN and Trade Name"
                  icon={FileText}
                  previewLabel="GST Certificate"
                />
              </div>

              <div className="lg:col-span-7 p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">15-digit GSTIN</label>
                    {gstExtracted && <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">✓ Extracted</span>}
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstNumber}
                    disabled={gstVerified}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="33ABCDE1234F1Z5"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                  />
                </div>

                <div className="pt-2 border-t border-[#E5E7EB]">
                  {!gstVerified ? (
                    <button
                      type="button"
                      onClick={handleVerifyGst}
                      disabled={gstVerifying || gstNumber.length < 15}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#94003A]/20"
                    >
                      {gstVerifying ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Verify GSTIN</span>}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full py-2 px-3 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] font-bold text-xs">
                      <span>✓ GST Verified</span>
                      <button
                        type="button"
                        onClick={() => {
                          setGstVerified(false);
                          setGstDetails(null);
                          setGstError("");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 text-xs font-bold cursor-pointer shadow-sm"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {gstError && (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <span>{gstError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 7. BANK ACCOUNT & PENNY DROP VERIFICATION (Wide Desktop Layout) ── */}
        <div id="section_bank" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>4. BANK ACCOUNT &amp; PENNY DROP VERIFICATION *</span>
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 4 of 7</span>
          </div>

          {/* Guidance Banner */}
          <div className="p-4 rounded-2xl bg-[#DBEAFE] border border-[#93C5FD] text-[#1E40AF] text-xs sm:text-sm flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-[#2563EB] shrink-0" />
            <p className="leading-relaxed">
              <strong>Upload any one acceptable document:</strong> Cancelled Cheque · Bank Passbook Front Page · Recent Bank Statement (must clearly show Account No. &amp; IFSC).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5">
              <DocUploadCard
                label="Upload Cancelled Cheque / Passbook / Statement"
                docFile={bankFile}
                previewUrl={bankLocalPreview || bankFileUrl}
                uploading={bankUploading}
                onUpload={handleBankFileUpload}
                accept="image/*,application/pdf"
                hint="OCR automatically extracts Account Number and IFSC Code"
                icon={Building}
                previewLabel="Bank Document"
              />
            </div>

            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Account Number *</label>
                    {bankExtracted && <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">✓ Extracted</span>}
                  </div>
                  <input
                    type="text"
                    value={bankAccount}
                    disabled={bankVerified}
                    onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
                    placeholder="50100012345678"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">IFSC Code *</label>
                    {bankExtracted && <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">✓ Extracted</span>}
                  </div>
                  <input
                    type="text"
                    maxLength={11}
                    value={bankIfsc}
                    disabled={bankVerified}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE] disabled:bg-[#F3F4F6] disabled:text-[#6B7280]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB]">
                {!bankVerified ? (
                  <button
                    type="button"
                    onClick={handleVerifyBank}
                    disabled={bankVerifying || !bankAccount || !bankIfsc}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#94003A]/20"
                  >
                    {bankVerifying ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Verify Account with Penny Drop</span>}
                  </button>
                ) : (
                  <div className="flex items-center justify-between w-full py-2 px-3 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] font-bold text-xs">
                    <span>✓ Penny Drop Confirmed</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBankVerified(false);
                        setBankDetails(null);
                        setBankError("");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 text-xs font-bold cursor-pointer shadow-sm"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {bankDetails && (
            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#86EFAC] text-xs text-[#166534] font-semibold space-y-1">
              <p>✓ Penny Drop Verification Confirmed via Cashfree.</p>
              <p className="text-xs text-[#4B5563]">
                Bank: <strong>{bankDetails.bank_name}</strong> · Branch: {bankDetails.branch}
              </p>
              <p className="text-xs text-[#4B5563]">
                Beneficiary Name at Bank: <strong>{bankDetails.name_at_bank}</strong>
              </p>
            </div>
          )}

          {bankError && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{bankError}</span>
            </div>
          )}
        </div>

        {/* ── 8. PERSONAL PHOTO & GPS LOCATION (2-Column Desktop Grid) ── */}
        <div id="section_media" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <Camera className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>5. PERSONAL PHOTO &amp; GPS LOCATION *</span>
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 5 of 7</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selfie Photo */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Personal Photo (Selfie) *</span>
                <p className="text-xs text-[#6B7280] mt-1 mb-3">Clear face photo for automated facial match &amp; fraud prevention.</p>
                <div className="flex items-center gap-4">
                  {personalPhotoUrl ? (
                    <img
                      src={personalPhotoUrl}
                      alt="Selfie"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#16A34A] shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF]">
                      <User className="w-9 h-9" />
                    </div>
                  )}
                  <div>
                    <label className="px-4 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-2 transition-all shadow-md shadow-[#94003A]/20">
                      <Camera className="w-4 h-4 text-white" />
                      <span>{personalPhotoUploading ? "Uploading..." : personalPhotoUrl ? "Change Photo" : "Upload / Capture Selfie"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handlePersonalPhotoUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* GPS Location */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Device GPS Location *</span>
                <p className="text-xs text-[#6B7280] mt-1 mb-3">
                  Location permission is required to capture the physical registration territory for compliance.
                </p>
                {geoLocation ? (
                  <div className="text-xs text-[#166534] space-y-1.5 bg-[#F0FDF4] p-4 rounded-xl border border-[#86EFAC]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#16A34A] font-bold">
                        <MapPin className="w-4 h-4" />
                        <span>✓ GPS Location Captured</span>
                      </div>
                      <button
                        type="button"
                        onClick={captureDeviceLocation}
                        disabled={geoLocating}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#F3F4F6] text-[#94003A] border border-[#94003A]/30 text-xs font-bold cursor-pointer shadow-sm"
                      >
                        <RotateCcw className={`w-3 h-3 ${geoLocating ? "animate-spin" : ""}`} />
                        <span>Re-capture</span>
                      </button>
                    </div>
                    <p className="font-mono text-xs text-[#1F2937]">
                      Lat: {geoLocation.latitude.toFixed(6)}, Lng: {geoLocation.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {geoLocation.address || "Operational territory validated"}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={captureDeviceLocation}
                    disabled={geoLocating}
                    className="w-full py-3 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    {geoLocating ? <Loader2 className="w-4 h-4 animate-spin text-[#94003A]" /> : <MapPin className="w-4 h-4 text-[#94003A]" />}
                    <span>Allow &amp; Capture GPS Location</span>
                  </button>
                )}
                {geoError && <p className="text-xs text-[#DC2626] font-medium mt-2">{geoError}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── 9. SHOP PHOTO & VIDEO KYC (2-Column Desktop Grid) ── */}
        <div id="section_shop_photo" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <Store className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>6. SHOP PHOTO &amp; VIDEO KYC STATEMENT *</span>
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 6 of 7</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shop Photo */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Commercial Storefront Photo *</span>
                  {shopPhotoUrl && (
                    <span className="text-xs font-bold text-[#166534] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Uploaded to B2 ✓</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] mb-3">Clear photo of commercial establishment premises or signboard.</p>

                <div className="flex items-center gap-4">
                  {shopPhotoUrl ? (
                    <img
                      src={shopPhotoUrl}
                      alt="Shop"
                      className="w-24 h-20 rounded-2xl object-cover border-2 border-[#16A34A] shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-20 rounded-2xl bg-white border border-[#D1D5DB] flex items-center justify-center text-[#9CA3AF]">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <label className="px-4 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-2 transition-all shadow-md shadow-[#94003A]/20">
                      <UploadCloud className="w-4 h-4 text-white" />
                      <span>{shopPhotoUploading ? "Uploading to B2..." : shopPhotoUrl ? "Change Photo" : "Select Shop Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleShopPhotoUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Video KYC */}
            <div id="section_video" className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-[#94003A]" />
                    <span>Video KYC Statement *</span>
                  </span>
                  {videoKycUrl ? (
                    <span className="text-xs font-bold text-[#166534] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Video KYC Completed ✓</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FCD34D]">
                      Status: Pending Video
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[#94003A] font-medium leading-relaxed select-text flex-1">
                      <strong>Statement Script:</strong> &quot;My name is <span className="text-[#1F2937] font-bold">{fullName || "your name"}</span>, my mobile is <span className="text-[#1F2937] font-bold">{mobileNumber || "your mobile"}</span>, and I confirm my registration for <span className="text-[#1F2937] font-bold">{shopName || "your business"}</span> on Pay2Pay.&quot;
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#94003A] text-xs font-bold transition-all shadow-sm"
                    >
                      <Copy className="w-3 h-3 text-[#94003A]" />
                      <span>{scriptCopied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                  videoUploadFile
                    ? "border-[#86EFAC] bg-[#F0FDF4]"
                    : "border-dashed border-[#D1D5DB] bg-white hover:border-[#94003A] hover:bg-[#FDF3F7] cursor-pointer"
                }`}>
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-[#F8E6EE] border border-[#94003A]/20 flex items-center justify-center">
                    {videoUploading ? (
                      <Loader2 className="w-5 h-5 text-[#94003A] animate-spin" />
                    ) : videoUploadFile ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    ) : (
                      <UploadCloud className="w-5 h-5 text-[#94003A]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1F2937] truncate">
                      {videoUploadFile ? videoUploadFile.name : "Select or drop video statement file"}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {videoUploadFile
                        ? `${(videoUploadFile.size / 1024 / 1024).toFixed(1)} MB · ${videoUploadFile.type}`
                        : "MP4, MOV, WEBM, AVI — max 100MB"}
                    </p>
                  </div>
                  <span className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black ${
                    videoUploadFile
                      ? "bg-[#DCFCE7] border border-[#86EFAC] text-[#166534]"
                      : "bg-[#94003A] text-white shadow-sm"
                  }`}>
                    {videoUploading ? "Uploading..." : videoUploadFile ? "Replace" : "Browse"}
                  </span>
                  <input
                    type="file"
                    accept="video/*,video/mp4,video/quicktime,video/webm,video/x-msvideo"
                    className="hidden"
                    onChange={handleVideoFileUpload}
                    disabled={videoUploading}
                  />
                </label>

                {videoKycUrl && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={handleCopyVideoUrl}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#94003A]" />
                      <span>{videoCopied ? "Link Copied ✓" : "Copy Video Link"}</span>
                    </button>
                    <span className="text-[10px] text-[#6B7280] font-mono break-all">
                      {videoKycUrl}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 10. ADDRESS & SHOP CATEGORY (Side-by-Side 2-Column Desktop Grid) ── */}
        <div id="section_address" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E5E7EB] text-[#1F2937] space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-extrabold text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>7. PERSONAL &amp; SHOP PHYSICAL ADDRESS *</span>
            </div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Step 7 of 7</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Personal Address Card */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-black text-[#94003A] uppercase tracking-wider">
                    PERSONAL RESIDENTIAL ADDRESS *
                  </label>
                  {aadhaarVerified && (
                    <span className="text-xs text-[#166534] font-bold flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#86EFAC]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Auto-filled from Aadhaar</span>
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={personalAddress1}
                      onChange={(e) => setPersonalAddress1(e.target.value)}
                      placeholder="Address Line 1 (House No, Street, Building) *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={personalAddress2}
                      onChange={(e) => setPersonalAddress2(e.target.value)}
                      placeholder="Address Line 2 (Area, Landmark)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        value={personalPincode}
                        onChange={(e) => handlePersonalPincodeChange(e.target.value)}
                        placeholder="Pincode (6 digits) *"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={personalState}
                        onChange={(e) => setPersonalState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      >
                        {statesList.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {personalCitiesList.length > 0 && !customPersonalCity ? (
                        <select
                          value={personalCity}
                          onChange={(e) => setPersonalCity(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                        >
                          {personalCitiesList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={personalCity}
                          onChange={(e) => setPersonalCity(e.target.value)}
                          placeholder="Enter City name *"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                        />
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={personalDistrict}
                        onChange={(e) => setPersonalDistrict(e.target.value)}
                        placeholder="District"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Address Card */}
            <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-black text-[#94003A] uppercase tracking-wider">
                    SHOP / COMMERCIAL PREMISES ADDRESS *
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPersonalToShopAddress}
                    className="px-3 py-1 rounded-lg bg-[#F8E6EE] hover:bg-[#F3D7E3] border border-[#94003A]/20 text-xs font-bold text-[#94003A] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Same as Personal Address</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={shopAddress1}
                      onChange={(e) => setShopAddress1(e.target.value)}
                      placeholder="Shop Address Line 1 (Shop No, Building, Commercial Street) *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={shopAddress2}
                      onChange={(e) => setShopAddress2(e.target.value)}
                      placeholder="Shop Address Line 2 (Market, Area, Landmark)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        value={shopPincode}
                        onChange={(e) => handleShopPincodeChange(e.target.value)}
                        placeholder="Shop Pincode (6 digits) *"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-mono font-bold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={shopState}
                        onChange={(e) => setShopState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      >
                        {statesList.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {shopCitiesList.length > 0 && !customShopCity ? (
                        <select
                          value={shopCity}
                          onChange={(e) => setShopCity(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                        >
                          {shopCitiesList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={shopCity}
                          onChange={(e) => setShopCity(e.target.value)}
                          placeholder="Enter Shop City *"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                        />
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={shopDistrict}
                        onChange={(e) => setShopDistrict(e.target.value)}
                        placeholder="Shop District"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Category */}
          <div className="space-y-2 pt-4 border-t border-[#E5E7EB]">
            <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider">
              Shop / Business Category *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#D1D5DB] text-[#1F2937] font-semibold text-sm focus:outline-none focus:border-[#94003A] focus:ring-4 focus:ring-[#F8E6EE]"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 11. FINAL REVIEW & APPLICATION READINESS CHECKLIST (Wide Multi-Column Grid) ── */}
        <div id="section_review" className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#94003A]/20 text-[#1F2937] space-y-5 shadow-lg shadow-[#94003A]/5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 text-[#94003A] font-black text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-[#F8E6EE] flex items-center justify-center">
                <FileCheck2 className="w-4 h-4 text-[#94003A]" />
              </div>
              <span>APPLICATION READINESS &amp; COMPLIANCE REVIEW</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-[#166534] bg-[#DCFCE7] px-3 py-1 rounded-full border border-[#86EFAC]">
              {completedCount} of {totalMandatory} Sections Complete
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
            Review your verification checklist below before final submission. All mandatory documents are processed with automated OCR and verified directly against government databases.
          </p>

          {/* Checklist Grid (Spacious 4-Column Grid on Wide Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {verificationChecklist.map((item, idx) => (
              <div
                key={idx}
                onClick={() => scrollToSection(item.id)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  item.completed
                    ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7]"
                    : item.optional
                    ? "bg-[#FAFAFC] border-[#E5E7EB] text-[#6B7280]"
                    : "bg-[#FFFBEB] border-[#FCD34D] text-[#92400E] hover:bg-[#FEF3C7]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  ) : item.optional ? (
                    <HelpCircle className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-[#1F2937]">{item.label}</p>
                    <p className="text-[10px] text-[#6B7280] truncate">{item.desc}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
              </div>
            ))}
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Submit Action (Gold Action Button) */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer"
              style={{
                background: completedCount === totalMandatory
                  ? "linear-gradient(135deg, #94003A 0%, #78002F 100%)"
                  : "linear-gradient(135deg, #E7B631 0%, #D3A51F 100%)",
                color: completedCount === totalMandatory ? "#FFFFFF" : "#1F2937",
                boxShadow: completedCount === totalMandatory ? "0 10px 25px -5px rgba(148,0,58,0.3)" : "0 10px 25px -5px rgba(231,182,49,0.3)"
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Re-verifying &amp; Submitting Application...</span>
                </>
              ) : (
                <>
                  <span>Submit {selectedEntity.user_type_name} Application</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-[#6B7280] mt-3">
              By submitting, you declare that all uploaded identity, address, and banking credentials are authentic and comply with NPCI, UIDAI &amp; RBI regulatory frameworks.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
