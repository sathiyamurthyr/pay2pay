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
  Grid
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
  Globe
} from "lucide-react";
import { retailerApi } from "@/services/retailer-api";

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
    } | null;
    aadhaar?: {
      masked?: string | null;
      verification_status?: string | null;
      verification_date?: string | null;
      provider?: string | null;
      provider_reference?: string | null;
      kyc_status?: string | null;
    } | null;
    gst?: {
      masked?: string | null;
      legal_business_name?: string | null;
      status?: string | null;
    } | null;
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.current_password || !pwdForm.new_password || !pwdForm.confirm_password) {
      setToast({ open: true, message: "Please fill all password fields.", severity: "error" });
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setToast({ open: true, message: "New password and confirmation password do not match.", severity: "error" });
      return;
    }
    try {
      setSaving(true);
      await retailerApi.changePassword(pwdForm);
      setToast({ open: true, message: "Account password updated successfully.", severity: "success" });
      setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
      await fetchProfile();
    } catch (err: any) {
      setToast({ open: true, message: err?.response?.data?.detail || err?.message || "Unable to change password.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinForm.new_pin || !pinForm.confirm_pin) {
      setToast({ open: true, message: "Please enter new MPIN and confirmation.", severity: "error" });
      return;
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      setToast({ open: true, message: "New MPIN and confirmation MPIN do not match.", severity: "error" });
      return;
    }
    try {
      setSaving(true);
      await retailerApi.changeMpin(pinForm);
      setToast({ open: true, message: "Transaction MPIN updated successfully.", severity: "success" });
      setPinForm({ current_pin: "", new_pin: "", confirm_pin: "" });
      await fetchProfile();
    } catch (err: any) {
      setToast({ open: true, message: err?.response?.data?.detail || err?.message || "Unable to change MPIN.", severity: "error" });
    } finally {
      setSaving(false);
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
                    {profile.contact.email_raw && (
                      <IconButton size="small" onClick={() => handleCopy(profile.contact.email_raw, "Email Address")} sx={{ color: "#94A3B8", "&:hover": { color: "#60A5FA" } }}>
                        <Copy size={15} />
                      </IconButton>
                    )}
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
                  placeholder="+91 98765 43210"
                />
                <TextField
                  label="WhatsApp Number"
                  value={contactForm.whatsapp_number}
                  onChange={(e) => setContactForm({ ...contactForm, whatsapp_number: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="+91 98765 43210"
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
                        {profile.company?.company_name || "Pay2Pay Financial Technologies Private Limited"}
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
                      {profile.company?.whatsapp_number || "+91 91766 69426"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 1.5 }}>
                      Instant Merchant Chat
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        href={`https://wa.me/919176669426?text=${encodeURIComponent("Hello Pay2Pay Support, I need assistance with my Retailer Account.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        size="small"
                        startIcon={<MessageSquare size={13} />}
                        sx={{ bgcolor: "#16A34A", fontWeight: 700, fontSize: "0.75rem", "&:hover": { bgcolor: "#15803D" } }}
                      >
                        WhatsApp
                      </Button>
                      <IconButton size="small" onClick={() => handleCopy(profile.company?.whatsapp_number || "+91 91766 69426", "WhatsApp Number")} sx={{ color: "#94A3B8" }}>
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  PAN Identification
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={13} color="#22C55E" />}
                  label={profile.kyc.pan?.verification_status || "VERIFIED"}
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
            </Paper>
          </Grid>

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
            </Paper>
          </Grid>

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
        </Grid>
      )}

      {/* 5. BANK TAB */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
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
                <Stack spacing={1.8}>
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

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Bank Compliance Policy
              </Typography>
              <Alert severity="info" sx={{ bgcolor: "rgba(2, 132, 199, 0.15)", color: "#38BDF8", border: "1px solid rgba(2, 132, 199, 0.3)" }}>
                Settlement bank details are validated via penny drop verification against NPCI registry. To request an account modification, initiate a Bank Change Request ticket with your Relationship Manager.
              </Alert>
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
              <Typography variant="h6" sx={cardTitleStyle}>
                PASSWORD
              </Typography>
              <form onSubmit={handleChangePassword}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Current Password"
                    type="password"
                    value={pwdForm.current_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                  />
                  <TextField
                    label="New Password"
                    type="password"
                    value={pwdForm.new_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    helperText="Minimum 8 characters with letters, numbers & symbols"
                  />
                  <TextField
                    label="Confirm Password"
                    type="password"
                    value={pwdForm.confirm_password}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                  >
                    {saving ? "Updating..." : "Change Password"}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Grid>

          {/* TRANSACTION PIN SECTION */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                TRANSACTION PIN
              </Typography>
              <form onSubmit={handleChangePin}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Current PIN (Optional)"
                    type="password"
                    value={pinForm.current_pin}
                    onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="••••"
                    inputProps={{ maxLength: 6 }}
                  />
                  <TextField
                    label="New PIN"
                    type="password"
                    value={pinForm.new_pin}
                    onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="••••"
                    inputProps={{ maxLength: 6 }}
                    helperText="4 or 6 digit numeric authorization code"
                  />
                  <TextField
                    label="Confirm PIN"
                    type="password"
                    value={pinForm.confirm_pin}
                    onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="••••"
                    inputProps={{ maxLength: 6 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                  >
                    {saving ? "Updating..." : "Change PIN"}
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
                <DataRow label="Company Legal Name" value={profile.company?.company_name || "Pay2Pay Financial Technologies Private Limited"} />
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
                  value={profile.company?.whatsapp_number || "+91 91766 69426"}
                  onCopy={() => handleCopy(profile.company?.whatsapp_number || "+91 91766 69426", "WhatsApp Number")}
                  action={
                    <Button
                      href={`https://wa.me/919176669426?text=${encodeURIComponent("Hello Pay2Pay Support, I need assistance with my Retailer Account.")}`}
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
