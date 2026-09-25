"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UploadCloud,
  Camera,
  Video,
  Play,
  Square,
  Copy,
  ExternalLink,
  MapPin,
  RefreshCw,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Building,
  Check,
  Eye,
  Store,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Info
} from "lucide-react";

interface EntityType {
  user_type_ref_id: number;
  user_type_code: string;
  user_type_name: string;
  description: string;
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
    { user_type_ref_id: 2, user_type_code: "RETAILER", user_type_name: "Retailer", description: "Direct merchant point-of-sale and financial terminal operations." },
    { user_type_ref_id: 3, user_type_code: "DISTRIBUTOR", user_type_name: "Distributor", description: "Regional merchant distributor managing mapped retailer network." },
    { user_type_ref_id: 4, user_type_code: "SD", user_type_name: "Super Distributor", description: "Master enterprise distributor managing regional distribution hierarchy." },
  ]);
  const [selectedUserTypeRefId, setSelectedUserTypeRefId] = useState<number>(initialUserTypeRefId || 2);
  const [salesLinkContext, setSalesLinkContext] = useState<any>(null);
  const [salesLinkLocked, setSalesLinkLocked] = useState<boolean>(false);

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
  const videoMediaRef = useRef<MediaRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<BlobPart[]>([]);

  // ── 10. Personal Address ──
  const [personalAddress1, setPersonalAddress1] = useState("");
  const [personalAddress2, setPersonalAddress2] = useState("");
  const [personalState, setPersonalState] = useState("Tamil Nadu");
  const [personalCity, setPersonalCity] = useState("Chennai");
  const [personalDistrict, setPersonalDistrict] = useState("Chennai");
  const [personalPincode, setPersonalPincode] = useState("");
  const [personalCitiesList, setPersonalCitiesList] = useState<string[]>([]);

  // ── 11. Shop Address ──
  const [sameAsPersonal, setSameAsPersonal] = useState(false);
  const [shopAddress1, setShopAddress1] = useState("");
  const [shopAddress2, setShopAddress2] = useState("");
  const [shopState, setShopState] = useState("Tamil Nadu");
  const [shopCity, setShopCity] = useState("Chennai");
  const [shopDistrict, setShopDistrict] = useState("Chennai");
  const [shopPincode, setShopPincode] = useState("");
  const [shopCitiesList, setShopCitiesList] = useState<string[]>([]);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Entity Types, States, Shop Categories, & Sales Link
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadReferenceData() {
      try {
        // Entity Types
        const etRes = await fetch("/api/v1/onboarding/entity-types");
        if (etRes.ok) {
          const etData = await etRes.json();
          if (Array.isArray(etData) && etData.length > 0) setEntityTypes(etData);
        }
      } catch (err) {
        console.warn("Entity types load error:", err);
      }

      try {
        // States
        const stRes = await fetch("/api/v1/onboarding/states");
        if (stRes.ok) {
          const stData = await stRes.json();
          if (Array.isArray(stData) && stData.length > 0) setStatesList(stData);
        }
      } catch (err) {
        console.warn("States load error:", err);
      }

      try {
        // Shop Categories
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

      // Check Sales Link token if present in props or URL
      const linkToken = initialLinkToken || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("link_token") : null);
      if (linkToken) {
        try {
          const slRes = await fetch(`/api/v1/onboarding/sales-link/validate/${linkToken}`);
          if (slRes.ok) {
            const slData = await slRes.json();
            if (slData.valid) {
              setSalesLinkContext(slData);
              setSelectedUserTypeRefId(slData.user_type_ref_id);
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
  // Auto-Save Draft to Database (Never localStorage)
  // ─────────────────────────────────────────────────────────────────────────────
  const autoSaveDraftToDb = useCallback(async () => {
    if (!mobileNumber && !fullName && !shopName) return;
    try {
      const payload = {
        registration_id: registrationId,
        user_type_ref_id: selectedUserTypeRefId,
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
    registrationId, selectedUserTypeRefId, fullName, shopName, mobileNumber, email,
    panNumber, panHolderName, panDob, panType, panVerified, panFileUrl,
    aadhaarNumber, aadhaarMasked, aadhaarHolderName, aadhaarVerified, aadhaarFileUrl,
    isGstRegistered, gstNumber, gstVerified, gstDetails, gstFileUrl,
    bankAccount, bankIfsc, bankAccountType, bankVerified, bankFileUrl, bankDetails,
    personalPhotoUrl, geoLocation, shopPhotoUrl, videoKycUrl,
    personalAddress1, personalAddress2, personalState, personalCity, personalDistrict, personalPincode,
    shopAddress1, shopAddress2, shopState, shopCity, shopDistrict, shopPincode,
    selectedCategory, initialLinkToken
  ]);

  // Debounced auto-save on form state change
  useEffect(() => {
    const t = setTimeout(() => {
      autoSaveDraftToDb();
    }, 2000);
    return () => clearTimeout(t);
  }, [autoSaveDraftToDb]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Mobile Number & WhatsApp OTP
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendMobileOtp = async () => {
    const clean = mobileNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      setMobileConflict("Mobile number must be exactly 10 digits.");
      return;
    }
    setMobileChecking(true);
    setMobileConflict(null);
    try {
      // 1. Cross-entity uniqueness check via SP
      const uniqRes = await fetch("/api/v1/onboarding/check-uniqueness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: clean, user_type_ref_id: selectedUserTypeRefId })
      });
      const uniqData = await uniqRes.json();
      if (!uniqData.is_valid && uniqData.mobile_conflict) {
        setMobileConflict(uniqData.message || `Mobile number is already registered under ${uniqData.existing_entity_type || "another entity"}.`);
        setMobileChecking(false);
        return;
      }

      // 2. Dispatch WhatsApp OTP
      const otpRes = await fetch("/api/v1/onboarding/check-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: clean,
          user_type_ref_id: selectedUserTypeRefId
        })
      });
      const otpData = await otpRes.json();
      if (otpRes.ok && otpData.status !== "ERROR") {
        setMobileOtpSent(true);
        setMobileCountdown(60);
        if (otpData.registration_id) setRegistrationId(otpData.registration_id);
      } else {
        setMobileConflict(otpData.message || otpData.detail || "Unable to send WhatsApp OTP. Please try again.");
      }
    } catch {
      setMobileConflict("Network error while verifying mobile. Please check connection.");
    } finally {
      setMobileChecking(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp.trim()) return;
    setMobileVerifying(true);
    setMobileConflict(null);
    try {
      const res = await fetch("/api/v1/onboarding/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          otp_code: mobileOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status !== "ERROR") {
        setMobileVerified(true);
      } else {
        setMobileConflict(data.message || data.detail || "Invalid WhatsApp OTP code.");
      }
    } catch {
      setMobileConflict("Failed to verify mobile OTP.");
    } finally {
      setMobileVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Email Verification
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!email.includes("@") || !email.includes(".")) {
      setEmailConflict("Please enter a valid email address.");
      return;
    }
    setEmailChecking(true);
    setEmailConflict(null);
    try {
      // 1. Cross-entity uniqueness check via SP
      const uniqRes = await fetch("/api/v1/onboarding/check-uniqueness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), user_type_ref_id: selectedUserTypeRefId })
      });
      const uniqData = await uniqRes.json();
      if (!uniqData.is_valid && uniqData.email_conflict) {
        setEmailConflict(uniqData.message || `Email is already registered under ${uniqData.existing_entity_type || "another entity"}.`);
        setEmailChecking(false);
        return;
      }

      // 2. Dispatch Email OTP
      const otpRes = await fetch("/api/v1/onboarding/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          email: email.trim().toLowerCase(),
          user_type_ref_id: selectedUserTypeRefId
        })
      });
      const otpData = await otpRes.json();
      if (otpRes.ok && otpData.status !== "ERROR") {
        setEmailOtpSent(true);
      } else {
        setEmailConflict(otpData.message || otpData.detail || "Failed to dispatch email OTP.");
      }
    } catch {
      setEmailConflict("Network error while sending email OTP.");
    } finally {
      setEmailChecking(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return;
    setEmailVerifying(true);
    setEmailConflict(null);
    try {
      const res = await fetch("/api/v1/onboarding/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          otp_code: emailOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status !== "ERROR") {
        setEmailVerified(true);
      } else {
        setEmailConflict(data.message || data.detail || "Invalid Email OTP.");
      }
    } catch {
      setEmailConflict("Failed to verify email OTP.");
    } finally {
      setEmailVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PAN Card Upload & OCR Auto-Read + Cashfree Verify
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPanFile(file);
    setPanUploading(true);
    setPanError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "PAN");
      fd.append("registration_id", registrationId);
      const res = await fetch("/api/v1/onboarding/auto-read-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setPanFileUrl(data.b2_url || "");
        const ext = data.extracted || {};
        if (ext.pan_number) setPanNumber(ext.pan_number);
        if (ext.holder_name || ext.registered_name) setPanHolderName(ext.holder_name || ext.registered_name);
        if (ext.dob) setPanDob(ext.dob);
        if (ext.pan_type) setPanType(ext.pan_type);
        if (!fullName && (ext.holder_name || ext.registered_name)) setFullName(ext.holder_name || ext.registered_name);
      } else {
        setPanError("Could not auto-read PAN document. Please verify PAN number manually.");
      }
    } catch {
      setPanError("Failed to upload and auto-read PAN document.");
    } finally {
      setPanUploading(false);
    }
  };

  const handleVerifyPan = async () => {
    const clean = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
      setPanError("Please enter a valid 10-character PAN number (e.g. ABCDE1234F).");
      return;
    }
    setPanVerifying(true);
    setPanError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, pan_number: clean })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setPanVerified(true);
        if (data.registered_name) setPanHolderName(data.registered_name);
        if (!fullName && data.registered_name) setFullName(data.registered_name);
      } else {
        setPanError(data.message || data.detail || "PAN verification failed via Cashfree.");
      }
    } catch {
      setPanError("Cashfree PAN verification service unavailable.");
    } finally {
      setPanVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Aadhaar Upload & OCR Auto-Read + Cashfree eKYC Verify
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAadhaarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarFile(file);
    setAadhaarUploading(true);
    setAadhaarError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "AADHAAR");
      fd.append("registration_id", registrationId);
      const res = await fetch("/api/v1/onboarding/auto-read-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setAadhaarFileUrl(data.b2_url || "");
        const ext = data.extracted || {};
        if (ext.aadhaar_number) setAadhaarNumber(ext.aadhaar_number);
        if (ext.full_name) setAadhaarHolderName(ext.full_name);
      } else {
        setAadhaarError("Could not auto-read Aadhaar number. Please enter your 12-digit Aadhaar number.");
      }
    } catch {
      setAadhaarError("Failed to upload and auto-read Aadhaar.");
    } finally {
      setAadhaarUploading(false);
    }
  };

  const handleSendAadhaarOtp = async () => {
    const clean = aadhaarNumber.replace(/\D/g, "");
    if (clean.length !== 12) {
      setAadhaarError("Aadhaar number must be exactly 12 digits.");
      return;
    }
    setAadhaarSendingOtp(true);
    setAadhaarError("");
    try {
      const res = await fetch("/api/v1/onboarding/send-aadhaar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, aadhaar_number: clean })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setAadhaarOtpSent(true);
        setAadhaarRefId(data.ref_id || "REF-12345");
      } else {
        setAadhaarError(data.message || data.detail || "Unable to send Aadhaar OTP.");
      }
    } catch {
      setAadhaarError("Aadhaar OTP service unavailable.");
    } finally {
      setAadhaarSendingOtp(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp.trim()) return;
    setAadhaarVerifying(true);
    setAadhaarError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-aadhaar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          ref_id: aadhaarRefId,
          otp_code: aadhaarOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setAadhaarVerified(true);
        setAadhaarHolderName(data.full_name || "");
        setAadhaarMasked(data.aadhaar_masked || `XXXXXXXX${aadhaarNumber.slice(-4)}`);

        // Auto-fill Personal Address from Aadhaar response!
        if (data.house || data.street) {
          setPersonalAddress1(`${data.house || ""} ${data.street || ""}`.trim());
        }
        if (data.locality || data.village) {
          setPersonalAddress2(`${data.locality || ""} ${data.village || ""}`.trim());
        }
        if (data.state) setPersonalState(data.state);
        if (data.city) setPersonalCity(data.city);
        if (data.district) setPersonalDistrict(data.district);
        if (data.pincode) setPersonalPincode(data.pincode);
      } else {
        setAadhaarError(data.message || data.detail || "Invalid Aadhaar OTP.");
      }
    } catch {
      setAadhaarError("Failed to verify Aadhaar OTP.");
    } finally {
      setAadhaarVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GST (Optional)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGstFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGstFile(file);
    setGstUploading(true);
    setGstError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "GST");
      fd.append("registration_id", registrationId);
      const res = await fetch("/api/v1/onboarding/auto-read-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setGstFileUrl(data.b2_url || "");
        const ext = data.extracted || {};
        if (ext.gst_number) setGstNumber(ext.gst_number);
        if (ext.business_name && !shopName) setShopName(ext.business_name);
      }
    } catch {
      setGstError("Failed to auto-read GST certificate.");
    } finally {
      setGstUploading(false);
    }
  };

  const handleVerifyGst = async () => {
    const clean = gstNumber.trim().toUpperCase();
    if (!clean) return;
    setGstVerifying(true);
    setGstError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, gst_number: clean })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setGstVerified(true);
        setGstDetails(data);
        if (data.business_name && !shopName) setShopName(data.business_name);
      } else {
        setGstError(data.message || data.detail || "GST verification failed.");
      }
    } catch {
      setGstError("GST verification service unavailable.");
    } finally {
      setGstVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Bank Account Upload + Cashfree Penny Drop
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBankFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankFile(file);
    setBankUploading(true);
    setBankError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "BANK");
      fd.append("registration_id", registrationId);
      const res = await fetch("/api/v1/onboarding/auto-read-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setBankFileUrl(data.b2_url || "");
        const ext = data.extracted || {};
        if (ext.account_number) setBankAccount(ext.account_number);
        if (ext.ifsc) setBankIfsc(ext.ifsc);
      }
    } catch {
      setBankError("Could not auto-read bank document. Please fill bank account details manually.");
    } finally {
      setBankUploading(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!bankAccount.trim() || !bankIfsc.trim()) {
      setBankError("Please enter account number and IFSC code.");
      return;
    }
    setBankVerifying(true);
    setBankError("");
    try {
      const res = await fetch("/api/v1/onboarding/verify-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          account_number: bankAccount.trim(),
          ifsc: bankIfsc.trim().toUpperCase(),
          name: fullName || panHolderName || "ACCOUNT HOLDER",
          account_type: bankAccountType
        })
      });
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setBankVerified(true);
        setBankDetails(data);
      } else {
        setBankError(data.message || data.detail || "Bank Penny Drop verification failed.");
      }
    } catch {
      setBankError("Bank verification service unavailable.");
    } finally {
      setBankVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Personal Photo + Geo Location
  // ─────────────────────────────────────────────────────────────────────────────
  const captureDeviceLocation = useCallback(async () => {
    setGeoLocating(true);
    setGeoError("");
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by your browser.");
      setGeoLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        try {
          const res = await fetch("/api/v1/onboarding/validate-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              registration_id: registrationId
            })
          });
          const data = await res.json();
          if (data.is_valid) {
            setGeoLocation({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              address: data.formatted_address,
              city: data.city,
              state: data.state,
              pincode: data.pincode
            });
          } else {
            setGeoError(data.message || "Location coordinates outside standard operational bounds.");
          }
        } catch {
          setGeoLocation({ latitude: lat, longitude: lng, accuracy: acc });
        } finally {
          setGeoLocating(false);
        }
      },
      (err) => {
        setGeoError(`Location permission denied or unavailable: ${err.message}`);
        setGeoLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [registrationId]);

  const handlePersonalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonalPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "SELFIE");
      fd.append("registration_id", registrationId);
      const res = await fetch("/api/v1/onboarding/auto-read-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setPersonalPhotoUrl(data.b2_url || "");
        if (!geoLocation) captureDeviceLocation();
      }
    } catch {
      console.warn("Failed to upload personal photo");
    } finally {
      setPersonalPhotoUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Shop Photo
  // ─────────────────────────────────────────────────────────────────────────────
  const handleShopPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShopPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "SHOP_PHOTO");
      fd.append("registration_id", registrationId);
      const res = await fetch("/api/v1/onboarding/auto-read-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setShopPhotoUrl(data.b2_url || "");
      }
    } catch {
      console.warn("Failed to upload shop photo");
    } finally {
      setShopPhotoUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Video KYC
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;
      videoChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      videoMediaRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setVideoUploading(true);
        try {
          const fd = new FormData();
          fd.append("video", blob, "video_kyc.webm");
          fd.append("registration_id", registrationId);
          fd.append("duration_seconds", "15");
          const res = await fetch("/api/v1/onboarding/upload-video-file", { method: "POST", body: fd });
          const data = await res.json();
          if (res.ok && data.status !== "ERROR") {
            setVideoKycUrl(data.video_url || `https://cdn.pay2pay.in/videos/${registrationId}.webm`);
          }
        } catch {
          console.warn("Video upload error");
        } finally {
          setVideoUploading(false);
        }
      };
      rec.start();
      setVideoRecording(true);
      setVideoCountdown(15);
      const timer = setInterval(() => {
        setVideoCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            rec.stop();
            setVideoRecording(false);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      alert(`Could not start camera for Video KYC: ${err.message || err}`);
    }
  };

  const handleCopyVideoUrl = () => {
    if (!videoKycUrl) return;
    navigator.clipboard.writeText(videoKycUrl);
    setVideoCopied(true);
    setTimeout(() => setVideoCopied(false), 2500);
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

    // Validate mandatory fields
    if (!fullName.trim()) {
      setFormError("Full Name is mandatory.");
      return;
    }
    if (!shopName.trim()) {
      setFormError("Shop / Business Name is mandatory.");
      return;
    }
    if (!mobileVerified) {
      setFormError("Mobile Number WhatsApp OTP verification is mandatory.");
      return;
    }
    if (!emailVerified) {
      setFormError("Email Address verification is mandatory.");
      return;
    }
    if (!panVerified) {
      setFormError("PAN Card Cashfree verification is mandatory.");
      return;
    }
    if (!aadhaarVerified) {
      setFormError("Aadhaar eKYC verification is mandatory.");
      return;
    }
    if (!bankVerified) {
      setFormError("Bank Account Penny Drop verification is mandatory.");
      return;
    }
    if (!personalPhotoUrl) {
      setFormError("Personal Photo is mandatory.");
      return;
    }
    if (!shopPhotoUrl) {
      setFormError("Shop Photo is mandatory.");
      return;
    }
    if (!personalAddress1.trim() || !personalPincode.trim()) {
      setFormError("Personal Address is mandatory.");
      return;
    }
    if (!shopAddress1.trim() || !shopPincode.trim()) {
      setFormError("Shop Address is mandatory.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Save final state to draft
      await autoSaveDraftToDb();

      // 2. Submit application
      const res = await fetch("/api/v1/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          user_type_ref_id: selectedUserTypeRefId
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

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (submittedResult) {
    return (
      <div className="max-w-3xl mx-auto my-8 p-6 sm:p-10 rounded-3xl bg-slate-900 border border-emerald-500/30 text-white shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Application Submitted Successfully</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {fullName}!
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Your single-page onboarding application for{" "}
            <span className="text-white font-bold">{selectedEntity.user_type_name}</span> (
            <span className="text-amber-400 font-bold">{shopName}</span>) has been safely recorded and queued for Admin Approval.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 max-w-md mx-auto">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Application Reference</span>
            <span className="font-mono font-bold text-amber-400">{submittedResult.application_ref}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Entity Type</span>
            <span className="font-bold text-slate-200">{selectedEntity.user_type_name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Registered Mobile</span>
            <span className="font-bold text-slate-200">+91 {mobileNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Admin Approval Status</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
              PENDING APPROVAL
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Estimated Review Time</span>
            <span className="font-bold text-emerald-400">2 to 4 Business Hours</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Our compliance and operations team will review your verified KYC documents. You will receive an instant WhatsApp alert as soon as your console is activated.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/login"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all"
          >
            Go to Portal Login
          </a>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SINGLE-PAGE ONBOARDING FORM
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto my-6 px-4 select-none">
      {/* ── Top Header / Brand Bar ── */}
      <div className="mb-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-black uppercase tracking-wider">
                Enterprise Onboarding
              </span>
              {salesLinkContext && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sales Verified Link: {salesLinkContext.sales_rep_name}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Single-Page Business Onboarding
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Super Distributor · Distributor · Retailer Instant Verification Engine
            </p>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="text-[11px] text-slate-400 font-mono">
              Draft ID: <strong className="text-slate-200">{registrationId}</strong>
            </span>
            {lastSaved && (
              <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                ● Auto-saved to Database at {lastSaved}
              </span>
            )}
          </div>
        </div>

        {/* ── Entity Type Selector (Super Distributor / Distributor / Retailer) ── */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Select Entity Registration Type *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {entityTypes.map((et) => {
              const active = et.user_type_ref_id === selectedUserTypeRefId;
              return (
                <button
                  type="button"
                  key={et.user_type_ref_id}
                  disabled={salesLinkLocked}
                  onClick={() => setSelectedUserTypeRefId(et.user_type_ref_id)}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    active
                      ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  } ${salesLinkLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">{et.user_type_name}</span>
                    {active && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {et.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Single-Page Form ── */}
      <form onSubmit={handleFinalSubmit} className="space-y-6">
        {/* ── Name & Shop Name ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <User className="w-4 h-4" />
            <span>Basic Identity & Shop Name</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Full Name (as per PAN / Aadhaar) *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sathiya Murthy"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-semibold text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Shop / Business Name *
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Sri Venkateswara Telecom & FinTech"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-semibold text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* ── 1. Mobile Number Verification ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Phone className="w-4 h-4" />
              <span>1. Mobile Number & WhatsApp OTP *</span>
            </div>
            {mobileVerified && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified ✓</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Mandatory uniqueness validation across Super Distributor, Distributor, and Retailer. The same number cannot be reused across entity types.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <div className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-500">
                +91
              </div>
              <input
                type="tel"
                value={mobileNumber}
                disabled={mobileVerified}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono font-bold text-sm"
              />
            </div>

            {!mobileVerified && (
              <button
                type="button"
                onClick={handleSendMobileOtp}
                disabled={mobileChecking || mobileNumber.length !== 10}
                className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {mobileChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Send WhatsApp OTP</span>
                )}
              </button>
            )}
          </div>

          {mobileConflict && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mobileConflict}</span>
            </div>
          )}

          {mobileOtpSent && !mobileVerified && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300">
                Enter 6-digit WhatsApp OTP sent to +91 {mobileNumber}
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit OTP"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center font-bold tracking-widest text-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyMobileOtp}
                  disabled={mobileVerifying || mobileOtp.length < 4}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {mobileVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Verify OTP</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Email Verification ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Mail className="w-4 h-4" />
              <span>2. Email Address *</span>
            </div>
            {emailVerified && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified ✓</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              value={email}
              disabled={emailVerified}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. partner@pay2pay.in"
              className="sm:col-span-2 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-semibold text-sm"
            />
            {!emailVerified && (
              <button
                type="button"
                onClick={handleSendEmailOtp}
                disabled={emailChecking || !email.includes("@")}
                className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {emailChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Email OTP</span>}
              </button>
            )}
          </div>

          {emailConflict && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{emailConflict}</span>
            </div>
          )}

          {emailOtpSent && !emailVerified && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300">
                Enter 6-digit Email OTP sent to {email}
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit OTP"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center font-bold tracking-widest text-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyEmailOtp}
                  disabled={emailVerifying || emailOtp.length < 4}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {emailVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Verify Email</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. PAN Card (OCR Auto-read + Cashfree Verify) ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <CreditCard className="w-4 h-4" />
              <span>3. PAN Card (OCR Auto-Read + Cashfree Verify) *</span>
            </div>
            {panVerified && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified ✓</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {panFile ? panFile.name : "Upload PAN Card Document"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Supports JPG, PNG, PDF. High-precision OCR auto-reads PAN details.
                </p>
              </div>
            </div>
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-all">
              {panUploading ? "Reading OCR..." : "Select Document"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handlePanFileUpload}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">PAN Number *</label>
              <input
                type="text"
                maxLength={10}
                value={panNumber}
                disabled={panVerified}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Holder Name (Read from OCR)</label>
              <input
                type="text"
                value={panHolderName}
                onChange={(e) => setPanHolderName(e.target.value)}
                placeholder="Auto-read or enter name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              {!panVerified ? (
                <button
                  type="button"
                  onClick={handleVerifyPan}
                  disabled={panVerifying || panNumber.length !== 10}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {panVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Verify with Cashfree</span>
                </button>
              ) : (
                <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ PAN Verified</span>
                </div>
              )}
            </div>
          </div>

          {panError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{panError}</span>
            </div>
          )}
        </div>

        {/* ── 4. Aadhaar (OCR Auto-read + Cashfree eKYC) ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>4. Aadhaar Card (OCR Auto-Read + Cashfree eKYC) *</span>
            </div>
            {aadhaarVerified && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified ✓</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {aadhaarFile ? aadhaarFile.name : "Upload Aadhaar Card (Front / Back / PDF)"}
                </p>
                <p className="text-[11px] text-slate-500">
                  OCR extracts 12-digit Aadhaar number automatically.
                </p>
              </div>
            </div>
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-all">
              {aadhaarUploading ? "Reading OCR..." : "Select Document"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleAadhaarFileUpload}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">
                12-digit Aadhaar Number *
              </label>
              <input
                type="text"
                maxLength={14}
                value={aadhaarNumber}
                disabled={aadhaarVerified}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="1234 5678 9012"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              {!aadhaarVerified && (
                <button
                  type="button"
                  onClick={handleSendAadhaarOtp}
                  disabled={aadhaarSendingOtp || aadhaarNumber.replace(/\D/g, "").length !== 12}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {aadhaarSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Aadhaar OTP</span>}
                </button>
              )}
            </div>
          </div>

          {aadhaarError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{aadhaarError}</span>
            </div>
          )}

          {aadhaarOtpSent && !aadhaarVerified && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300">
                Enter UIDAI Aadhaar eKYC OTP sent to registered mobile
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={aadhaarOtp}
                  onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit OTP"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center font-bold tracking-widest text-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyAadhaarOtp}
                  disabled={aadhaarVerifying || aadhaarOtp.length < 4}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {aadhaarVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Verify Aadhaar</span>
                </button>
              </div>
            </div>
          )}

          {aadhaarVerified && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold space-y-1">
              <p>✓ Aadhaar eKYC Verified via Cashfree API.</p>
              <p className="text-[11px] text-slate-400">
                Holder: <strong>{aadhaarHolderName}</strong> · Masked UID: {aadhaarMasked}
              </p>
              <p className="text-[10px] text-slate-400">
                Personal address has been automatically populated in Section 10 below.
              </p>
            </div>
          )}
        </div>

        {/* ── 5. GST - Optional ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Building className="w-4 h-4" />
              <span>5. GST Registration (Optional)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">GST Registered?</span>
              <button
                type="button"
                onClick={() => setIsGstRegistered(!isGstRegistered)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isGstRegistered ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    isGstRegistered ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {isGstRegistered ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      {gstFile ? gstFile.name : "Upload GST Certificate (REG-06)"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      OCR auto-reads 15-digit GSTIN and Trade Name.
                    </p>
                  </div>
                </div>
                <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-all">
                  {gstUploading ? "Reading OCR..." : "Select Document"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleGstFileUpload}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">15-digit GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstNumber}
                    disabled={gstVerified}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="33ABCDE1234F1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  {!gstVerified ? (
                    <button
                      type="button"
                      onClick={handleVerifyGst}
                      disabled={gstVerifying || gstNumber.length < 15}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {gstVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify GST</span>}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ GST Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {gstError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{gstError}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Not registered for GST. You can proceed with onboarding without GST.
            </p>
          )}
        </div>

        {/* ── 6. Bank Account (OCR + Cashfree Penny Drop) ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <CreditCard className="w-4 h-4" />
              <span>6. Bank Account Details (OCR + Penny Drop Verification) *</span>
            </div>
            {bankVerified && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified ✓</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {bankFile ? bankFile.name : "Upload Bank Cheque / Passbook / Statement"}
                </p>
                <p className="text-[11px] text-slate-500">
                  OCR extracts Account Number and IFSC automatically.
                </p>
              </div>
            </div>
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-all">
              {bankUploading ? "Reading OCR..." : "Select Document"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleBankFileUpload}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Account Number *</label>
              <input
                type="text"
                value={bankAccount}
                disabled={bankVerified}
                onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
                placeholder="50100012345678"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">IFSC Code *</label>
              <input
                type="text"
                maxLength={11}
                value={bankIfsc}
                disabled={bankVerified}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              {!bankVerified ? (
                <button
                  type="button"
                  onClick={handleVerifyBank}
                  disabled={bankVerifying || !bankAccount || !bankIfsc}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {bankVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Account</span>}
                </button>
              ) : (
                <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ Bank Verified</span>
                </div>
              )}
            </div>
          </div>

          {bankDetails && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold space-y-1">
              <p>✓ Penny Drop Verification Confirmed via Cashfree.</p>
              <p className="text-[11px] text-slate-300">
                Bank: <strong>{bankDetails.bank_name}</strong> · Branch: {bankDetails.branch}
              </p>
              <p className="text-[11px] text-slate-300">
                Beneficiary Name at Bank: <strong>{bankDetails.name_at_bank}</strong>
              </p>
            </div>
          )}

          {bankError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{bankError}</span>
            </div>
          )}
        </div>

        {/* ── 7. Personal Photo + Geo Location ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Camera className="w-4 h-4" />
              <span>7. Personal Photo + Geo Location *</span>
            </div>
            {personalPhotoUrl && geoLocation && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Captured ✓</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Photo capture/upload */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300">Personal Photo (Selfie) *</span>
              <div className="flex items-center gap-3">
                {personalPhotoUrl ? (
                  <img
                    src={personalPhotoUrl}
                    alt="Selfie"
                    className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <User className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <label className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{personalPhotoUploading ? "Uploading..." : "Upload / Capture Selfie"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={handlePersonalPhotoUpload}
                    />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Clear face photo for fraud prevention.
                  </p>
                </div>
              </div>
            </div>

            {/* GPS Geolocation */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300">Device GPS Geolocation *</span>
              {geoLocation ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>GPS Coordinates Verified</span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">
                    Lat: {geoLocation.latitude.toFixed(6)}, Lng: {geoLocation.longitude.toFixed(6)}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    {geoLocation.address || "Operational territory validated"}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={captureDeviceLocation}
                  disabled={geoLocating}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {geoLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-rose-400" />}
                  <span>Capture GPS Location</span>
                </button>
              )}
              {geoError && <p className="text-[11px] text-rose-400 font-medium">{geoError}</p>}
            </div>
          </div>
        </div>

        {/* ── 8. Shop Photo ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Store className="w-4 h-4" />
              <span>8. Shop / Commercial Premises Photo *</span>
            </div>
            {shopPhotoUrl && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Uploaded to B2 ✓</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Clear photograph of your commercial establishment, shopfront, or signboard. Stored securely in Backblaze B2 Vault.
          </p>

          <div className="flex items-center gap-4">
            {shopPhotoUrl ? (
              <img
                src={shopPhotoUrl}
                alt="Shop"
                className="w-24 h-20 rounded-2xl object-cover border border-emerald-500/40"
              />
            ) : (
              <div className="w-24 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                <Store className="w-8 h-8" />
              </div>
            )}
            <div>
              <label className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all">
                <UploadCloud className="w-4 h-4" />
                <span>{shopPhotoUploading ? "Uploading to B2..." : "Select Shop Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleShopPhotoUpload}
                />
              </label>
              <p className="text-[10px] text-slate-500 mt-1">
                Max 5 MB. PNG or JPEG.
              </p>
            </div>
          </div>
        </div>

        {/* ── 9. Video KYC ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Video className="w-4 h-4" />
              <span>9. Video KYC Statement *</span>
            </div>
            {videoKycUrl && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recorded & Verified ✓</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">
              <strong>Statement Script:</strong> "My name is <span className="text-white font-bold">{fullName || "your name"}</span>, and I confirm my registration for <span className="text-white font-bold">{shopName || "your shop"}</span> on Pay2Pay."
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {!videoRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={videoUploading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {videoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span>{videoKycUrl ? "Re-Record Video" : "Start Live Video Recording"}</span>
                </button>
              ) : (
                <div className="px-5 py-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Recording live statement: {videoCountdown}s remaining...</span>
                </div>
              )}

              {videoKycUrl && (
                <button
                  type="button"
                  onClick={handleCopyVideoUrl}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{videoCopied ? "Link Copied ✓" : "Copy Video Link"}</span>
                </button>
              )}
            </div>

            {videoKycUrl && (
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-mono break-all">
                  Vault Reference: {videoKycUrl}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 10. Personal Address ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <MapPin className="w-4 h-4" />
              <span>10. Personal Address (Auto-filled from Aadhaar) *</span>
            </div>
            {aadhaarVerified && (
              <span className="text-[11px] text-slate-400">
                Auto-populated from UIDAI eKYC · Fully editable
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Address Line 1 / Street *</label>
              <input
                type="text"
                value={personalAddress1}
                onChange={(e) => setPersonalAddress1(e.target.value)}
                placeholder="House No, Building, Street"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Address Line 2 / Locality</label>
              <input
                type="text"
                value={personalAddress2}
                onChange={(e) => setPersonalAddress2(e.target.value)}
                placeholder="Area, Landmark"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Pincode *</label>
              <input
                type="text"
                maxLength={6}
                value={personalPincode}
                onChange={(e) => handlePersonalPincodeChange(e.target.value)}
                placeholder="600001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">State *</label>
              <select
                value={personalState}
                onChange={(e) => setPersonalState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">City *</label>
              {personalCitiesList.length > 0 ? (
                <select
                  value={personalCity}
                  onChange={(e) => setPersonalCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
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
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">District</label>
              <input
                type="text"
                value={personalDistrict}
                onChange={(e) => setPersonalDistrict(e.target.value)}
                placeholder="District"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── 11. Shop Address ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Store className="w-4 h-4" />
              <span>11. Shop / Commercial Address *</span>
            </div>
            <button
              type="button"
              onClick={handleCopyPersonalToShopAddress}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>[Same as Personal Address]</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Shop Address Line 1 / Street *</label>
              <input
                type="text"
                value={shopAddress1}
                onChange={(e) => setShopAddress1(e.target.value)}
                placeholder="Shop No, Complex, Commercial Street"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Shop Address Line 2 / Locality</label>
              <input
                type="text"
                value={shopAddress2}
                onChange={(e) => setShopAddress2(e.target.value)}
                placeholder="Market, Landmark"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Shop Pincode *</label>
              <input
                type="text"
                maxLength={6}
                value={shopPincode}
                onChange={(e) => handleShopPincodeChange(e.target.value)}
                placeholder="600001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">State *</label>
              <select
                value={shopState}
                onChange={(e) => setShopState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">City *</label>
              {shopCitiesList.length > 0 ? (
                <select
                  value={shopCity}
                  onChange={(e) => setShopCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
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
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">District</label>
              <input
                type="text"
                value={shopDistrict}
                onChange={(e) => setShopDistrict(e.target.value)}
                placeholder="District"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── 12. Shop Category ── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Building2 className="w-4 h-4" />
            <span>12. Shop / Business Category *</span>
          </div>

          <p className="text-xs text-slate-400">
            Dynamically loaded from reference database. Select your primary line of business.
          </p>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-sm focus:outline-none focus:border-blue-500"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* ── Form Error Banner ── */}
        {formError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* ── Final Submit Button ── */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Re-verifying & Submitting Application...</span>
              </>
            ) : (
              <>
                <span>Submit {selectedEntity.user_type_name} Application</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500 mt-2.5">
            By submitting, you confirm that all information and documents uploaded are authentic and comply with NPCI & RBI regulatory guidelines.
          </p>
        </div>
      </form>
    </div>
  );
}
