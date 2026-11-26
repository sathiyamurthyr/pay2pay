"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Tabs,
  Tab,
  Chip,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  Divider,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  User,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  Lock,
  Camera,
  Briefcase,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Copy,
  Upload,
  PhoneCall,
  Mail,
  RefreshCw,
  Save,
  KeyRound,
  ShieldCheck,
  Building,
  Calendar,
  ExternalLink,
  HelpCircle,
  Headphones,
  MessageSquare,
  Clock,
  Globe,
  X,
  Eye,
  EyeOff,
  MessageCircle,
  FileText,
  Download,
  FileCheck,
  Landmark,
  Check,
  FileSpreadsheet,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { retailerApi } from "@/services/retailer-api";
import api from "@/lib/api";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export interface KycDocument {
  id: string;
  doc_type: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  is_verified?: boolean;
  uploaded_at?: string | null;
}

export interface BankAccountItem {
  id: string;
  bank_name: string;
  branch?: string | null;
  account_number?: string | null;
  account_number_masked?: string | null;
  account_holder_name?: string | null;
  ifsc?: string | null;
  account_type?: string | null;
  is_primary?: boolean;
  verification_status?: string | null;
  verification_date?: string | null;
  document_url?: string | null;
  document_file_name?: string | null;
  document_file_size?: number | null;
  document_mime_type?: string | null;
}

interface ProfileResponse {
  personal: {
    retailer_name?: string | null;
    owner_name?: string | null;
    store_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    dob?: string | null;
    gender?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    nationality?: string | null;
    retailer_id?: string | null;
    application_reference?: string | null;
    business_category?: string | null;
    store_type?: string | null;
    status?: string | null;
    registered_date?: string | null;
  };
  contact: {
    mobile_raw?: string | null;
    mobile_masked?: string | null;
    mobile_status?: string | null;
    email_raw?: string | null;
    email_masked?: string | null;
    email_status?: string | null;
    alternate_mobile?: string | null;
    whatsapp_number?: string | null;
  };
  address: {
    permanent_address?: {
      address_type?: string | null;
      address_line_1?: string | null;
      address_line_2?: string | null;
      landmark?: string | null;
      city?: string | null;
      district?: string | null;
      state?: string | null;
      country?: string | null;
      pincode?: string | null;
    } | null;
    same_as_permanent?: boolean;
    communication_address?: {
      address_type?: string | null;
      address_line_1?: string | null;
      address_line_2?: string | null;
      landmark?: string | null;
      city?: string | null;
      district?: string | null;
      state?: string | null;
      country?: string | null;
      pincode?: string | null;
    } | null;
  };
  kyc: {
    pan?: {
      masked?: string | null;
      verification_status?: string | null;
      verification_date?: string | null;
      provider?: string | null;
      provider_reference?: string | null;
      kyc_status?: string | null;
      document_url?: string | null;
      file_name?: string | null;
      file_size_bytes?: number | null;
      mime_type?: string | null;
      is_verified?: boolean;
    } | null;
    aadhaar?: {
      masked?: string | null;
      verification_status?: string | null;
      verification_date?: string | null;
      provider?: string | null;
      provider_reference?: string | null;
      kyc_status?: string | null;
      document_url?: string | null;
      front_document_url?: string | null;
      front_file_name?: string | null;
      front_file_size?: number | null;
      back_document_url?: string | null;
      back_file_name?: string | null;
      back_file_size?: number | null;
      is_verified?: boolean;
    } | null;
    gst?: {
      masked?: string | null;
      legal_business_name?: string | null;
      status?: string | null;
    } | null;
    documents?: KycDocument[];
  };
  bank?: {
    account_holder_name?: string | null;
    bank_name?: string | null;
    account_number_masked?: string | null;
    ifsc?: string | null;
    branch?: string | null;
    account_type?: string | null;
    verification_status?: string | null;
    verification_date?: string | null;
    document_url?: string | null;
    document_file_name?: string | null;
    document_file_size?: number | null;
    document_mime_type?: string | null;
    document_is_verified?: boolean;
    document_uploaded_at?: string | null;
    accounts?: BankAccountItem[];
  } | null;
  security: {
    mfa_enabled?: boolean;
    session_timeout_minutes?: number;
    auto_lock_enabled?: boolean;
    has_password?: boolean;
    has_pin?: boolean;
    last_password_changed_at?: string | null;
    last_pin_changed_at?: string | null;
  };
  photo: {
    photo_url?: string | null;
    has_photo?: boolean;
  };
  rm?: {
    has_rm: boolean;
    rm_name?: string | null;
    employee_id?: string | null;
    mobile?: string | null;
    email?: string | null;
    territory?: string | null;
    region?: string | null;
    branch?: string | null;
    assigned_date?: string | null;
    status?: string | null;
    supervisor?: string | null;
  };
  location?: {
    has_location: boolean;
    latitude?: number | null;
    longitude?: number | null;
    registered_address?: string | null;
    accuracy?: string | null;
    captured_at?: string | null;
    source?: string | null;
    geo_status?: string | null;
    last_updated?: string | null;
  };
  company?: {
    company_ref_id?: number | null;
    company_code?: string | null;
    logo_url?: string | null;
    company_name?: string | null;
    company_legal_name?: string | null;
    legal_name?: string | null;
    brand_name?: string | null;
    operating_partner_info?: string | null;
    corporate_portal_url?: string | null;
    regulatory_status_badge?: string | null;
    entity_badge?: string | null;
    cin?: string | null;
    cin_number?: string | null;
    gstin?: string | null;
    business_entity_type?: string | null;
    industry_sector?: string | null;
    operating_status?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    support_helpline?: string | null;
    direct_phone?: string | null;
    direct_operations_line?: string | null;
    whatsapp_number?: string | null;
    grievance_email?: string | null;
    grievance_escalation_email?: string | null;
    nodal_officer?: string | null;
    grievance_officer_name?: string | null;
    grievance_officer_designation?: string | null;
    support_hours?: string | null;
    operating_hours?: string | null;
    headquarters?: string | null;
    registered_office_address?: string | null;
    helpdesk_url?: string | null;
    website_url?: string | null;
    official_website_url?: string | null;
    tat_level_1?: string | null;
    tat_level_2?: string | null;
    resolution_tat?: string | null;
  } | null;
}

export default function RetailerProfilePage() {
  const branding = useCompanyBranding();
  const isSmsPay = branding?.company_code === "SMSPAY";
  const isNear4You = branding?.company_code === "NEAR4YOU";
  const isPay2Pay = branding?.company_code === "PAY2PAY";

  const brandDisplayName = branding?.display_name || branding?.company_name || "";
  const brandCompanyName = branding?.company_name || branding?.legal_name || "";
  const brandPrimary =
    branding?.primary_colour ||
    (isNear4You ? "#A20A3A" : isPay2Pay ? "#2563EB" : "#0F3B7D");
  const brandSecondary =
    branding?.secondary_colour ||
    (isNear4You ? "#EDC11E" : isPay2Pay ? "#1E40AF" : "#D4AF37");
  const brandLight = `${brandPrimary}12`;
  const brandHover = brandSecondary;
  const brandBorder = `${brandPrimary}40`;
  const brandLogo = branding?.logo_url || "";
  const brandMark =
    branding?.favicon_url ||
    (isSmsPay
      ? "/branding/smspay-favicon-32x32.png"
      : isNear4You
      ? "/branding/near4you-favicon.png"
      : "/branding/pay2pay-favicon.png");
  const defaultWebsiteUrl = branding?.website || "";
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Contact Edit Form
  const [contactForm, setContactForm] = useState({
    alternate_mobile: "",
    whatsapp_number: "",
  });

  // Email Update OTP Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOpenEmailModal = () => {
    setNewEmail("");
    setEmailOtp("");
    setEmailOtpSent(false);
    setEmailModalError(null);
    setResendTimer(0);
    setEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    if (sendingEmailOtp || verifyingEmailOtp) return;
    setEmailModalOpen(false);
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail || !newEmail.includes("@") || !newEmail.includes(".")) {
      setEmailModalError("Please enter a valid email address.");
      return;
    }
    const currentEmail = profile?.contact?.email_raw;
    if (currentEmail && newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      setEmailModalError("The new email address cannot be identical to your current email address.");
      return;
    }

    try {
      setSendingEmailOtp(true);
      setEmailModalError(null);
      const res = await retailerApi.sendEmailUpdateOtp(newEmail.trim().toLowerCase());
      if (res?.success) {
        setEmailOtpSent(true);
        setResendTimer(60);
        setToast({
          open: true,
          message: res.message || `Verification code sent to ${newEmail}`,
          severity: "info",
        });
      } else {
        setEmailModalError(res?.message || "Failed to send verification code.");
      }
    } catch (err: any) {
      console.error("Error sending email update OTP:", err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to send verification OTP.";
      setEmailModalError(msg);
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.trim().length < 4) {
      setEmailModalError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    try {
      setVerifyingEmailOtp(true);
      setEmailModalError(null);
      const res = await retailerApi.verifyEmailUpdateOtp(newEmail.trim().toLowerCase(), emailOtp.trim());
      if (res?.success) {
        retailerApi.invalidateProfileCache();
        setToast({
          open: true,
          message: res.message || "Email address updated and verified successfully!",
          severity: "success",
        });
        setEmailModalOpen(false);
        await fetchProfile(true);
      } else {
        setEmailModalError(res?.message || "Invalid verification code. Email not updated.");
      }
    } catch (err: any) {
      console.error("Error verifying email OTP:", err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Invalid verification code. Email was not updated.";
      setEmailModalError(msg);
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // Address Edit Form
  const [addressForm, setAddressForm] = useState({
    address_line_1: "",
    address_line_2: "",
    landmark: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    country: "India",
  });

  // Security Forms
  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pinForm, setPinForm] = useState({ current_pin: "", new_pin: "", confirm_pin: "" });

  // Password & PIN Visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Security WhatsApp OTP Modal
  const [secOtpModalOpen, setSecOtpModalOpen] = useState(false);
  const [secOtpAction, setSecOtpAction] = useState<"PASSWORD" | "MPIN">("PASSWORD");
  const [secOtpCode, setSecOtpCode] = useState("");
  const [secOtpSending, setSecOtpSending] = useState(false);
  const [secOtpVerifying, setSecOtpVerifying] = useState(false);
  const [secOtpError, setSecOtpError] = useState<string | null>(null);
  const [secOtpResendTimer, setSecOtpResendTimer] = useState(0);
  const [secMaskedMobile, setSecMaskedMobile] = useState<string>("");

  // Universal Document Viewer Dialog
  const [selectedDoc, setSelectedDoc] = useState<{
    url: string;
    title: string;
    fileName: string;
    mimeType?: string;
  } | null>(null);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Countdown timer for Security WhatsApp OTP
  useEffect(() => {
    let interval: any = null;
    if (secOtpResendTimer > 0) {
      interval = setInterval(() => {
        setSecOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [secOtpResendTimer]);

  // Computed Password Rules Checklist
  const pwdRules = {
    length: pwdForm.new_password.length >= 8 && pwdForm.new_password.length <= 64,
    uppercase: /[A-Z]/.test(pwdForm.new_password),
    lowercase: /[a-z]/.test(pwdForm.new_password),
    number: /[0-9]/.test(pwdForm.new_password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwdForm.new_password),
    matches: Boolean(pwdForm.new_password && pwdForm.new_password === pwdForm.confirm_password),
  };
  const isPwdValid = Object.values(pwdRules).every(Boolean);

  // Computed MPIN Rules Checklist
  const isSequentialPin = (pin: string) => {
    const seqAsc = "0123456789012345";
    const seqDesc = "9876543210987654";
    return seqAsc.includes(pin) || seqDesc.includes(pin);
  };
  const isRepeatingPin = (pin: string) => {
    return pin.length > 0 && new Set(pin.split("")).size === 1;
  };

  const pinRules = {
    length: /^\d{4}$|^\d{6}$/.test(pinForm.new_pin),
    notRepeating: pinForm.new_pin.length >= 4 ? !isRepeatingPin(pinForm.new_pin) : true,
    notSequential: pinForm.new_pin.length >= 4 ? !isSequentialPin(pinForm.new_pin) : true,
    matches: Boolean(pinForm.new_pin && pinForm.new_pin === pinForm.confirm_pin),
  };
  const isPinValid = Boolean(
    /^\d{4}$|^\d{6}$/.test(pinForm.new_pin) &&
    !isRepeatingPin(pinForm.new_pin) &&
    !isSequentialPin(pinForm.new_pin) &&
    pinForm.new_pin === pinForm.confirm_pin
  );

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [data, compRes] = await Promise.all([
        retailerApi.getProfile(forceRefresh),
        api.get("/api/v1/company-profile/current").catch(() => null),
      ]);
      const companyProfileData = compRes?.data?.data || null;
      if (data) {
        setAvatarError(false);
        const mergedProfile = companyProfileData
          ? { ...data, company: { ...(data.company || {}), ...companyProfileData } }
          : data;
        setProfile(mergedProfile);
        setContactForm({
          alternate_mobile: data.contact?.alternate_mobile || "",
          whatsapp_number: data.contact?.whatsapp_number || "",
        });
        const perm = data.address?.permanent_address;
        if (perm) {
          setAddressForm({
            address_line_1: perm.address_line_1 || "",
            address_line_2: perm.address_line_2 || "",
            landmark: perm.landmark || "",
            city: perm.city || "",
            district: perm.district || "",
            state: perm.state || "",
            pincode: perm.pincode || "",
            country: perm.country || "India",
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching retailer profile:", err);
      setError(err?.message || "Unable to load profile information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.photo?.photo_url]);

  const handleCopy = (text?: string | null, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToast({ open: true, message: `${label || "Value"} copied to clipboard!`, severity: "success" });
  };

  const handleSaveContact = async () => {
    try {
      setSaving(true);
      await retailerApi.updateContact(contactForm);
      setToast({ open: true, message: "Contact details updated successfully!", severity: "success" });
      await fetchProfile(true);
    } catch (err: any) {
      setToast({ open: true, message: err?.message || "Unable to update contact details. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      setSaving(true);
      await retailerApi.updateAddress(addressForm);
      setToast({ open: true, message: "Registered address updated successfully!", severity: "success" });
      await fetchProfile(true);
    } catch (err: any) {
      setToast({ open: true, message: err?.message || "Unable to update address. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await retailerApi.uploadProfilePhoto(fd);
      if (res?.photo_url) {
        retailerApi.invalidateProfileCache();
        setAvatarError(false);
        setProfile((prev: any) =>
          prev
            ? {
                ...prev,
                photo: {
                  ...(prev.photo || {}),
                  photo_url: res.photo_url,
                  has_photo: true,
                },
              }
            : prev
        );
        setToast({ open: true, message: "Profile photo updated successfully.", severity: "success" });
        await fetchProfile(true);
      }
    } catch (err: any) {
      setToast({ open: true, message: err?.message || "Unable to upload photo. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleInitiatePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwdValid) {
      setToast({ open: true, message: "Please fulfill all password security rules before proceeding.", severity: "error" });
      return;
    }
    try {
      setSaving(true);
      setSecOtpError(null);
      setSecOtpCode("");
      const res = await retailerApi.sendSecurityWhatsAppOtp("PASSWORD");
      setSecOtpAction("PASSWORD");
      setSecMaskedMobile(res?.masked_mobile || (profile?.contact?.mobile_raw ? `+91 ******${profile.contact.mobile_raw.slice(-4)}` : "your registered WhatsApp number"));
      setSecOtpResendTimer(60);
      setSecOtpModalOpen(true);
      setToast({ open: true, message: res?.message || "WhatsApp authorization OTP sent successfully.", severity: "info" });
    } catch (err: any) {
      setToast({ open: true, message: err?.response?.data?.detail || err?.message || "Unable to send WhatsApp OTP.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleInitiatePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPinValid) {
      setToast({ open: true, message: "Please fulfill all MPIN security rules before proceeding.", severity: "error" });
      return;
    }
    try {
      setSaving(true);
      setSecOtpError(null);
      setSecOtpCode("");
      const res = await retailerApi.sendSecurityWhatsAppOtp("MPIN");
      setSecOtpAction("MPIN");
      setSecMaskedMobile(res?.masked_mobile || (profile?.contact?.mobile_raw ? `+91 ******${profile.contact.mobile_raw.slice(-4)}` : "your registered WhatsApp number"));
      setSecOtpResendTimer(60);
      setSecOtpModalOpen(true);
      setToast({ open: true, message: res?.message || "WhatsApp authorization OTP sent successfully.", severity: "info" });
    } catch (err: any) {
      setToast({ open: true, message: err?.response?.data?.detail || err?.message || "Unable to send WhatsApp OTP.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleResendSecOtp = async () => {
    if (secOtpResendTimer > 0 || secOtpSending) return;
    try {
      setSecOtpSending(true);
      setSecOtpError(null);
      const res = await retailerApi.sendSecurityWhatsAppOtp(secOtpAction);
      setSecOtpResendTimer(60);
      setToast({ open: true, message: res?.message || "WhatsApp OTP resent successfully.", severity: "info" });
    } catch (err: any) {
      setSecOtpError(err?.response?.data?.detail || err?.message || "Failed to resend WhatsApp OTP.");
    } finally {
      setSecOtpSending(false);
    }
  };

  const handleVerifyAndSubmitSecurity = async () => {
    if (!secOtpCode || secOtpCode.trim().length < 4) {
      setSecOtpError("Please enter the 6-digit WhatsApp OTP code.");
      return;
    }
    try {
      setSecOtpVerifying(true);
      setSecOtpError(null);
      if (secOtpAction === "PASSWORD") {
        const res = await retailerApi.changePassword({
          current_password: pwdForm.current_password || undefined,
          new_password: pwdForm.new_password,
          confirm_password: pwdForm.confirm_password,
          otp_code: secOtpCode.trim(),
        });
        setToast({ open: true, message: res?.message || "Account password updated successfully!", severity: "success" });
        setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
        setSecOtpModalOpen(false);
        await fetchProfile(true);
      } else {
        const res = await retailerApi.changeMpin({
          current_pin: pinForm.current_pin || undefined,
          new_pin: pinForm.new_pin,
          confirm_pin: pinForm.confirm_pin,
          otp_code: secOtpCode.trim(),
        });
        setToast({ open: true, message: res?.message || "Transaction MPIN updated successfully!", severity: "success" });
        setPinForm({ current_pin: "", new_pin: "", confirm_pin: "" });
        setSecOtpModalOpen(false);
        await fetchProfile(true);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Invalid WhatsApp OTP code. Changes were NOT saved to the database.";
      setSecOtpError(msg);
    } finally {
      setSecOtpVerifying(false);
    }
  };

  const tabs = [
    { label: "Personal", icon: <User size={18} /> },
    { label: "Contact", icon: <Phone size={18} /> },
    { label: "Address", icon: <MapPin size={18} /> },
    { label: "KYC", icon: <Shield size={18} /> },
    { label: "Bank", icon: <CreditCard size={18} /> },
    { label: "Security", icon: <Lock size={18} /> },
    { label: "Photo", icon: <Camera size={18} /> },
    { label: "RM", icon: <Briefcase size={18} /> },
    { label: "Location", icon: <Navigation size={18} /> },
    { label: "Company", icon: <Building size={18} /> },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: "75vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress size={48} sx={{ color: brandPrimary }} />
        <Typography variant="body1" sx={{ color: "#625B60", fontWeight: 600 }}>
          Loading profile...
        </Typography>
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error || "Unable to load profile information."}
        </Alert>
        <Button variant="contained" onClick={() => fetchProfile(true)} startIcon={<RefreshCw size={18} />} sx={{ bgcolor: brandPrimary, "&:hover": { bgcolor: brandHover } }}>
          Retry
        </Button>
      </Box>
    );
  }

  const normalizeAssetUrl = (u?: string | null) => {
    if (!u || typeof u !== "string") return "";
    const trimmed = u.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
    return trimmed;
  };
  const resolvedCompanyLogo = normalizeAssetUrl(profile.company?.logo_url) || normalizeAssetUrl(brandLogo) || brandMark;
  const resolvedCompanyBrand = profile.company?.brand_name || brandDisplayName;
  const resolvedCompanyLegal = profile.company?.company_legal_name || profile.company?.company_name || brandCompanyName;
  const resolvedCompanyWebsite = profile.company?.official_website_url || profile.company?.website_url || defaultWebsiteUrl;
  const siteHostClean = resolvedCompanyWebsite ? resolvedCompanyWebsite.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "";
  const defaultSupportEmail = profile.company?.support_email || (siteHostClean ? `support@${siteHostClean}` : "");
  const defaultGrievanceEmail = profile.company?.grievance_escalation_email || profile.company?.grievance_email || (siteHostClean ? `grievance@${siteHostClean}` : "");
  const defaultHeadquarters = profile.company?.registered_office_address || profile.company?.headquarters || (resolvedCompanyLegal ? `${resolvedCompanyLegal}, India` : "");
  const resolvedProfilePhoto = normalizeAssetUrl(profile.photo?.photo_url);

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", pb: 8 }}>
      {/* ── 1. DOMAIN-BRANDED ENTERPRISE PROFILE HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6 overflow-hidden rounded-3xl border shadow-xl transition-all duration-300"
        style={{
          background: `var(--brand-gradient, linear-gradient(115deg, var(--brand-primary, ${brandPrimary}) 0%, var(--brand-primary, ${brandPrimary}) 60%, var(--brand-secondary, ${brandSecondary}) 100%))`,
          borderColor: `var(--brand-border, ${brandBorder})`,
          boxShadow: `0 18px 36px -14px ${brandPrimary}55`,
        }}
      >
        {/* Crisp readability depth overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(120deg, rgba(15, 23, 42, 0.28) 0%, rgba(15, 23, 42, 0.16) 55%, rgba(15, 23, 42, 0.32) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, #FFFFFF88, transparent)`,
          }}
        />

        <div className="relative z-10 p-5 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar + Retailer Identity Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
            {/* Animated Profile Avatar */}
            <div className="relative group shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 shadow-2xl transition-transform duration-300 group-hover:scale-105 bg-white/25 backdrop-blur-sm"
                style={{
                  border: "1.5px solid rgba(255, 255, 255, 0.55)",
                }}
              >
                <div
                  className="w-full h-full rounded-[14px] overflow-hidden flex items-center justify-center relative"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
                >
                  {resolvedProfilePhoto && !avatarError ? (
                    <img
                      src={resolvedProfilePhoto}
                      alt={profile.personal.owner_name || profile.personal.retailer_name || "Profile"}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {profile.personal.owner_name
                        ? String(profile.personal.owner_name).charAt(0).toUpperCase()
                        : profile.personal.retailer_name
                        ? String(profile.personal.retailer_name).charAt(0).toUpperCase()
                        : "R"}
                    </span>
                  )}
                  {/* Photo Upload Overlay Button on Hover */}
                  <label
                    htmlFor="hero-avatar-upload"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200"
                    title="Change Profile Photo"
                  >
                    <Camera className="w-6 h-6 text-white drop-shadow-md" />
                    <span className="text-[10px] font-bold text-white mt-1">Upload</span>
                  </label>
                  <input
                    id="hero-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
              {/* Online / Active Terminal Pulse Indicator */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                style={{ backgroundColor: "#16A34A" }}
                title="Active Retailer Terminal"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Retailer Name, Store & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs flex items-center gap-2">
                  <span>{profile.personal.owner_name || profile.personal.retailer_name || "Retailer Partner"}</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-200 border border-emerald-400/40 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Retailer</span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm bg-slate-950/45 border border-white/25 text-white"
                >
                  <span className="w-4 h-4 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                    <img
                      src={resolvedCompanyLogo}
                      alt={resolvedCompanyBrand}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = brandMark;
                      }}
                    />
                  </span>
                  <span>{resolvedCompanyBrand} Network</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-white/90 font-medium">
                {profile.personal.store_name ? `${profile.personal.store_name} · ` : ""}{profile.personal.store_type || "Retailer Business"} · {profile.personal.business_category || "FinTech & Banking Correspondent"}
              </p>

              {/* Quick Interactive Meta Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Retailer ID Pill with Copy */}
                <button
                  type="button"
                  onClick={() => handleCopy(profile.personal.retailer_id, "Retailer ID")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/40 hover:bg-slate-950/55 border border-white/25 text-white text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
                  title="Click to copy Retailer ID"
                >
                  <span className="text-white/75 font-sans font-normal">ID:</span>
                  <span className="text-amber-200">{profile.personal.retailer_id || "RET"}</span>
                  <Copy className="w-3.5 h-3.5 text-white/75" />
                </button>

                {/* Phone Pill */}
                {profile.contact?.mobile_raw && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/35 border border-white/20 text-white text-xs font-mono">
                    <Phone className="w-3.5 h-3.5 text-white/80" />
                    <span>{profile.contact.mobile_raw}</span>
                  </span>
                )}

                {/* Email Pill */}
                {profile.contact?.email_raw && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/35 border border-white/20 text-white text-xs">
                    <Mail className="w-3.5 h-3.5 text-white/80" />
                    <span className="truncate max-w-[180px] sm:max-w-none">{profile.contact.email_raw}</span>
                  </span>
                )}

                {/* Account Status Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/55 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{profile.personal.status || "ACTIVE"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Dedicated Enterprise Brand Badge Card */}
          <div className="hidden xl:flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/25 shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
              <img
                src={resolvedCompanyLogo}
                alt={resolvedCompanyBrand}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = brandMark;
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-tight">{resolvedCompanyBrand}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40">
                  Official
                </span>
              </div>
              <span className="text-[11px] font-semibold text-white/90 truncate max-w-[200px]">
                {resolvedCompanyLegal}
              </span>
              {resolvedCompanyWebsite && (
                <span className="text-[10px] text-white/75 font-mono">
                  {resolvedCompanyWebsite.replace(/^https?:\/\//, "")}
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick Action Navigation Shortcuts */}
          <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/20 lg:pl-6">
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-950/35 hover:bg-slate-950/55 border border-white/25 transition-all active:scale-95 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-white/85" />
              <span>Edit Contact</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(5)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-950/35 hover:bg-slate-950/55 border border-white/25 transition-all active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Security & MPIN</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(9)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-white hover:bg-white/90 transition-all shadow-md active:scale-95 cursor-pointer"
              style={{ color: brandPrimary }}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Corporate Desk</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 2. MOTIONSITES.AI ANIMATED TAB STRIP ── */}
      <div className="relative mb-6 overflow-x-auto p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === idx;
            return (
              <motion.button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? "text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeProfileTabPill"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`,
                      boxShadow: `0 4px 14px ${brandPrimary}40`,
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── 3. ANIMATED TAB PANELS ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 1. PERSONAL TAB */}
          {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Personal & Identity Details
              </Typography>
              <Stack spacing={2}>
                <DataRow label="Retailer / Merchant Name" value={profile.personal.owner_name || profile.personal.retailer_name} />
                <DataRow label="Store / Outlet Name" value={profile.personal.store_name || profile.personal.retailer_name} />
                <DataRow label="First Name" value={profile.personal.first_name || (profile.personal.owner_name ? profile.personal.owner_name.split(" ")[0] : null)} />
                <DataRow label="Middle Name" value={profile.personal.middle_name} />
                <DataRow label="Last Name" value={profile.personal.last_name || (profile.personal.owner_name && profile.personal.owner_name.split(" ").length > 1 ? profile.personal.owner_name.split(" ").slice(1).join(" ") : null)} />
                <DataRow label="Date of Birth" value={profile.personal.dob} />
                <DataRow label="Gender" value={profile.personal.gender} />
                <DataRow label="Father's Name" value={profile.personal.father_name} />
                <DataRow label="Mother's Name" value={profile.personal.mother_name} />
                <DataRow label="Nationality" value={profile.personal.nationality || "Indian"} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Registration & Status
              </Typography>
              <Stack spacing={2}>
                <DataRow
                  label="Retailer ID"
                  value={profile.personal.retailer_id}
                  onCopy={() => handleCopy(profile.personal.retailer_id, "Retailer ID")}
                />
                <DataRow
                  label="Application Reference"
                  value={profile.personal.application_reference}
                  onCopy={() => handleCopy(profile.personal.application_reference, "Application Reference")}
                />
                <DataRow label="Business Category" value={profile.personal.business_category} />
                <DataRow label="Store Type" value={profile.personal.store_type} />
                <DataRow label="Affiliated Enterprise Network" value={`${brandDisplayName} (${profile.company?.company_name || brandCompanyName})`} />
                <DataRow label="Account Status" value={profile.personal.status} isStatus />
                <DataRow
                  label="Registered Date"
                  value={profile.personal.registered_date ? new Date(profile.personal.registered_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Active Registered Merchant"}
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 2. CONTACT TAB */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Verified Primary Channels
              </Typography>
              <Stack spacing={2.5}>
                <Box sx={fieldBoxStyle}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={labelStyle}>
                      Mobile Number
                    </Typography>
                    <Chip
                      icon={<CheckCircle2 size={13} color="#22C55E" />}
                      label={profile.contact.mobile_status || "VERIFIED"}
                      size="small"
                      sx={verifiedBadgeStyle}
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="body1" sx={{ color: "#0F172A", fontWeight: 700 }}>
                      {profile.contact.mobile_masked || "—"}
                    </Typography>
                    {profile.contact.mobile_raw && (
                      <IconButton size="small" onClick={() => handleCopy(profile.contact.mobile_raw, "Mobile Number")} sx={{ color: "#625B60", "&:hover": { color: "#60A5FA" } }}>
                        <Copy size={15} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>

                <Box sx={fieldBoxStyle}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={labelStyle}>
                      Email Address
                    </Typography>
                    <Chip
                      icon={<CheckCircle2 size={13} color="#22C55E" />}
                      label={profile.contact.email_status || "VERIFIED"}
                      size="small"
                      sx={verifiedBadgeStyle}
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="body1" sx={{ color: "#0F172A", fontWeight: 700 }}>
                      {profile.contact.email_masked || "—"}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {profile.contact.email_raw && (
                        <IconButton size="small" onClick={() => handleCopy(profile.contact.email_raw, "Email Address")} sx={{ color: "#625B60", "&:hover": { color: "#60A5FA" } }}>
                          <Copy size={15} />
                        </IconButton>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleOpenEmailModal}
                        startIcon={<Mail size={13} />}
                        sx={{
                          borderColor: brandBorder,
                          color: brandPrimary,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          py: 0.3,
                          px: 1.2,
                          borderRadius: 1.5,
                          textTransform: "none",
                          "&:hover": {
                            borderColor: brandPrimary,
                            bgcolor: brandLight,
                          },
                        }}
                      >
                        Update Email
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Alternate Contact Information
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Alternate Mobile"
                  value={contactForm.alternate_mobile}
                  onChange={(e) => setContactForm({ ...contactForm, alternate_mobile: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="Enter alternate mobile number (optional)"
                />
                <TextField
                  label="WhatsApp Number"
                  value={contactForm.whatsapp_number}
                  onChange={(e) => setContactForm({ ...contactForm, whatsapp_number: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="Enter WhatsApp contact number (optional)"
                />
                <Button
                  variant="contained"
                  onClick={handleSaveContact}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                  sx={{ bgcolor: brandPrimary, fontWeight: 700, borderRadius: 2, "&:hover": { bgcolor: brandHover } }}
                >
                  {saving ? "Saving..." : "Save Contact Updates"}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* ── COMPANY & CORPORATE SUPPORT CONTACT INFO ── */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                ...cardStyle,
                position: "relative",
                overflow: "hidden",
                background: `var(--brand-gradient, linear-gradient(125deg, var(--brand-primary, ${brandPrimary}) 0%, var(--brand-primary, ${brandPrimary}) 62%, var(--brand-secondary, ${brandSecondary}) 100%))`,
                border: `1.5px solid var(--brand-border, ${brandBorder})`,
                boxShadow: `0 16px 36px -14px ${brandPrimary}55`,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.34) 0%, rgba(15, 23, 42, 0.22) 60%, rgba(15, 23, 42, 0.38) 100%)",
                }}
              />
              <Box sx={{ position: "relative", zIndex: 1 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 3 }} spacing={2}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ width: 52, height: 52, p: 0.75, bgcolor: "#FFFFFF", borderRadius: 2.5, border: "1.5px solid rgba(255, 255, 255, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.22)", flexShrink: 0 }}>
                      <img
                        src={resolvedCompanyLogo}
                        alt={resolvedCompanyBrand}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.dataset.fallbackApplied) {
                            img.dataset.fallbackApplied = "1";
                            img.src = brandMark;
                          }
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                        {resolvedCompanyLegal}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.85)", display: "block", fontWeight: 500 }}>
                        {resolvedCompanyBrand} Corporate Headquarters & Official Merchant Support Helpdesk
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Chip
                  icon={<ShieldCheck size={14} color="#4ADE80" />}
                  label={profile.company?.regulatory_status_badge || "NPCI / RBI Authorized FinTech"}
                  size="small"
                  sx={{ bgcolor: "rgba(15, 23, 42, 0.45)", color: "#86EFAC", fontWeight: 700, border: "1px solid rgba(74, 222, 128, 0.4)" }}
                />
              </Stack>

              <Grid container spacing={2.5}>
                {/* Toll Free Helpline */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(15, 23, 42, 0.34)", backdropFilter: "blur(8px)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.2)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Headphones size={18} color="#FFFFFF" />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", fontWeight: 700, textTransform: "uppercase" }}>
                        Support Helpline
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 800 }}>
                      {profile.company?.support_helpline || profile.company?.support_phone || "1800 292 982"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.72)", display: "block", mb: 1.5 }}>
                      Toll-Free & Direct Line
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`tel:${(profile.company?.support_helpline || profile.company?.support_phone || "1800292982").replace(/\s+/g, "")}`}
                        variant="contained"
                        size="small"
                        startIcon={<PhoneCall size={13} />}
                        sx={{ bgcolor: "#FFFFFF", color: `var(--brand-primary, ${brandPrimary})`, fontWeight: 800, fontSize: "0.75rem", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.9)" } }}
                      >
                        Call
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.support_helpline || profile.company?.support_phone || "1800 292 982", "Support Phone")} sx={{ color: "rgba(255, 255, 255, 0.85)" }}>
                        <Copy size={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>

                {/* Official Support Email */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(15, 23, 42, 0.34)", backdropFilter: "blur(8px)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.2)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Mail size={18} color="#FFFFFF" />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", fontWeight: 700, textTransform: "uppercase" }}>
                        Support Desk Email
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 800, wordBreak: "break-word" }}>
                      {profile.company?.support_email || defaultSupportEmail}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.72)", display: "block", mb: 1.5 }}>
                      24/7 Ticketing Response
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`mailto:${profile.company?.support_email || defaultSupportEmail}?subject=Retailer%20Support%20Enquiry`}
                        variant="contained"
                        size="small"
                        startIcon={<Mail size={13} />}
                        sx={{ bgcolor: `var(--brand-primary, ${brandPrimary})`, color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.35)", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: `var(--brand-secondary, ${brandHover})` } }}
                      >
                        Email
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.support_email || defaultSupportEmail, "Support Email")} sx={{ color: "rgba(255, 255, 255, 0.85)" }}>
                        <Copy size={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>

                {/* WhatsApp Support Desk */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(15, 23, 42, 0.34)", backdropFilter: "blur(8px)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.2)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <MessageSquare size={18} color="#4ADE80" />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", fontWeight: 700, textTransform: "uppercase" }}>
                        WhatsApp Helpdesk
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 800 }}>
                      {profile.company?.whatsapp_number || "+91 70139 14767"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.72)", display: "block", mb: 1.5 }}>
                      Instant Merchant Chat
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`https://wa.me/${(profile.company?.whatsapp_number || "917013914767").replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${resolvedCompanyBrand} Support, I need assistance with my Retailer Account.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        size="small"
                        startIcon={<MessageSquare size={13} />}
                        sx={{ bgcolor: "#16A34A", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#15803D" } }}
                      >
                        WhatsApp
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.whatsapp_number || "+91 70139 14767", "WhatsApp Number")} sx={{ color: "rgba(255, 255, 255, 0.85)" }}>
                        <Copy size={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>

                {/* Operating Hours */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(15, 23, 42, 0.34)", backdropFilter: "blur(8px)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.2)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Clock size={18} color="#FDE047" />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", fontWeight: 700, textTransform: "uppercase" }}>
                        Operating Hours
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, mt: 0.5 }}>
                      {profile.company?.operating_hours || profile.company?.support_hours || "Mon - Sat | 09:00 AM - 07:00 PM"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.72)", display: "block", mt: 0.5 }}>
                      Sunday: Automated Ticketing
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2.5, borderColor: "rgba(255, 255, 255, 0.22)" }} />

              {/* Corporate Metadata & Office Address */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", fontWeight: 700, textTransform: "uppercase", display: "block", mb: 0.5 }}>
                    Registered Corporate Headquarters
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 500 }}>
                    {profile.company?.registered_office_address || profile.company?.headquarters || defaultHeadquarters}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack direction="row" spacing={3} justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
                    <Box>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", display: "block" }}>
                        Corporate Entity Status
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 700, fontFamily: "monospace" }}>
                        {profile.company?.cin_number || profile.company?.cin || profile.company?.operating_status || "ACTIVE & REGULATED"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.78)", display: "block" }}>
                        Grievance Email
                      </Typography>
                      <Typography
                        component="a"
                        href={`mailto:${profile.company?.grievance_escalation_email || profile.company?.grievance_email || defaultGrievanceEmail}`}
                        variant="caption"
                        sx={{ color: "#FFFFFF", fontWeight: 700, textDecoration: "underline" }}
                      >
                        {profile.company?.grievance_escalation_email || profile.company?.grievance_email || defaultGrievanceEmail}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 3. ADDRESS TAB */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                PERMANENT ADDRESS
              </Typography>
              <Stack spacing={1.5}>
                <DataRow label="Address Type" value={profile.address.permanent_address?.address_type || "STORE / PREMISES"} />
                <DataRow label="Address Line 1" value={profile.address.permanent_address?.address_line_1} />
                <DataRow label="Address Line 2" value={profile.address.permanent_address?.address_line_2} />
                <DataRow label="Landmark" value={profile.address.permanent_address?.landmark} />
                <DataRow label="City" value={profile.address.permanent_address?.city} />
                <DataRow label="District" value={profile.address.permanent_address?.district} />
                <DataRow label="State" value={profile.address.permanent_address?.state} />
                <DataRow label="Country" value={profile.address.permanent_address?.country || "India"} />
                <DataRow label="PIN Code" value={profile.address.permanent_address?.pincode} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                COMMUNICATION ADDRESS
              </Typography>
              {profile.address.same_as_permanent ? (
                <Box sx={{ p: 3, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 2.5, border: `1px dashed ${brandBorder}` }}>
                  <ShieldCheck size={36} color={brandPrimary} style={{ margin: "0 auto 8px" }} />
                  <Typography variant="body1" sx={{ color: "#292329", fontWeight: 700 }}>
                    Same as Permanent Address
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#625B60", mt: 0.5, display: "block" }}>
                    Official notices, hardware dispatches, and tax statements route to the permanent address.
                  </Typography>
                </Box>
              ) : profile.address.communication_address ? (
                <Stack spacing={1.5}>
                  <DataRow label="Address Type" value={profile.address.communication_address.address_type} />
                  <DataRow label="Address Line 1" value={profile.address.communication_address.address_line_1} />
                  <DataRow label="Address Line 2" value={profile.address.communication_address.address_line_2} />
                  <DataRow label="Landmark" value={profile.address.communication_address.landmark} />
                  <DataRow label="City" value={profile.address.communication_address.city} />
                  <DataRow label="District" value={profile.address.communication_address.district} />
                  <DataRow label="State" value={profile.address.communication_address.state} />
                  <DataRow label="Country" value={profile.address.communication_address.country} />
                  <DataRow label="PIN Code" value={profile.address.communication_address.pincode} />
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "#625B60" }}>
                  No separate communication address registered.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 4. KYC TAB */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* PAN IDENTIFICATION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  PAN Identification
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={13} color="#22C55E" />}
                  label={profile.kyc.pan?.verification_status || "VALID"}
                  size="small"
                  sx={verifiedBadgeStyle}
                />
              </Stack>
              <Stack spacing={1.5}>
                <DataRow
                  label="PAN Number"
                  value={profile.kyc.pan?.masked}
                  onCopy={() => handleCopy(profile.kyc.pan?.masked, "PAN Number")}
                />
                <DataRow label="Verification Status" value={profile.kyc.pan?.verification_status} isStatus />
                <DataRow
                  label="Verification Date"
                  value={profile.kyc.pan?.verification_date ? new Date(profile.kyc.pan.verification_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                />
                <DataRow label="Verification Provider" value={profile.kyc.pan?.provider} />
                <DataRow label="Provider Reference" value={profile.kyc.pan?.provider_reference} />
                <DataRow label="KYC Status" value={profile.kyc.pan?.kyc_status} isStatus />
              </Stack>

              {/* PAN Document Attachment Box */}
              {profile.kyc.pan?.document_url && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: "rgba(59, 130, 246, 0.08)", borderRadius: 2.5, border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
                        <FileCheck size={20} color="#60A5FA" />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#625B60", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                          Verification Document
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700, wordBreak: "break-all" }}>
                          {profile.kyc.pan?.file_name || "PAN_Card_Document.pdf"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#625B60" }}>
                          {formatFileSize(profile.kyc.pan?.file_size_bytes)} • Verified Document
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Eye size={13} />}
                        onClick={() => setSelectedDoc({
                          url: profile.kyc.pan?.document_url!,
                          title: "PAN Card Document",
                          fileName: profile.kyc.pan?.file_name || "pan_card.pdf",
                          mimeType: profile.kyc.pan?.mime_type || undefined
                        })}
                        sx={{ bgcolor: brandPrimary, fontWeight: 700, fontSize: "0.75rem", textTransform: "none", "&:hover": { bgcolor: brandHover } }}
                      >
                        View
                      </Button>
                      <IconButton
                        size="small"
                        component="a"
                        href={profile.kyc.pan?.document_url}
                        download={profile.kyc.pan?.file_name || "pan_card"}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "#625B60", bgcolor: "rgba(255, 255, 255, 0.05)", "&:hover": { color: "#FFFFFF" } }}
                      >
                        <Download size={15} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* AADHAAR IDENTIFICATION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  Aadhaar Identification
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={13} color="#22C55E" />}
                  label={profile.kyc.aadhaar?.verification_status || "VERIFIED"}
                  size="small"
                  sx={verifiedBadgeStyle}
                />
              </Stack>
              <Stack spacing={1.5}>
                <DataRow
                  label="Aadhaar Number"
                  value={profile.kyc.aadhaar?.masked}
                  onCopy={() => handleCopy(profile.kyc.aadhaar?.masked, "Aadhaar Number")}
                />
                <DataRow label="Verification Status" value={profile.kyc.aadhaar?.verification_status} isStatus />
                <DataRow
                  label="Verification Date"
                  value={profile.kyc.aadhaar?.verification_date ? new Date(profile.kyc.aadhaar.verification_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                />
                <DataRow label="Verification Provider" value={profile.kyc.aadhaar?.provider} />
                <DataRow label="Provider Reference" value={profile.kyc.aadhaar?.provider_reference} />
                <DataRow label="KYC Status" value={profile.kyc.aadhaar?.kyc_status} isStatus />
              </Stack>

              {/* Aadhaar Document Attachment Box */}
              {(profile.kyc.aadhaar?.front_document_url || profile.kyc.aadhaar?.document_url) && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: "rgba(34, 197, 94, 0.08)", borderRadius: 2.5, border: "1px solid rgba(34, 197, 94, 0.25)" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ p: 1, bgcolor: "rgba(34, 197, 94, 0.15)", borderRadius: 2 }}>
                        <FileCheck size={20} color="#4ADE80" />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#625B60", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                          Verification Document
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700, wordBreak: "break-all" }}>
                          {profile.kyc.aadhaar?.front_file_name || "Aadhaar_Document.pdf"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#625B60" }}>
                          {formatFileSize(profile.kyc.aadhaar?.front_file_size)} • eKYC Proof
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Eye size={13} />}
                        onClick={() => setSelectedDoc({
                          url: (profile.kyc.aadhaar?.front_document_url || profile.kyc.aadhaar?.document_url)!,
                          title: "Aadhaar Card (Front)",
                          fileName: profile.kyc.aadhaar?.front_file_name || "aadhaar_front.pdf",
                        })}
                        sx={{ bgcolor: "#16A34A", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", "&:hover": { bgcolor: "#15803D" } }}
                      >
                        View Front
                      </Button>
                      {profile.kyc.aadhaar?.back_document_url && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Eye size={13} />}
                          onClick={() => setSelectedDoc({
                            url: profile.kyc.aadhaar?.back_document_url!,
                            title: "Aadhaar Card (Back)",
                            fileName: profile.kyc.aadhaar?.back_file_name || "aadhaar_back.pdf",
                          })}
                          sx={{ color: "#4ADE80", borderColor: "rgba(74, 222, 128, 0.4)", fontWeight: 700, fontSize: "0.75rem", textTransform: "none" }}
                        >
                          View Back
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        component="a"
                        href={profile.kyc.aadhaar?.front_document_url || profile.kyc.aadhaar?.document_url || "#"}
                        download={profile.kyc.aadhaar?.front_file_name || "aadhaar_document"}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "#625B60", bgcolor: "rgba(255, 255, 255, 0.05)", "&:hover": { color: "#FFFFFF" } }}
                      >
                        <Download size={15} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* GST CARD IF PRESENT */}
          {profile.kyc.gst && (
            <Grid size={{ xs: 12 }}>
              <Paper elevation={0} sx={cardStyle}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  GST Registration
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <DataRow
                      label="GSTIN"
                      value={profile.kyc.gst.masked}
                      onCopy={() => handleCopy(profile.kyc.gst.masked, "GSTIN")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <DataRow label="Legal Business Name" value={profile.kyc.gst.legal_business_name} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <DataRow label="GST Status" value={profile.kyc.gst.status} isStatus />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* KYC & VERIFICATION DOCUMENT REPOSITORY (FULL-WIDTH) */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                ...cardStyle,
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, #FFFFFF 100%)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 3 }} spacing={1.5}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
                      <FileCheck size={22} color="#60A5FA" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                        KYC & Verification Document Repository
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#625B60" }}>
                        Authoritative government identity and premise verification proof uploaded for regulatory compliance
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Chip
                  icon={<ShieldCheck size={14} color="#22C55E" />}
                  label="NPCI & RBI Compliant eKYC"
                  size="small"
                  sx={{ bgcolor: "rgba(34, 197, 94, 0.12)", color: "#4ADE80", fontWeight: 700, border: "1px solid rgba(34, 197, 94, 0.25)" }}
                />
              </Stack>

              {profile.kyc.documents && profile.kyc.documents.length > 0 ? (
                <Grid container spacing={2.5}>
                  {profile.kyc.documents.map((doc, idx) => (
                    <Grid key={doc.id || idx} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Box
                        sx={{
                          p: 2.2,
                          bgcolor: "rgba(255, 255, 255, 0.03)",
                          borderRadius: 2.5,
                          border: "1px solid #E8E2E5",
                          transition: "all 0.2s ease-in-out",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 160,
                          "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 0.05)",
                            borderColor: "rgba(59, 130, 246, 0.4)",
                            transform: "translateY(-2px)",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                          },
                        }}
                      >
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                            <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.12)", borderRadius: 2 }}>
                              <FileText size={20} color="#60A5FA" />
                            </Box>
                            <Chip
                              icon={<CheckCircle2 size={12} color="#22C55E" />}
                              label={doc.is_verified ? "VERIFIED" : "PENDING"}
                              size="small"
                              sx={verifiedBadgeStyle}
                            />
                          </Stack>
                          <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 700, mb: 0.5 }}>
                            {doc.title || doc.doc_type}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#625B60", display: "block", wordBreak: "break-all", mb: 0.5 }}>
                            {doc.file_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#625B60", display: "block" }}>
                            Size: {formatFileSize(doc.file_size_bytes)} {doc.uploaded_at ? `• ${new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ mt: 2, pt: 1.5, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            startIcon={<Eye size={14} />}
                            onClick={() => setSelectedDoc({
                              url: doc.file_url,
                              title: doc.title || doc.doc_type,
                              fileName: doc.file_name,
                              mimeType: doc.mime_type
                            })}
                            sx={{ bgcolor: brandPrimary, fontWeight: 700, fontSize: "0.75rem", textTransform: "none", "&:hover": { bgcolor: brandHover } }}
                          >
                            View Document
                          </Button>
                          <Tooltip title="Download File">
                            <IconButton
                              size="small"
                              component="a"
                              href={doc.file_url}
                              download={doc.file_name || "document"}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: "#625B60", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.1)" } }}
                            >
                              <Download size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open in New Tab">
                            <IconButton
                              size="small"
                              component="a"
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: "#625B60", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.1)" } }}
                            >
                              <ExternalLink size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ p: 3, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 2.5, border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                  <Typography variant="body2" sx={{ color: "#625B60" }}>
                    No additional KYC documents stored in repository.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 5. BANK TAB */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          {/* PRIMARY SETTLEMENT ACCOUNT */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  Primary Settlement Account
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={13} color="#22C55E" />}
                  label={profile.bank?.verification_status || "VERIFIED"}
                  size="small"
                  sx={verifiedBadgeStyle}
                />
              </Stack>

              {profile.bank ? (
                <Stack spacing={1.5}>
                  <DataRow label="Account Holder Name" value={profile.bank.account_holder_name} />
                  <DataRow label="Bank Name" value={profile.bank.bank_name} />
                  <DataRow
                    label="Account Number"
                    value={profile.bank.account_number_masked}
                    onCopy={() => handleCopy(profile.bank?.account_number_masked, "Account Number")}
                  />
                  <DataRow label="IFSC Code" value={profile.bank.ifsc} onCopy={() => handleCopy(profile.bank?.ifsc, "IFSC")} />
                  <DataRow label="Branch" value={profile.bank.branch} />
                  <DataRow label="Account Type" value={profile.bank.account_type} />
                  <DataRow label="Verification Status" value={profile.bank.verification_status} isStatus />
                  <DataRow
                    label="Verification Date"
                    value={profile.bank.verification_date ? new Date(profile.bank.verification_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  />
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "#625B60" }}>
                  No settlement bank account currently registered.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* BANK SETTLEMENT PROOF DOCUMENT */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  Bank Settlement Proof Document
                </Typography>
                <Chip
                  icon={<ShieldCheck size={13} color="#22C55E" />}
                  label="VERIFIED PROOF"
                  size="small"
                  sx={verifiedBadgeStyle}
                />
              </Stack>

              <Typography variant="body2" sx={{ color: "#625B60", mb: 2 }}>
                Passbook copy or Cancelled Cheque submitted for NPCI settlement authentication and beneficiary registry verification.
              </Typography>

              {profile.bank?.document_url ? (
                <Box sx={{ p: 2.2, bgcolor: "rgba(59, 130, 246, 0.08)", borderRadius: 2.5, border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 1.5, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2.5 }}>
                      <Landmark size={26} color="#60A5FA" />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "#625B60", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                        Submitted Proof Document
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700, wordBreak: "break-all" }}>
                        {profile.bank?.document_file_name || "Settlement_Bank_Proof.pdf"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#625B60", display: "block", mt: 0.3 }}>
                        Size: {formatFileSize(profile.bank?.document_file_size)} • NPCI Penny Drop Verified
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1.8, borderColor: "#E8E2E5" }} />

                  <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Eye size={14} />}
                      onClick={() => setSelectedDoc({
                        url: profile.bank?.document_url!,
                        title: "Bank Settlement Proof Document",
                        fileName: profile.bank?.document_file_name || "bank_proof.pdf",
                        mimeType: profile.bank?.document_mime_type || undefined
                      })}
                      sx={{ bgcolor: brandPrimary, fontWeight: 700, fontSize: "0.78rem", textTransform: "none", "&:hover": { bgcolor: brandHover } }}
                    >
                      View Proof Document
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Download size={14} />}
                      component="a"
                      href={profile.bank?.document_url}
                      download={profile.bank?.document_file_name || "bank_proof"}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: "#625B60", borderColor: "#E8E2E5", fontSize: "0.78rem", textTransform: "none", "&:hover": { color: "#0F172A", borderColor: "#0F172A" } }}
                    >
                      Download
                    </Button>
                    <Tooltip title="Open in New Tab">
                      <IconButton
                        size="small"
                        component="a"
                        href={profile.bank?.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "#625B60", bgcolor: "rgba(0, 0, 0, 0.04)", border: "1px solid #E8E2E5", "&:hover": { color: "#0F172A" } }}
                      >
                        <ExternalLink size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ p: 2.5, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 2.5, border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                  <Typography variant="body2" sx={{ color: "#625B60" }}>
                    Bank details authenticated via Instant Reverse Penny Drop.
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2, p: 1.5, bgcolor: "rgba(2, 132, 199, 0.1)", borderRadius: 2, border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                <Typography variant="caption" sx={{ color: "#0284C7", display: "block" }}>
                  <strong>Compliance Notice:</strong> Retailer wallet cashouts and payouts are directly credited to this validated bank account under RBI & NPCI settlement framework.
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* REGISTERED BANK ACCOUNTS & SETTLEMENT TABLE (FULL-WIDTH) */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                ...cardStyle,
                border: "1px solid #E2E8F0",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2.5 }} spacing={1.5}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
                      <Landmark size={22} color="#2563EB" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={cardTitleStyle}>
                        Registered Bank Accounts & Settlement Table
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#625B60" }}>
                        Authorized commercial bank accounts configured for merchant payouts, instant settlements, and refunds
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Chip
                  icon={<CheckCircle2 size={14} color="#22C55E" />}
                  label="NPCI Penny Drop Verified"
                  size="small"
                  sx={{ bgcolor: "rgba(34, 197, 94, 0.12)", color: "#16A34A", fontWeight: 700, border: "1px solid rgba(34, 197, 94, 0.25)" }}
                />
              </Stack>

              <TableContainer
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #E2E8F0",
                  bgcolor: "#FFFFFF",
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                    <TableRow>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        BANK & BRANCH
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        ACCOUNT NUMBER
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        ACCOUNT HOLDER
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        IFSC CODE
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        TYPE
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        ROLE
                      </TableCell>
                      <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        STATUS
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#475569", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #E2E8F0", py: 1.5 }}>
                        DOCUMENT PROOF
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(profile.bank?.accounts && profile.bank.accounts.length > 0
                      ? profile.bank.accounts
                      : profile.bank
                      ? [{
                          id: "primary",
                          bank_name: profile.bank.bank_name || "Registered Bank",
                          branch: profile.bank.branch || "Main Branch",
                          account_number_masked: profile.bank.account_number_masked,
                          account_holder_name: profile.bank.account_holder_name,
                          ifsc: profile.bank.ifsc,
                          account_type: profile.bank.account_type || "SAVINGS",
                          is_primary: true,
                          verification_status: profile.bank.verification_status || "VERIFIED",
                          document_url: profile.bank.document_url,
                          document_file_name: profile.bank.document_file_name,
                        }]
                      : []
                    ).map((acc, idx) => (
                      <TableRow
                        key={acc.id || idx}
                        sx={{
                          bgcolor: idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF",
                          "&:hover": { bgcolor: "rgba(59, 130, 246, 0.06)" },
                        }}
                      >
                        {/* Bank & Branch */}
                        <TableCell sx={{ borderBottom: "1px solid #E2E8F0", py: 1.8 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ p: 0.8, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 1.5 }}>
                              <Landmark size={18} color="#2563EB" />
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                {acc.bank_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#64748B" }}>
                                {acc.branch || "Main Branch"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Account Number */}
                        <TableCell sx={{ borderBottom: "1px solid #E2E8F0", py: 1.8 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#0F172A", fontWeight: 700 }}>
                              {acc.account_number_masked || "—"}
                            </Typography>
                            {acc.account_number_masked && (
                              <Tooltip title="Copy Account Number">
                                <IconButton size="small" onClick={() => handleCopy(acc.account_number_masked, "Account Number")} sx={{ color: "#2563EB" }}>
                                  <Copy size={13} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Holder Name */}
                        <TableCell sx={{ borderBottom: "1px solid #E2E8F0", py: 1.8 }}>
                          <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 600 }}>
                            {acc.account_holder_name || "—"}
                          </Typography>
                        </TableCell>

                        {/* IFSC */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#625B60", fontWeight: 600 }}>
                              {acc.ifsc || "—"}
                            </Typography>
                            {acc.ifsc && (
                              <Tooltip title="Copy IFSC">
                                <IconButton size="small" onClick={() => handleCopy(acc.ifsc, "IFSC")} sx={{ color: "#60A5FA" }}>
                                  <Copy size={13} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Type */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Chip
                            label={acc.account_type || "SAVINGS"}
                            size="small"
                            sx={{ bgcolor: "rgba(255, 255, 255, 0.06)", color: "#625B60", fontSize: "0.72rem", fontWeight: 700 }}
                          />
                        </TableCell>

                        {/* Role */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Chip
                            label={acc.is_primary ? "PRIMARY" : "SECONDARY"}
                            size="small"
                            sx={{
                              bgcolor: acc.is_primary ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                              color: acc.is_primary ? "#60A5FA" : "#94A3B8",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              border: acc.is_primary ? "1px solid rgba(59, 130, 246, 0.35)" : "none",
                            }}
                          />
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Chip
                            icon={<CheckCircle2 size={12} color="#22C55E" />}
                            label={acc.verification_status || "VERIFIED"}
                            size="small"
                            sx={verifiedBadgeStyle}
                          />
                        </TableCell>

                        {/* Document Proof */}
                        <TableCell align="right" sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          {(acc.document_url || profile.bank?.document_url) ? (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Eye size={13} />}
                              onClick={() => setSelectedDoc({
                                url: acc.document_url || profile.bank?.document_url!,
                                title: `${acc.bank_name} Settlement Proof`,
                                fileName: acc.document_file_name || profile.bank?.document_file_name || "bank_proof.pdf",
                              })}
                              sx={{
                                color: "#60A5FA",
                                borderColor: "rgba(59, 130, 246, 0.35)",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                textTransform: "none",
                                py: 0.4,
                                "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)", borderColor: "#3B82F6" },
                              }}
                            >
                              View Proof
                            </Button>
                          ) : (
                            <Typography variant="caption" sx={{ color: "#625B60" }}>
                              Penny Drop Verified
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 6. SECURITY TAB */}
      {activeTab === 5 && (
        <Grid container spacing={3}>
          {/* PASSWORD SECTION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  PASSWORD
                </Typography>
                <Chip
                  icon={<ShieldCheck size={14} color="#38BDF8" />}
                  label="WhatsApp Protected"
                  size="small"
                  sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", fontWeight: 700, fontSize: "0.72rem" }}
                />
              </Stack>
              <form onSubmit={handleInitiatePasswordChange}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Current Password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={pwdForm.current_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              edge="end"
                              sx={{ color: "#625B60" }}
                            >
                              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    label="New Password"
                    type={showNewPassword ? "text" : "password"}
                    value={pwdForm.new_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                              sx={{ color: "#625B60" }}
                            >
                              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={pwdForm.confirm_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              sx={{ color: "#625B60" }}
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {/* Visual Password Rules Checklist */}
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "#FFFFFF", border: "1px solid #E8E2E5" }}>
                    <Typography variant="caption" sx={{ color: "#625B60", fontWeight: 700, mb: 1.2, display: "block", letterSpacing: "0.04em" }}>
                      PASSWORD REQUIREMENTS
                    </Typography>
                    <Stack spacing={0.8}>
                      <RuleItem satisfied={pwdRules.length} text="8 to 64 characters in length" />
                      <RuleItem satisfied={pwdRules.uppercase} text="At least 1 uppercase letter (A-Z)" />
                      <RuleItem satisfied={pwdRules.lowercase} text="At least 1 lowercase letter (a-z)" />
                      <RuleItem satisfied={pwdRules.number} text="At least 1 numeric digit (0-9)" />
                      <RuleItem satisfied={pwdRules.special} text="At least 1 special symbol (!@#$%^&*...)" />
                      <RuleItem satisfied={pwdRules.matches} text="Matches confirmation password" />
                    </Stack>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving || !isPwdValid}
                    startIcon={<Lock size={16} />}
                    sx={{
                      bgcolor: isPwdValid ? brandPrimary : "rgba(100, 116, 139, 0.4)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 1.2,
                      textTransform: "none",
                      "&:hover": { bgcolor: isPwdValid ? brandHover : "rgba(100, 116, 139, 0.4)" },
                    }}
                  >
                    {saving ? "Sending WhatsApp OTP..." : "Change Password"}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Grid>

          {/* TRANSACTION PIN SECTION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  TRANSACTION PIN
                </Typography>
                <Chip
                  icon={<ShieldCheck size={14} color="#38BDF8" />}
                  label="WhatsApp Protected"
                  size="small"
                  sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", fontWeight: 700, fontSize: "0.72rem" }}
                />
              </Stack>
              <form onSubmit={handleInitiatePinChange}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Current PIN (Optional)"
                    type={showCurrentPin ? "text" : "password"}
                    value={pinForm.current_pin}
                    onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="••••"
                    inputProps={{ maxLength: 6 }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCurrentPin(!showCurrentPin)}
                              edge="end"
                              sx={{ color: "#625B60" }}
                            >
                              {showCurrentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    label="New PIN"
                    type={showNewPin ? "text" : "password"}
                    value={pinForm.new_pin}
                    onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="••••"
                    inputProps={{ maxLength: 6 }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPin(!showNewPin)}
                              edge="end"
                              sx={{ color: "#625B60" }}
                            >
                              {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    label="Confirm PIN"
                    type={showConfirmPin ? "text" : "password"}
                    value={pinForm.confirm_pin}
                    onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="••••"
                    inputProps={{ maxLength: 6 }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPin(!showConfirmPin)}
                              edge="end"
                              sx={{ color: "#625B60" }}
                            >
                              {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {/* Visual MPIN Rules Checklist */}
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "#FFFFFF", border: "1px solid #E8E2E5" }}>
                    <Typography variant="caption" sx={{ color: "#625B60", fontWeight: 700, mb: 1.2, display: "block", letterSpacing: "0.04em" }}>
                      TRANSACTION PIN (MPIN) REQUIREMENTS
                    </Typography>
                    <Stack spacing={0.8}>
                      <RuleItem satisfied={pinRules.length} text="Exactly 4 or 6 numeric digits" />
                      <RuleItem satisfied={pinRules.notRepeating} text="No identical repeating digits (e.g. 1111, 0000)" />
                      <RuleItem satisfied={pinRules.notSequential} text="No simple sequential digits (e.g. 1234, 4321, 123456)" />
                      <RuleItem satisfied={pinRules.matches} text="Matches confirmation PIN" />
                    </Stack>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving || !isPinValid}
                    startIcon={<KeyRound size={16} />}
                    sx={{
                      bgcolor: isPinValid ? brandPrimary : "rgba(100, 116, 139, 0.4)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 1.2,
                      textTransform: "none",
                      "&:hover": { bgcolor: isPinValid ? brandHover : "rgba(100, 116, 139, 0.4)" },
                    }}
                  >
                    {saving ? "Sending WhatsApp OTP..." : "Change PIN"}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 7. PHOTO TAB */}
      {activeTab === 6 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                RETAILER PHOTO
              </Typography>
              <Stack spacing={3} alignItems="center">
                <Avatar
                  src={!avatarError && resolvedProfilePhoto ? resolvedProfilePhoto : undefined}
                  slotProps={{
                    img: {
                      onError: () => setAvatarError(true),
                    },
                  }}
                  sx={{
                    width: 140,
                    height: 140,
                    bgcolor: brandPrimary,
                    fontSize: 44,
                    fontWeight: 800,
                    border: `3px solid ${brandPrimary}`,
                    boxShadow: `0 10px 25px ${brandPrimary}40`,
                  }}
                >
                  {(profile.personal.owner_name || profile.personal.retailer_name || "R").charAt(0).toUpperCase()}
                </Avatar>

                <Button
                  component="label"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Upload size={18} />}
                  sx={{ bgcolor: brandPrimary, fontWeight: 700, borderRadius: 2.5, px: 3, "&:hover": { bgcolor: brandHover } }}
                >
                  {saving ? "Uploading..." : "Upload / Change Photo"}
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} />
                </Button>

                <Typography variant="caption" sx={{ color: "#625B60", textAlign: "center" }}>
                  PNG, JPG, or WEBP (Max 5 MB). Stored securely in persistent profile storage.
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 8. RM TAB */}
      {activeTab === 7 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Relationship Manager
              </Typography>

              {profile.rm?.has_rm ? (
                <Stack spacing={2}>
                  <DataRow label="RM Name" value={profile.rm.rm_name} />
                  <DataRow label="Employee ID" value={profile.rm.employee_id} />
                  <DataRow
                    label="Mobile"
                    value={profile.rm.mobile}
                    action={
                      profile.rm.mobile ? (
                        <Button
                          href={`tel:${profile.rm.mobile}`}
                          variant="contained"
                          size="small"
                          startIcon={<PhoneCall size={14} />}
                          sx={{ bgcolor: "#22C55E", fontWeight: 700, "&:hover": { bgcolor: "#16A34A" } }}
                        >
                          Call RM
                        </Button>
                      ) : null
                    }
                  />
                  <DataRow
                    label="Email"
                    value={profile.rm.email}
                    action={
                      profile.rm.email ? (
                        <Button
                          href={`mailto:${profile.rm.email}`}
                          variant="outlined"
                          size="small"
                          startIcon={<Mail size={14} />}
                          sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700 }}
                        >
                          Email RM
                        </Button>
                      ) : null
                    }
                  />
                  <DataRow label="Region" value={profile.rm.region} />
                  <DataRow label="Territory" value={profile.rm.territory} />
                  <DataRow label="Branch" value={profile.rm.branch} />
                  <DataRow label="Assigned Date" value={profile.rm.assigned_date} />
                  <DataRow label="Status" value={profile.rm.status} isStatus />
                  <DataRow label="Manager / Supervisor" value={profile.rm.supervisor} />
                </Stack>
              ) : (
                <Box sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 3, border: "1px dashed rgba(255, 255, 255, 0.15)" }}>
                  <HelpCircle size={40} color="#60A5FA" style={{ margin: "0 auto 12px" }} />
                  <Typography variant="h6" sx={{ color: "#292329", fontWeight: 700 }}>
                    No Dedicated Field RM Assigned
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#625B60", mt: 0.5, maxWidth: 500, mx: "auto" }}>
                    Your account is directly serviced by the {profile.company?.brand_name || brandDisplayName} Central Merchant Operations & Priority Support Desk.
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                    <Button
                      href={`tel:${profile.company?.support_phone || "1800292982"}`}
                      variant="contained"
                      startIcon={<Headphones size={16} />}
                      sx={{ bgcolor: brandPrimary, fontWeight: 700, borderRadius: 2, "&:hover": { bgcolor: brandHover } }}
                    >
                      Call Support ({profile.company?.support_phone || "1800 292 982"})
                    </Button>
                    <Button
                      href={`mailto:${profile.company?.support_email || defaultSupportEmail}?subject=Retailer%20Account%20Assistance`}
                      variant="outlined"
                      startIcon={<Mail size={16} />}
                      sx={{ color: brandPrimary, borderColor: brandPrimary, fontWeight: 700, borderRadius: 2 }}
                    >
                      Email Operations Desk
                    </Button>
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 9. LOCATION TAB */}
      {activeTab === 8 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Registered Outlet Location
              </Typography>

              {profile.location?.has_location && profile.location.latitude && profile.location.longitude ? (
                <Stack spacing={2.5}>
                  {/* Embedded Visual Map */}
                  <Box
                    sx={{
                      width: "100%",
                      height: 320,
                      borderRadius: 2.5,
                      overflow: "hidden",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      position: "relative",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
                    }}
                  >
                    <iframe
                      title="Retailer Outlet Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${profile.location.latitude},${profile.location.longitude}&z=16&output=embed`}
                      style={{ filter: "brightness(0.9) contrast(1.1)" }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DataRow
                        label="Latitude"
                        value={profile.location.latitude.toFixed(6)}
                        onCopy={() => handleCopy(profile.location?.latitude?.toString(), "Latitude")}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DataRow
                        label="Longitude"
                        value={profile.location.longitude.toFixed(6)}
                        onCopy={() => handleCopy(profile.location?.longitude?.toString(), "Longitude")}
                      />
                    </Grid>
                  </Grid>

                  <DataRow label="Registered Premises Address" value={profile.location.registered_address} />
                  <DataRow label="Geofence Validation Status" value={profile.location.geo_status || "VERIFIED_GEOFENCE"} isStatus />
                  <DataRow label="GPS Capture Accuracy" value={profile.location.accuracy || "HIGH (Biometric POS GPS)"} />
                  <DataRow
                    label="Last Geotag Verification"
                    value={profile.location.last_updated ? new Date(profile.location.last_updated).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  />
                </Stack>
              ) : (
                <Box sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 3, border: "1px dashed rgba(255, 255, 255, 0.15)" }}>
                  <Navigation size={40} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
                  <Typography variant="h6" sx={{ color: "#292329", fontWeight: 700 }}>
                    Registered location is not available.
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#625B60", mt: 0.5 }}>
                    GPS coordinates have not been tagged for this merchant terminal.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 10. COMPANY TAB */}
      {activeTab === 9 && (() => {
        const comp = profile.company || {};
        const compLogo = comp.logo_url || brandLogo;
        const compLegal = comp.company_legal_name || comp.legal_name || comp.company_name || brandCompanyName;
        const compBrand = comp.brand_name || brandDisplayName;
        const compPartnerInfo = comp.operating_partner_info || (compBrand ? `Official Operating Partner & Enterprise FinTech Network: ${compBrand}` : "");
        const compPortalUrl = comp.corporate_portal_url || comp.official_website_url || comp.website_url || defaultWebsiteUrl;
        const compRegBadge = comp.regulatory_status_badge || "RBI / NPCI Authorized";
        const compEntityBadge = comp.entity_badge || "Registered Corporate";
        const compCin = comp.cin_number || comp.cin;
        const compGstin = comp.gstin;
        const compEntityType = comp.business_entity_type;
        const compSector = comp.industry_sector;
        const compStatus = comp.operating_status;
        const compHelpline = comp.support_helpline || comp.support_phone;
        const compEmail = comp.support_email;
        const compWhatsapp = comp.whatsapp_number;
        const compWhatsappDigits = compWhatsapp ? compWhatsapp.replace(/\D/g, "") : "";
        const compHours = comp.operating_hours || comp.support_hours;
        const compDirectPhone = comp.direct_operations_line || comp.direct_phone;
        const compHq = comp.registered_office_address || comp.headquarters;
        const compWebsite = comp.official_website_url || comp.website_url || defaultWebsiteUrl;
        const compOfficer =
          comp.nodal_officer ||
          (comp.grievance_officer_name && comp.grievance_officer_designation
            ? `${comp.grievance_officer_name} (${comp.grievance_officer_designation})`
            : comp.grievance_officer_name || comp.grievance_officer_designation);
        const compGrievanceEmail = comp.grievance_escalation_email || comp.grievance_email;
        const compTat =
          comp.resolution_tat ||
          [comp.tat_level_1, comp.tat_level_2].filter(Boolean).join(" | ") ||
          null;

        const hasHelpdesk = Boolean(compHelpline || compEmail || compWhatsapp || compHours || compDirectPhone);
        const hasHqOrGrievance = Boolean(compHq || compWebsite || compOfficer || compGrievanceEmail || compTat);

        return (
        <Grid container spacing={3}>
          {/* Company Branding & Header Card */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 3.5 },
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
                background: `linear-gradient(135deg, ${brandPrimary}0D 0%, rgba(255,255,255,0.98) 100%)`,
                border: `1.5px solid ${brandBorder}`,
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.06)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={3}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Box
                    sx={{
                      width: { xs: 70, sm: 84 },
                      height: { xs: 70, sm: 84 },
                      borderRadius: 3,
                      p: 1.5,
                      bgcolor: "#FFFFFF",
                      border: "1.5px solid #E2E8F0",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={compLogo}
                      alt={compBrand}
                      onError={(e: any) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = brandMark;
                      }}
                      sx={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap", gap: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: "#0F172A", letterSpacing: "-0.02em" }}>
                        {compLegal}
                      </Typography>
                      {compRegBadge && (
                        <Chip
                          icon={<ShieldCheck size={14} color="#16A34A" />}
                          label={compRegBadge}
                          size="small"
                          sx={verifiedBadgeStyle}
                        />
                      )}
                    </Stack>
                    {(compPartnerInfo || compBrand) && (
                      <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 500 }}>
                        {compPartnerInfo}
                        {compPartnerInfo && compBrand && !compPartnerInfo.toLowerCase().includes(compBrand.toLowerCase()) ? ": " : ""}
                        {compBrand && !compPartnerInfo.toLowerCase().includes(compBrand.toLowerCase()) && (
                          <strong style={{ color: brandPrimary }}>{compBrand}</strong>
                        )}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                {compPortalUrl && (
                  <Button
                    href={compPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    endIcon={<ExternalLink size={15} />}
                    sx={{
                      borderColor: brandBorder,
                      color: brandPrimary,
                      fontWeight: 700,
                      borderRadius: 2.5,
                      px: 2.5,
                      py: 1,
                      textTransform: "none",
                      flexShrink: 0,
                      "&:hover": { borderColor: brandPrimary, bgcolor: brandLight },
                    }}
                  >
                    Visit Corporate Portal
                  </Button>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Corporate Entity Profile */}
          <Grid size={{ xs: 12, md: hasHelpdesk ? 6 : 12 }}>
            <Paper elevation={0} sx={{ ...cardStyle, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={cardTitleStyle}>
                  Corporate Entity Profile
                </Typography>
                {compEntityBadge && (
                  <Chip
                    icon={<ShieldCheck size={13} color="#22C55E" />}
                    label={compEntityBadge}
                    size="small"
                    sx={verifiedBadgeStyle}
                  />
                )}
              </Stack>
              <Stack spacing={1.5}>
                {compLegal && (
                  <DataRow
                    label="Company Legal Name"
                    value={compLegal}
                    onCopy={() => handleCopy(compLegal, "Company Legal Name")}
                  />
                )}
                {compBrand && <DataRow label="Brand / Network" value={compBrand} />}
                {compCin && (
                  <DataRow
                    label="Corporate Identity Number (CIN)"
                    value={compCin}
                    onCopy={() => handleCopy(compCin, "CIN")}
                  />
                )}
                {compGstin && (
                  <DataRow
                    label="GSTIN"
                    value={compGstin}
                    onCopy={() => handleCopy(compGstin, "GSTIN")}
                  />
                )}
                {compEntityType && <DataRow label="Business Entity Type" value={compEntityType} />}
                {compSector && <DataRow label="Industry Sector" value={compSector} />}
                {compStatus && <DataRow label="Operating Status" value={compStatus} isStatus />}
              </Stack>
            </Paper>
          </Grid>

          {/* Merchant Helpdesk & Support Channels */}
          {hasHelpdesk && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ ...cardStyle, height: "100%" }}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Merchant Helpdesk & Support Channels
              </Typography>
              <Stack spacing={1.5}>
                {compHelpline && (
                  <DataRow
                    label="Toll-Free Support Helpline"
                    value={compHelpline}
                    href={`tel:${compHelpline.replace(/\s+/g, "")}`}
                    onCopy={() => handleCopy(compHelpline, "Support Helpline")}
                    action={
                      <Button
                        href={`tel:${compHelpline.replace(/\s+/g, "")}`}
                        variant="contained"
                        size="small"
                        startIcon={<PhoneCall size={13} />}
                        sx={{ bgcolor: brandPrimary, fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: brandHover } }}
                      >
                        Call Helpline
                      </Button>
                    }
                  />
                )}
                {compEmail && (
                  <DataRow
                    label="Official Support Email"
                    value={compEmail}
                    href={`mailto:${compEmail}?subject=Retailer%20Support%20Enquiry`}
                    onCopy={() => handleCopy(compEmail, "Support Email")}
                    action={
                      <Button
                        href={`mailto:${compEmail}?subject=Retailer%20Support%20Enquiry`}
                        variant="outlined"
                        size="small"
                        startIcon={<Mail size={13} />}
                        sx={{ color: brandPrimary, borderColor: brandBorder, fontWeight: 700, fontSize: "0.75rem", "&:hover": { borderColor: brandPrimary } }}
                      >
                        Email Us
                      </Button>
                    }
                  />
                )}
                {compWhatsapp && (
                  <DataRow
                    label="WhatsApp Business Desk"
                    value={compWhatsapp}
                    href={`tel:${compWhatsapp.replace(/\s+/g, "")}`}
                    onCopy={() => handleCopy(compWhatsapp, "WhatsApp Number")}
                    action={
                      compWhatsappDigits ? (
                        <Button
                          href={`https://wa.me/${compWhatsappDigits}?text=${encodeURIComponent(`Hello ${compBrand} Support, I need assistance with my Retailer Account.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          size="small"
                          startIcon={<MessageSquare size={13} />}
                          sx={{ bgcolor: "#16A34A", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#15803D" } }}
                        >
                          WhatsApp
                        </Button>
                      ) : undefined
                    }
                  />
                )}
                {compHours && <DataRow label="Operating Hours" value={compHours} />}
                {compDirectPhone && (
                  <DataRow
                    label="Direct Operations Line"
                    value={compDirectPhone}
                    href={`tel:${compDirectPhone.replace(/\s+/g, "")}`}
                    onCopy={() => handleCopy(compDirectPhone, "Direct Operations Line")}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>
          )}

          {/* Registered Headquarters & Grievance Redressal */}
          {hasHqOrGrievance && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Registered Headquarters & Grievance Redressal
              </Typography>
              <Grid container spacing={3}>
                {(compHq || compWebsite) && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.5}>
                      {compHq && (
                        <DataRow
                          label="Corporate Registered Office Address"
                          value={compHq}
                          onCopy={() => handleCopy(compHq, "Office Address")}
                        />
                      )}
                      {compWebsite && (
                        <DataRow
                          label="Official Website Portal"
                          value={compWebsite}
                          href={compWebsite}
                          external
                          onCopy={() => handleCopy(compWebsite, "Website URL")}
                        />
                      )}
                    </Stack>
                  </Grid>
                )}
                {(compOfficer || compGrievanceEmail || compTat) && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.5}>
                      {compOfficer && (
                        <DataRow
                          label="Grievance Redressal Officer"
                          value={compOfficer}
                          onCopy={() => handleCopy(compOfficer, "Grievance Officer")}
                        />
                      )}
                      {compGrievanceEmail && (
                        <DataRow
                          label="Grievance Escalation Email"
                          value={compGrievanceEmail}
                          href={`mailto:${compGrievanceEmail}?subject=Grievance%20Escalation`}
                          onCopy={() => handleCopy(compGrievanceEmail, "Grievance Email")}
                        />
                      )}
                      {compTat && <DataRow label="Resolution Turnaround Time" value={compTat} />}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
          )}
        </Grid>
        );
      })()}
        </motion.div>
      </AnimatePresence>

      {/* ── UPDATE EMAIL OTP DIALOG ── */}
      <Dialog
        open={emailModalOpen}
        onClose={handleCloseEmailModal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 3.5,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ p: 1, bgcolor: brandLight, borderRadius: 2 }}>
              <Mail size={20} color={brandPrimary} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: "#0F172A", fontWeight: 800, fontSize: "1.1rem" }}>
                Update Email Address
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B" }}>
                Two-step OTP verification required
              </Typography>
            </Box>
          </Stack>
          <IconButton
            size="small"
            onClick={handleCloseEmailModal}
            disabled={sendingEmailOtp || verifyingEmailOtp}
            sx={{ color: "#64748B", "&:hover": { color: "#0F172A" } }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {emailModalError && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                bgcolor: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #F87171",
                borderRadius: 2,
                fontSize: "0.82rem",
                "& .MuiAlert-icon": { color: "#EF4444" },
              }}
            >
              {emailModalError}
            </Alert>
          )}

          {/* Current Verified Email Info */}
          <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0", mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 600 }}>
              CURRENT VERIFIED EMAIL
            </Typography>
            <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700, mt: 0.2 }}>
              {profile?.contact?.email_raw || profile?.contact?.email_masked || "—"}
            </Typography>
          </Box>

          {!emailOtpSent ? (
            <Stack spacing={2}>
              <TextField
                label="New Email Address"
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailModalError(null);
                }}
                fullWidth
                autoFocus
                placeholder="name@example.com"
                sx={inputStyle}
                helperText="A 6-digit verification code will be dispatched to this email."
              />
              <Button
                variant="contained"
                onClick={handleSendEmailOtp}
                disabled={sendingEmailOtp || !newEmail}
                startIcon={sendingEmailOtp ? <CircularProgress size={16} color="inherit" /> : <Mail size={16} />}
                sx={{
                  bgcolor: brandPrimary,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  py: 1.2,
                  borderRadius: 2.5,
                  textTransform: "none",
                  boxShadow: `0 4px 14px ${brandPrimary}40`,
                  "&:hover": { bgcolor: brandHover },
                }}
              >
                {sendingEmailOtp ? "Sending Verification Code..." : "Send Verification OTP"}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <Box sx={{ p: 1.5, bgcolor: brandLight, borderRadius: 2, border: `1px solid ${brandBorder}` }}>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                  VERIFICATION CODE SENT TO
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.3 }}>
                  <Typography variant="body2" sx={{ color: brandPrimary, fontWeight: 700 }}>
                    {newEmail}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      setEmailOtpSent(false);
                      setEmailOtp("");
                      setEmailModalError(null);
                    }}
                    sx={{ color: "#64748B", fontSize: "0.72rem", textTransform: "none", p: 0, minWidth: 0, "&:hover": { color: "#0F172A" } }}
                  >
                    Change
                  </Button>
                </Stack>
              </Box>

              <TextField
                label="Enter 6-Digit OTP"
                value={emailOtp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setEmailOtp(val);
                  setEmailModalError(null);
                }}
                fullWidth
                autoFocus
                placeholder="123456"
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: "center", letterSpacing: "8px", fontSize: "1.3rem", fontWeight: 700, color: "#0F172A" },
                }}
                sx={inputStyle}
                helperText="Enter the 6-digit code received in your inbox."
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ color: "#64748B" }}>
                  Didn't receive the code?
                </Typography>
                <Button
                  size="small"
                  onClick={handleSendEmailOtp}
                  disabled={resendTimer > 0 || sendingEmailOtp}
                  sx={{ color: resendTimer > 0 ? "#94A3B8" : brandPrimary, fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend OTP"}
                </Button>
              </Stack>

              <Alert
                severity="info"
                icon={<ShieldCheck size={16} color={brandPrimary} />}
                sx={{
                  bgcolor: brandLight,
                  color: "#0F172A",
                  border: `1px solid ${brandBorder}`,
                  borderRadius: 2,
                  fontSize: "0.75rem",
                  py: 0.5,
                }}
              >
                Security notice: If an invalid or expired OTP is entered, your email will NOT be saved to the database.
              </Alert>

              <Button
                variant="contained"
                onClick={handleVerifyEmailOtp}
                disabled={verifyingEmailOtp || emailOtp.length < 4}
                startIcon={verifyingEmailOtp ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
                sx={{
                  bgcolor: "#16A34A",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  py: 1.2,
                  borderRadius: 2.5,
                  textTransform: "none",
                  boxShadow: "0 4px 14px rgba(22, 163, 74, 0.4)",
                  "&:hover": { bgcolor: "#15803D" },
                }}
              >
                {verifyingEmailOtp ? "Validating & Updating..." : "Verify OTP & Save Email"}
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ── SECURITY WHATSAPP OTP AUTHORIZATION DIALOG ── */}
      <Dialog
        open={secOtpModalOpen}
        onClose={() => {
          if (secOtpSending || secOtpVerifying) return;
          setSecOtpModalOpen(false);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 3.5,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
            color: "#0F172A",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: "rgba(37, 211, 102, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={20} color="#25D366" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#0F172A" }}>
                WhatsApp Authorization
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B" }}>
                {secOtpAction === "PASSWORD" ? "Update Account Password" : "Update Transaction MPIN"}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={() => setSecOtpModalOpen(false)}
            disabled={secOtpSending || secOtpVerifying}
            sx={{ color: "#64748B", "&:hover": { color: "#0F172A" } }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          <Stack spacing={2.5}>
            <Alert
              severity="info"
              icon={<ShieldCheck size={18} />}
              sx={{
                bgcolor: "#EFF6FF",
                color: "#1E40AF",
                border: "1px solid #BFDBFE",
                "& .MuiAlert-icon": { color: "#2563EB" },
                fontSize: "0.82rem",
              }}
            >
              A 6-digit one-time passcode has been sent to your registered WhatsApp mobile number{" "}
              <strong style={{ color: "#0F172A" }}>{secMaskedMobile}</strong>.
            </Alert>

            {secOtpError && (
              <Alert
                severity="error"
                sx={{
                  bgcolor: "#FEF2F2",
                  color: "#991B1B",
                  border: "1px solid #F87171",
                  fontSize: "0.82rem",
                }}
              >
                {secOtpError}
              </Alert>
            )}

            <Box sx={{ textAlign: "center", py: 1 }}>
              <Typography variant="caption" sx={{ color: "#64748B", mb: 1, display: "block" }}>
                ENTER 6-DIGIT WHATSAPP OTP
              </Typography>
              <TextField
                autoFocus
                value={secOtpCode}
                onChange={(e) => {
                  setSecOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setSecOtpError(null);
                }}
                placeholder="••••••"
                fullWidth
                variant="outlined"
                inputProps={{
                  maxLength: 6,
                  style: {
                    textAlign: "center",
                    letterSpacing: "8px",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "#0F172A",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#F8FAFC",
                    borderRadius: 2.5,
                    "& fieldset": { borderColor: "#CBD5E1" },
                    "&:hover fieldset": { borderColor: "#94A3B8" },
                    "&.Mui-focused fieldset": { borderColor: brandPrimary },
                  },
                }}
              />
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: "#64748B" }}>
                Valid for 10 minutes
              </Typography>
              <Button
                onClick={handleResendSecOtp}
                disabled={secOtpResendTimer > 0 || secOtpSending || secOtpVerifying}
                size="small"
                startIcon={secOtpSending ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
                sx={{ color: secOtpResendTimer > 0 ? "#94A3B8" : brandPrimary, textTransform: "none", fontSize: "0.78rem", fontWeight: 700 }}
              >
                {secOtpResendTimer > 0 ? `Resend in ${secOtpResendTimer}s` : "Resend WhatsApp OTP"}
              </Button>
            </Stack>

            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "#FEF2F2", border: "1px dashed #F87171" }}>
              <Typography variant="caption" sx={{ color: "#DC2626", display: "block", textAlign: "center", fontSize: "0.75rem" }}>
                Strict Verification: If an invalid or expired OTP is entered, changes will NOT be saved to the database.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setSecOtpModalOpen(false)}
            disabled={secOtpSending || secOtpVerifying}
            sx={{ color: "#64748B", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerifyAndSubmitSecurity}
            disabled={secOtpVerifying || secOtpCode.length < 4}
            variant="contained"
            startIcon={secOtpVerifying ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
            sx={{
              bgcolor: brandPrimary,
              color: "#FFFFFF",
              fontWeight: 700,
              textTransform: "none",
              px: 3,
              borderRadius: 2.5,
              boxShadow: `0 4px 14px ${brandPrimary}40`,
              "&:hover": { bgcolor: brandHover },
            }}
          >
            {secOtpVerifying ? "Verifying & Saving..." : `Verify & Update ${secOtpAction === "PASSWORD" ? "Password" : "MPIN"}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── UNIVERSAL DOCUMENT VIEWER MODAL ── */}
      <Dialog
        open={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 3.5,
            overflow: "hidden",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ p: 1, bgcolor: brandLight, borderRadius: 2 }}>
                <FileCheck size={20} color={brandPrimary} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: "#0F172A", fontWeight: 800 }}>
                  {selectedDoc?.title || "Verification Document"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B" }}>
                  {selectedDoc?.fileName}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setSelectedDoc(null)} sx={{ color: "#64748B", "&:hover": { color: "#0F172A" } }}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: "#0F172A", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {selectedDoc && (
            selectedDoc.url.toLowerCase().endsWith(".pdf") ? (
              <Box
                component="iframe"
                src={selectedDoc.url}
                title={selectedDoc.title}
                sx={{
                  width: "100%",
                  height: "70vh",
                  minHeight: 500,
                  border: "none",
                  borderRadius: 2,
                  bgcolor: "#FFFFFF",
                }}
              />
            ) : (
              <Box
                component="img"
                src={selectedDoc.url}
                alt={selectedDoc.title}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: 2,
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                }}
              />
            )
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExternalLink size={15} />}
            href={selectedDoc?.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "#64748B", borderColor: "#CBD5E1", textTransform: "none", "&:hover": { borderColor: "#94A3B8", color: "#0F172A" } }}
          >
            Open in New Tab
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Download size={15} />}
              component="a"
              href={selectedDoc?.url}
              download={selectedDoc?.fileName || "document"}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ bgcolor: brandPrimary, fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: brandHover } }}
            >
              Download
            </Button>
            <Button variant="outlined" size="small" onClick={() => setSelectedDoc(null)} sx={{ color: "#0F172A", borderColor: "#CBD5E1", textTransform: "none" }}>
              Close
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ── SNACKBAR FEEDBACK ── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: "100%", borderRadius: 2.5, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ── REUSABLE DATA ROW ──

function DataRow({
  label,
  value,
  onCopy,
  isStatus,
  action,
  href,
  external,
}: {
  label: string;
  value?: string | number | null;
  onCopy?: () => void;
  isStatus?: boolean;
  action?: React.ReactNode;
  href?: string | null;
  external?: boolean;
}) {
  const displayVal = value !== null && value !== undefined && value !== "" ? String(value) : "—";
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <Box sx={rowBoxStyle}>
      <Typography variant="caption" sx={labelStyle}>
        {label}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.4, gap: 1 }}>
        {href && displayVal !== "—" ? (
          <Typography
            component="a"
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            variant="body1"
            sx={{
              color: "#0F172A",
              fontWeight: 600,
              wordBreak: "break-all",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline", color: "var(--brand-primary, #0F3B7D)" },
            }}
          >
            {displayVal}
          </Typography>
        ) : (
          <Typography
            variant="body1"
            sx={{
              color: isStatus ? "#10B981" : "#0F172A",
              fontWeight: isStatus ? 700 : 600,
              wordBreak: "break-all",
            }}
          >
            {displayVal}
          </Typography>
        )}
        <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
          {onCopy && displayVal !== "—" && (
            <Tooltip title={copied ? "Copied to clipboard!" : "Copy to clipboard"}>
              <IconButton
                size="small"
                onClick={handleCopyClick}
                sx={{
                  color: copied ? "#10B981" : "#64748B",
                  ml: 0.5,
                  transition: "all 0.2s",
                  "&:hover": { color: "#0F172A", bgcolor: "rgba(0,0,0,0.04)" },
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </IconButton>
            </Tooltip>
          )}
          {action && <Box sx={{ ml: 1 }}>{action}</Box>}
        </Stack>
      </Stack>
    </Box>
  );
}

// ── STYLES ──

const cardStyle = {
  p: { xs: 2.5, md: 3.5 },
  borderRadius: 3.5,
  bgcolor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  "&:hover": {
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
  },
};

const cardTitleStyle = {
  fontWeight: 800,
  color: "#0F172A",
  mb: 2.5,
  letterSpacing: "-0.01em",
};

const rowBoxStyle = {
  p: 1.8,
  borderRadius: 2.5,
  bgcolor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  transition: "all 0.15s ease",
  "&:hover": {
    bgcolor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
};

const fieldBoxStyle = {
  p: 2,
  borderRadius: 2.5,
  bgcolor: "#F8FAFC",
  border: "1px solid #E2E8F0",
};

const labelStyle = {
  color: "#64748B",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const verifiedBadgeStyle = {
  bgcolor: "rgba(34, 197, 94, 0.15)",
  color: "#16A34A",
  fontWeight: 700,
  height: 22,
  fontSize: "0.72rem",
};

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    borderRadius: 2.5,
    "& fieldset": {
      borderColor: "#D1D5DB",
    },
    "&:hover fieldset": {
      borderColor: "#94A3B8",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--brand-primary, #0F3B7D)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#64748B",
    "&.Mui-focused": {
      color: "var(--brand-primary, #0F3B7D)",
    },
  },
  "& .MuiFormHelperText-root": {
    color: "#64748B",
  },
};

// ── REUSABLE RULE ITEM ──

function RuleItem({ satisfied, text }: { satisfied: boolean; text: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {satisfied ? (
        <CheckCircle2 size={14} color="#10B981" />
      ) : (
        <Box sx={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #64748B" }} />
      )}
      <Typography
        variant="caption"
        sx={{
          color: satisfied ? "#10B981" : "#94A3B8",
          fontWeight: satisfied ? 600 : 400,
          transition: "color 0.2s ease",
          fontSize: "0.75rem",
        }}
      >
        {text}
      </Typography>
    </Stack>
  );
}
