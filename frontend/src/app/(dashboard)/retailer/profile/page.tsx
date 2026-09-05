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
} from "lucide-react";
import { retailerApi } from "@/services/retailer-api";

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
    company_name?: string | null;
    brand_name?: string | null;
    cin?: string | null;
    gstin?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    direct_phone?: string | null;
    whatsapp_number?: string | null;
    grievance_email?: string | null;
    nodal_officer?: string | null;
    support_hours?: string | null;
    headquarters?: string | null;
    helpdesk_url?: string | null;
    website_url?: string | null;
  } | null;
}

export default function RetailerProfilePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
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
        setToast({
          open: true,
          message: res.message || "Email address updated and verified successfully!",
          severity: "success",
        });
        setEmailModalOpen(false);
        await fetchProfile();
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

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await retailerApi.getProfile();
      if (data) {
        setProfile(data);
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
      await fetchProfile();
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
      await fetchProfile();
    } catch (err: any) {
      setToast({ open: true, message: err?.message || "Unable to update address. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await retailerApi.uploadProfilePhoto(fd);
      if (res?.photo_url) {
        setToast({ open: true, message: "Profile photo uploaded and persisted in Backblaze B2 & Database successfully!", severity: "success" });
        await fetchProfile();
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
        await fetchProfile();
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
        await fetchProfile();
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
        <CircularProgress size={48} sx={{ color: "#3B82F6" }} />
        <Typography variant="body1" sx={{ color: "#94A3B8", fontWeight: 600 }}>
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
        <Button variant="contained" onClick={fetchProfile} startIcon={<RefreshCw size={18} />} sx={{ bgcolor: "#2563EB" }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", pb: 8 }}>
      {/* ── PAGE HEADER & SUBTITLE ── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
          Retailer Profile
        </Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
          Manage your registered profile, KYC, bank, security, relationship manager and registered location information.
        </Typography>
      </Box>

      {/* ── TAB BAR ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          mb: 3.5,
          p: 0.5,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": {
              backgroundColor: "#3B82F6",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              minHeight: 48,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "#94A3B8",
              px: 2.2,
              "&.Mui-selected": {
                color: "#60A5FA",
                fontWeight: 700,
              },
              "&:hover": {
                color: "#FFFFFF",
              },
            },
          }}
        >
          {tabs.map((t, idx) => (
            <Tab key={idx} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* ── TAB PANELS ── */}

      {/* 1. PERSONAL TAB */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Personal & Identity Details
              </Typography>
              <Stack spacing={2}>
                <DataRow label="Retailer Name" value={profile.personal.retailer_name} />
                <DataRow label="First Name" value={profile.personal.first_name} />
                <DataRow label="Middle Name" value={profile.personal.middle_name} />
                <DataRow label="Last Name" value={profile.personal.last_name} />
                <DataRow label="Date of Birth" value={profile.personal.dob} />
                <DataRow label="Gender" value={profile.personal.gender} />
                <DataRow label="Father's Name" value={profile.personal.father_name} />
                <DataRow label="Mother's Name" value={profile.personal.mother_name} />
                <DataRow label="Nationality" value={profile.personal.nationality} />
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
                <DataRow label="Account Status" value={profile.personal.status} isStatus />
                <DataRow
                  label="Registered Date"
                  value={profile.personal.registered_date ? new Date(profile.personal.registered_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null}
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
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 700 }}>
                      {profile.contact.mobile_masked || "—"}
                    </Typography>
                    {profile.contact.mobile_raw && (
                      <IconButton size="small" onClick={() => handleCopy(profile.contact.mobile_raw, "Mobile Number")} sx={{ color: "#94A3B8", "&:hover": { color: "#60A5FA" } }}>
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
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 700 }}>
                      {profile.contact.email_masked || "—"}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {profile.contact.email_raw && (
                        <IconButton size="small" onClick={() => handleCopy(profile.contact.email_raw, "Email Address")} sx={{ color: "#94A3B8", "&:hover": { color: "#60A5FA" } }}>
                          <Copy size={15} />
                        </IconButton>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleOpenEmailModal}
                        startIcon={<Mail size={13} />}
                        sx={{
                          borderColor: "rgba(59, 130, 246, 0.4)",
                          color: "#60A5FA",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          py: 0.3,
                          px: 1.2,
                          borderRadius: 1.5,
                          textTransform: "none",
                          "&:hover": {
                            borderColor: "#3B82F6",
                            bgcolor: "rgba(59, 130, 246, 0.1)",
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
                  sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
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
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 3 }} spacing={2}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
                      <Building size={22} color="#60A5FA" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                        {profile.company?.company_name || "SUPER REX PRODUCTS PRIVATE LIMITED"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                        Corporate Headquarters & Official Merchant Support Helpdesk
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Chip
                  icon={<ShieldCheck size={14} color="#22C55E" />}
                  label="NPCI / RBI Authorized FinTech"
                  size="small"
                  sx={{ bgcolor: "rgba(34, 197, 94, 0.12)", color: "#4ADE80", fontWeight: 700, border: "1px solid rgba(34, 197, 94, 0.25)" }}
                />
              </Stack>

              <Grid container spacing={2.5}>
                {/* Toll Free Helpline */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Headphones size={18} color="#38BDF8" />
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                        Support Helpline
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 800 }}>
                      {profile.company?.support_phone || "1800 292 982"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 1.5 }}>
                      Toll-Free & Direct Line
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`tel:${profile.company?.support_phone || "1800292982"}`}
                        variant="contained"
                        size="small"
                        startIcon={<PhoneCall size={13} />}
                        sx={{ bgcolor: "#0284C7", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#0369A1" } }}
                      >
                        Call
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.support_phone || "1800 292 982", "Support Phone")} sx={{ color: "#94A3B8" }}>
                        <Copy size={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>

                {/* Official Support Email */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Mail size={18} color="#60A5FA" />
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                        Support Desk Email
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 800 }}>
                      {profile.company?.support_email || "support@pay2pay.in"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 1.5 }}>
                      24/7 Ticketing Response
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`mailto:${profile.company?.support_email || "support@pay2pay.in"}?subject=Retailer%20Support%20Enquiry`}
                        variant="contained"
                        size="small"
                        startIcon={<Mail size={13} />}
                        sx={{ bgcolor: "#2563EB", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#1D4ED8" } }}
                      >
                        Email
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.support_email || "support@pay2pay.in", "Support Email")} sx={{ color: "#94A3B8" }}>
                        <Copy size={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>

                {/* WhatsApp Support Desk */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <MessageSquare size={18} color="#4ADE80" />
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                        WhatsApp Helpdesk
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 800 }}>
                      {profile.company?.whatsapp_number || "+91 70139 14767"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 1.5 }}>
                      Instant Merchant Chat
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`https://wa.me/917013914767?text=${encodeURIComponent("Hello Pay2Pay Support, I need assistance with my Retailer Account.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        size="small"
                        startIcon={<MessageSquare size={13} />}
                        sx={{ bgcolor: "#16A34A", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#15803D" } }}
                      >
                        WhatsApp
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.whatsapp_number || "+91 70139 14767", "WhatsApp Number")} sx={{ color: "#94A3B8" }}>
                        <Copy size={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>

                {/* Operating Hours */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2.2, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2.5, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Clock size={18} color="#FBBF24" />
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                        Operating Hours
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, mt: 0.5 }}>
                      {profile.company?.support_hours || "Mon - Sat | 09:00 AM - 07:00 PM"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mt: 0.5 }}>
                      Sunday: Automated Ticketing
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2.5, borderColor: "rgba(255, 255, 255, 0.08)" }} />

              {/* Corporate Metadata & Office Address */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", display: "block", mb: 0.5 }}>
                    Registered Corporate Headquarters
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#E2E8F0" }}>
                    {profile.company?.headquarters || "Shop No: 7, 1st Floor, Chittaramma Temple Complex, Moosapet, Hyderabad, Telangana - 500018, India"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack direction="row" spacing={3} justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
                    <Box>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                        Corporate ID (CIN)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, fontFamily: "monospace" }}>
                        {profile.company?.cin || "U72900TN2024PTC168920"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                        Grievance Email
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700 }}>
                        {profile.company?.grievance_email || "grievance@pay2pay.in"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
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
                <Box sx={{ p: 3, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 2.5, border: "1px dashed rgba(255, 255, 255, 0.15)" }}>
                  <ShieldCheck size={36} color="#3B82F6" style={{ margin: "0 auto 8px" }} />
                  <Typography variant="body1" sx={{ color: "#E2E8F0", fontWeight: 700 }}>
                    Same as Permanent Address
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94A3B8", mt: 0.5, display: "block" }}>
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
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
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
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
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
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                          Verification Document
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, wordBreak: "break-all" }}>
                          {profile.kyc.pan?.file_name || "PAN_Card_Document.pdf"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
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
                        sx={{ bgcolor: "#2563EB", fontWeight: 700, fontSize: "0.75rem", textTransform: "none" }}
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
                        sx={{ color: "#94A3B8", bgcolor: "rgba(255, 255, 255, 0.05)", "&:hover": { color: "#FFFFFF" } }}
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
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
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
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                          Verification Document
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, wordBreak: "break-all" }}>
                          {profile.kyc.aadhaar?.front_file_name || "Aadhaar_Document.pdf"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
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
                        sx={{ color: "#94A3B8", bgcolor: "rgba(255, 255, 255, 0.05)", "&:hover": { color: "#FFFFFF" } }}
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
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%)",
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
                      <Typography variant="caption" sx={{ color: "#94A3B8" }}>
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
                          border: "1px solid rgba(255, 255, 255, 0.08)",
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
                          <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", wordBreak: "break-all", mb: 0.5 }}>
                            {doc.file_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
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
                            sx={{ bgcolor: "#2563EB", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", "&:hover": { bgcolor: "#1D4ED8" } }}
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
                              sx={{ color: "#94A3B8", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.1)" } }}
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
                              sx={{ color: "#94A3B8", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.1)" } }}
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
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
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
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
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
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                  No settlement bank account currently registered.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* BANK SETTLEMENT PROOF DOCUMENT */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  Bank Settlement Proof Document
                </Typography>
                <Chip
                  icon={<ShieldCheck size={13} color="#22C55E" />}
                  label="VERIFIED PROOF"
                  size="small"
                  sx={verifiedBadgeStyle}
                />
              </Stack>

              <Typography variant="body2" sx={{ color: "#94A3B8", mb: 2 }}>
                Passbook copy or Cancelled Cheque submitted for NPCI settlement authentication and beneficiary registry verification.
              </Typography>

              {profile.bank?.document_url ? (
                <Box sx={{ p: 2.2, bgcolor: "rgba(59, 130, 246, 0.08)", borderRadius: 2.5, border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 1.5, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2.5 }}>
                      <Landmark size={26} color="#60A5FA" />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                        Submitted Proof Document
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, wordBreak: "break-all" }}>
                        {profile.bank?.document_file_name || "Settlement_Bank_Proof.pdf"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.3 }}>
                        Size: {formatFileSize(profile.bank?.document_file_size)} • NPCI Penny Drop Verified
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1.8, borderColor: "rgba(255, 255, 255, 0.08)" }} />

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
                      sx={{ bgcolor: "#2563EB", fontWeight: 700, fontSize: "0.78rem", textTransform: "none", "&:hover": { bgcolor: "#1D4ED8" } }}
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
                      sx={{ color: "#94A3B8", borderColor: "rgba(255, 255, 255, 0.2)", fontSize: "0.78rem", textTransform: "none", "&:hover": { color: "#FFFFFF", borderColor: "#FFFFFF" } }}
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
                        sx={{ color: "#94A3B8", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", "&:hover": { color: "#FFFFFF" } }}
                      >
                        <ExternalLink size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ p: 2.5, textAlign: "center", bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 2.5, border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                    Bank details authenticated via Instant Reverse Penny Drop.
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2, p: 1.5, bgcolor: "rgba(2, 132, 199, 0.1)", borderRadius: 2, border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                <Typography variant="caption" sx={{ color: "#38BDF8", display: "block" }}>
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
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2.5 }} spacing={1.5}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
                      <Landmark size={22} color="#60A5FA" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                        Registered Bank Accounts & Settlement Table
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                        Authorized commercial bank accounts configured for merchant payouts, instant settlements, and refunds
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Chip
                  icon={<CheckCircle2 size={14} color="#22C55E" />}
                  label="NPCI Penny Drop Verified"
                  size="small"
                  sx={{ bgcolor: "rgba(34, 197, 94, 0.12)", color: "#4ADE80", fontWeight: 700, border: "1px solid rgba(34, 197, 94, 0.25)" }}
                />
              </Stack>

              <TableContainer
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  bgcolor: "rgba(15, 23, 42, 0.7)",
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: "rgba(30, 41, 59, 0.8)" }}>
                    <TableRow>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        BANK & BRANCH
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        ACCOUNT NUMBER
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        ACCOUNT HOLDER
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        IFSC CODE
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        TYPE
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        ROLE
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
                        STATUS
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1.5 }}>
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
                          bgcolor: idx % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "transparent",
                          "&:hover": { bgcolor: "rgba(59, 130, 246, 0.06)" },
                        }}
                      >
                        {/* Bank & Branch */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ p: 0.8, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 1.5 }}>
                              <Landmark size={18} color="#60A5FA" />
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                                {acc.bank_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                                {acc.branch || "Main Branch"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Account Number */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#E2E8F0", fontWeight: 700 }}>
                              {acc.account_number_masked || "—"}
                            </Typography>
                            {acc.account_number_masked && (
                              <Tooltip title="Copy Account Number">
                                <IconButton size="small" onClick={() => handleCopy(acc.account_number_masked, "Account Number")} sx={{ color: "#60A5FA" }}>
                                  <Copy size={13} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Holder Name */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 600 }}>
                            {acc.account_holder_name || "—"}
                          </Typography>
                        </TableCell>

                        {/* IFSC */}
                        <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", py: 1.8 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#94A3B8", fontWeight: 600 }}>
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
                            sx={{ bgcolor: "rgba(255, 255, 255, 0.06)", color: "#CBD5E1", fontSize: "0.72rem", fontWeight: 700 }}
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
                            <Typography variant="caption" sx={{ color: "#64748B" }}>
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
                              sx={{ color: "#94A3B8" }}
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
                              sx={{ color: "#94A3B8" }}
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
                              sx={{ color: "#94A3B8" }}
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {/* Visual Password Rules Checklist */}
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, mb: 1.2, display: "block", letterSpacing: "0.04em" }}>
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
                      bgcolor: isPwdValid ? "#2563EB" : "rgba(37, 99, 235, 0.4)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 1.2,
                      textTransform: "none",
                      "&:hover": { bgcolor: "#1D4ED8" },
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
                              sx={{ color: "#94A3B8" }}
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
                              sx={{ color: "#94A3B8" }}
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
                              sx={{ color: "#94A3B8" }}
                            >
                              {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {/* Visual MPIN Rules Checklist */}
                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, mb: 1.2, display: "block", letterSpacing: "0.04em" }}>
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
                      bgcolor: isPinValid ? "#2563EB" : "rgba(37, 99, 235, 0.4)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      borderRadius: 2,
                      py: 1.2,
                      textTransform: "none",
                      "&:hover": { bgcolor: "#1D4ED8" },
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
                  src={profile.photo.photo_url || ""}
                  sx={{
                    width: 140,
                    height: 140,
                    bgcolor: "#2563EB",
                    fontSize: 44,
                    fontWeight: 800,
                    border: "3px solid #3B82F6",
                    boxShadow: "0 10px 25px rgba(37, 99, 235, 0.35)",
                  }}
                >
                  {profile.personal.retailer_name?.charAt(0) || "R"}
                </Avatar>

                <Button
                  component="label"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Upload size={18} />}
                  sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2.5, px: 3 }}
                >
                  {saving ? "Uploading to B2..." : "Upload / Change Photo"}
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} />
                </Button>

                <Typography variant="caption" sx={{ color: "#94A3B8", textAlign: "center" }}>
                  PNG, JPG, or WEBP (Max 5 MB). Stored securely on Backblaze B2 Object Storage.
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
                  <Typography variant="h6" sx={{ color: "#E2E8F0", fontWeight: 700 }}>
                    No Dedicated Field RM Assigned
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5, maxWidth: 500, mx: "auto" }}>
                    Your account is directly serviced by the Pay2Pay Central Merchant Operations & Priority Support Desk.
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                    <Button
                      href={`tel:${profile.company?.support_phone || "1800292982"}`}
                      variant="contained"
                      startIcon={<Headphones size={16} />}
                      sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                    >
                      Call Support ({profile.company?.support_phone || "1800 292 982"})
                    </Button>
                    <Button
                      href={`mailto:${profile.company?.support_email || "support@pay2pay.in"}?subject=Retailer%20Account%20Assistance`}
                      variant="outlined"
                      startIcon={<Mail size={16} />}
                      sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700, borderRadius: 2 }}
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
                  <Typography variant="h6" sx={{ color: "#E2E8F0", fontWeight: 700 }}>
                    Registered location is not available.
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
                    GPS coordinates have not been tagged for this merchant terminal.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 10. COMPANY TAB */}
      {activeTab === 9 && (
        <Grid container spacing={3}>
          {/* Corporate Entity Profile */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  Corporate Entity Profile
                </Typography>
                <Chip
                  icon={<ShieldCheck size={13} color="#22C55E" />}
                  label="NPCI / RBI Authorized"
                  size="small"
                  sx={verifiedBadgeStyle}
                />
              </Stack>
              <Stack spacing={1.5}>
                <DataRow label="Company Legal Name" value={profile.company?.company_name || "SUPER REX PRODUCTS PRIVATE LIMITED"} />
                <DataRow label="Brand / Network" value={profile.company?.brand_name || "Pay2Pay Enterprise Network"} />
                <DataRow
                  label="Corporate Identity Number (CIN)"
                  value={profile.company?.cin || "U72900TN2024PTC168920"}
                  onCopy={() => handleCopy(profile.company?.cin || "U72900TN2024PTC168920", "CIN")}
                />
                <DataRow
                  label="GSTIN"
                  value={profile.company?.gstin || "33AAACP1234F1Z5"}
                  onCopy={() => handleCopy(profile.company?.gstin || "33AAACP1234F1Z5", "GSTIN")}
                />
                <DataRow label="Business Entity Type" value="Private Limited Company" />
                <DataRow label="Industry Sector" value="FinTech, Payments & Banking Correspondent Network" />
                <DataRow label="Operating Status" value="ACTIVE & REGULATED" isStatus />
              </Stack>
            </Paper>
          </Grid>

          {/* Central Helpdesk & Support Channels */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Merchant Helpdesk & Support Channels
              </Typography>
              <Stack spacing={1.5}>
                <DataRow
                  label="Toll-Free Support Helpline"
                  value={profile.company?.support_phone || "1800 292 982"}
                  onCopy={() => handleCopy(profile.company?.support_phone || "1800 292 982", "Support Phone")}
                  action={
                    <Button
                      href={`tel:${profile.company?.support_phone || "1800292982"}`}
                      variant="contained"
                      size="small"
                      startIcon={<PhoneCall size={13} />}
                      sx={{ bgcolor: "#0284C7", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#0369A1" } }}
                    >
                      Call Helpline
                    </Button>
                  }
                />
                <DataRow
                  label="Official Support Email"
                  value={profile.company?.support_email || "support@pay2pay.in"}
                  onCopy={() => handleCopy(profile.company?.support_email || "support@pay2pay.in", "Support Email")}
                  action={
                    <Button
                      href={`mailto:${profile.company?.support_email || "support@pay2pay.in"}?subject=Retailer%20Support%20Enquiry`}
                      variant="outlined"
                      size="small"
                      startIcon={<Mail size={13} />}
                      sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700, fontSize: "0.75rem" }}
                    >
                      Email Us
                    </Button>
                  }
                />
                <DataRow
                  label="WhatsApp Business Desk"
                  value={profile.company?.whatsapp_number || "+91 70139 14767"}
                  onCopy={() => handleCopy(profile.company?.whatsapp_number || "+91 70139 14767", "WhatsApp Number")}
                  action={
                    <Button
                      href={`https://wa.me/917013914767?text=${encodeURIComponent("Hello Pay2Pay Support, I need assistance with my Retailer Account.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      size="small"
                      startIcon={<MessageSquare size={13} />}
                      sx={{ bgcolor: "#16A34A", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#15803D" } }}
                    >
                      WhatsApp
                    </Button>
                  }
                />
                <DataRow label="Operating Hours" value={profile.company?.support_hours || "Monday - Saturday | 09:00 AM - 07:00 PM IST"} />
                <DataRow label="Direct Operations Line" value={profile.company?.direct_phone || "+91 44 4892 9820"} />
              </Stack>
            </Paper>
          </Grid>

          {/* Registered Headquarters & Grievance Redressal */}
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Registered Headquarters & Grievance Redressal
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                    <DataRow
                      label="Corporate Registered Office Address"
                      value={profile.company?.headquarters || "Shop No: 7, 1st Floor, Chittaramma Temple Complex, Moosapet, Hyderabad, Telangana - 500018, India"}
                      onCopy={() => handleCopy(profile.company?.headquarters || "Shop No: 7, 1st Floor, Chittaramma Temple Complex, Moosapet, Hyderabad, Telangana - 500018, India", "Office Address")}
                    />
                    <DataRow label="Official Website Portal" value={profile.company?.website_url || "https://pay2pay.in"} />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                    <DataRow label="Grievance Redressal Officer" value={profile.company?.nodal_officer || "Grievance Redressal Officer, Pay2Pay"} />
                    <DataRow
                      label="Grievance Escalation Email"
                      value={profile.company?.grievance_email || "grievance@pay2pay.in"}
                      onCopy={() => handleCopy(profile.company?.grievance_email || "grievance@pay2pay.in", "Grievance Email")}
                    />
                    <DataRow label="Resolution Turnaround Time" value="Level 1: 24h | Grievance Escalation: 48-72h" />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── UPDATE EMAIL OTP DIALOG ── */}
      <Dialog
        open={emailModalOpen}
        onClose={handleCloseEmailModal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0F172A",
            backgroundImage: "linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: 3.5,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
              <Mail size={20} color="#60A5FA" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "1.1rem" }}>
                Update Email Address
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Two-step OTP verification required
              </Typography>
            </Box>
          </Stack>
          <IconButton
            size="small"
            onClick={handleCloseEmailModal}
            disabled={sendingEmailOtp || verifyingEmailOtp}
            sx={{ color: "#94A3B8", "&:hover": { color: "#FFFFFF" } }}
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
                bgcolor: "rgba(239, 68, 68, 0.15)",
                color: "#FCA5A5",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 2,
                fontSize: "0.82rem",
                "& .MuiAlert-icon": { color: "#EF4444" },
              }}
            >
              {emailModalError}
            </Alert>
          )}

          {/* Current Verified Email Info */}
          <Box sx={{ p: 1.5, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.06)", mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", fontWeight: 600 }}>
              CURRENT VERIFIED EMAIL
            </Typography>
            <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, mt: 0.2 }}>
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
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  py: 1.2,
                  borderRadius: 2.5,
                  textTransform: "none",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                {sendingEmailOtp ? "Sending Verification Code..." : "Send Verification OTP"}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <Box sx={{ p: 1.5, bgcolor: "rgba(59, 130, 246, 0.08)", borderRadius: 2, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                  VERIFICATION CODE SENT TO
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.3 }}>
                  <Typography variant="body2" sx={{ color: "#60A5FA", fontWeight: 700 }}>
                    {newEmail}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      setEmailOtpSent(false);
                      setEmailOtp("");
                      setEmailModalError(null);
                    }}
                    sx={{ color: "#94A3B8", fontSize: "0.72rem", textTransform: "none", p: 0, minWidth: 0 }}
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
                  style: { textAlign: "center", letterSpacing: "8px", fontSize: "1.3rem", fontWeight: 700 },
                }}
                sx={inputStyle}
                helperText="Enter the 6-digit code received in your inbox."
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  Didn't receive the code?
                </Typography>
                <Button
                  size="small"
                  onClick={handleSendEmailOtp}
                  disabled={resendTimer > 0 || sendingEmailOtp}
                  sx={{ color: resendTimer > 0 ? "#64748B" : "#60A5FA", fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend OTP"}
                </Button>
              </Stack>

              <Alert
                severity="info"
                icon={<ShieldCheck size={16} color="#60A5FA" />}
                sx={{
                  bgcolor: "rgba(15, 23, 42, 0.6)",
                  color: "#94A3B8",
                  border: "1px solid rgba(59, 130, 246, 0.15)",
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
            bgcolor: "#0F172A",
            backgroundImage: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            borderRadius: 3.5,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            color: "#FFFFFF",
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
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#FFFFFF" }}>
                WhatsApp Authorization
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                {secOtpAction === "PASSWORD" ? "Update Account Password" : "Update Transaction MPIN"}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={() => setSecOtpModalOpen(false)}
            disabled={secOtpSending || secOtpVerifying}
            sx={{ color: "#94A3B8", "&:hover": { color: "#FFFFFF" } }}
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
                bgcolor: "rgba(37, 99, 235, 0.12)",
                color: "#93C5FD",
                border: "1px solid rgba(37, 99, 235, 0.25)",
                "& .MuiAlert-icon": { color: "#60A5FA" },
                fontSize: "0.82rem",
              }}
            >
              A 6-digit one-time passcode has been sent to your registered WhatsApp mobile number{" "}
              <strong style={{ color: "#FFFFFF" }}>{secMaskedMobile}</strong>.
            </Alert>

            {secOtpError && (
              <Alert
                severity="error"
                sx={{
                  bgcolor: "rgba(239, 68, 68, 0.15)",
                  color: "#FCA5A5",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontSize: "0.82rem",
                }}
              >
                {secOtpError}
              </Alert>
            )}

            <Box sx={{ textAlign: "center", py: 1 }}>
              <Typography variant="caption" sx={{ color: "#94A3B8", mb: 1, display: "block" }}>
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
                    color: "#60A5FA",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(15, 23, 42, 0.8)",
                    borderRadius: 2.5,
                    "& fieldset": { borderColor: "rgba(37, 99, 235, 0.4)" },
                    "&:hover fieldset": { borderColor: "#3B82F6" },
                    "&.Mui-focused fieldset": { borderColor: "#60A5FA" },
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
                sx={{ color: secOtpResendTimer > 0 ? "#64748B" : "#38BDF8", textTransform: "none", fontSize: "0.78rem" }}
              >
                {secOtpResendTimer > 0 ? `Resend in ${secOtpResendTimer}s` : "Resend WhatsApp OTP"}
              </Button>
            </Stack>

            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "rgba(239, 68, 68, 0.08)", border: "1px dashed rgba(239, 68, 68, 0.25)" }}>
              <Typography variant="caption" sx={{ color: "#F87171", display: "block", textAlign: "center", fontSize: "0.75rem" }}>
                Strict Verification: If an invalid or expired OTP is entered, changes will NOT be saved to the database.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setSecOtpModalOpen(false)}
            disabled={secOtpSending || secOtpVerifying}
            sx={{ color: "#94A3B8", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerifyAndSubmitSecurity}
            disabled={secOtpVerifying || secOtpCode.length < 4}
            variant="contained"
            startIcon={secOtpVerifying ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
            sx={{
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              fontWeight: 700,
              textTransform: "none",
              px: 3,
              borderRadius: 2.5,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
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
            bgcolor: "#0F172A",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 3.5,
            overflow: "hidden",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, bgcolor: "rgba(30, 41, 59, 0.7)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ p: 1, bgcolor: "rgba(59, 130, 246, 0.15)", borderRadius: 2 }}>
                <FileCheck size={20} color="#60A5FA" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: "#FFFFFF", fontWeight: 800 }}>
                  {selectedDoc?.title || "Verification Document"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  {selectedDoc?.fileName}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setSelectedDoc(null)} sx={{ color: "#94A3B8", "&:hover": { color: "#FFFFFF" } }}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: "#020617", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              />
            )
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "rgba(30, 41, 59, 0.5)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExternalLink size={15} />}
            href={selectedDoc?.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "#94A3B8", borderColor: "rgba(255, 255, 255, 0.15)", textTransform: "none" }}
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
              sx={{ bgcolor: "#2563EB", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: "#1D4ED8" } }}
            >
              Download
            </Button>
            <Button variant="outlined" size="small" onClick={() => setSelectedDoc(null)} sx={{ color: "#E2E8F0", textTransform: "none" }}>
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
}: {
  label: string;
  value?: string | number | null;
  onCopy?: () => void;
  isStatus?: boolean;
  action?: React.ReactNode;
}) {
  const displayVal = value !== null && value !== undefined && value !== "" ? String(value) : "—";

  return (
    <Box sx={rowBoxStyle}>
      <Typography variant="caption" sx={labelStyle}>
        {label}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.4 }}>
        <Typography
          variant="body1"
          sx={{
            color: isStatus ? "#4ADE80" : "#FFFFFF",
            fontWeight: 600,
            wordBreak: "break-all",
          }}
        >
          {displayVal}
        </Typography>
        {onCopy && displayVal !== "—" && (
          <Tooltip title="Copy to clipboard">
            <IconButton size="small" onClick={onCopy} sx={{ color: "#60A5FA", ml: 1 }}>
              <Copy size={16} />
            </IconButton>
          </Tooltip>
        )}
        {action && <Box sx={{ ml: 1 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}

// ── STYLES ──

const cardStyle = {
  p: { xs: 2.5, md: 3.5 },
  borderRadius: 3.5,
  bgcolor: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
};

const cardTitleStyle = {
  fontWeight: 800,
  color: "#FFFFFF",
  mb: 2.5,
  letterSpacing: "-0.01em",
};

const rowBoxStyle = {
  p: 1.8,
  borderRadius: 2.5,
  bgcolor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
};

const fieldBoxStyle = {
  p: 2,
  borderRadius: 2.5,
  bgcolor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
};

const labelStyle = {
  color: "#94A3B8",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const verifiedBadgeStyle = {
  bgcolor: "rgba(34, 197, 94, 0.15)",
  color: "#4ADE80",
  fontWeight: 700,
  height: 22,
  fontSize: "0.72rem",
};

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    color: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 2.5,
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    "&:hover fieldset": {
      borderColor: "#3B82F6",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#3B82F6",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#94A3B8",
    "&.Mui-focused": {
      color: "#60A5FA",
    },
  },
  "& .MuiFormHelperText-root": {
    color: "#94A3B8",
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
