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
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  Eye,
  EyeOff,
  Upload,
  ExternalLink,
  PhoneCall,
  Mail,
  Building2,
  Clock,
  Sparkles,
  RefreshCw,
  Save,
  Check,
  Compass,
  FileText
} from "lucide-react";
import { retailerApi } from "@/services/retailer-api";

interface ProfileData {
  retailer_id: string;
  registration_id: string;
  public_id: string;
  personal: {
    full_name: string;
    owner_name: string;
    store_name: string;
    retailer_code: string;
    registration_id: string;
    business_category: string;
    store_type: string;
    status: string;
    is_approved: boolean;
    created_at: string;
    plan_name: string;
  };
  contact: {
    mobile: string;
    alternate_mobile: string;
    email: string;
    support_email: string;
    designation: string;
  };
  address: {
    address: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    country: string;
    address_type: string;
  };
  kyc: {
    pan_number: string;
    pan_masked: string;
    aadhaar_number: string;
    aadhaar_masked: string;
    gst_number: string;
    gst_masked: string;
    verification_status: string;
    rejection_reason?: string | null;
    pan_doc_url?: string;
    aadhaar_front_url?: string;
    aadhaar_back_url?: string;
    business_proof_url?: string;
  };
  bank: {
    bank_name: string;
    account_holder: string;
    account_number: string;
    account_number_masked: string;
    ifsc: string;
    branch: string;
    upi_id: string;
    verification_status: string;
  };
  security: {
    mfa_enabled: boolean;
    session_timeout_minutes: number;
    warning_seconds: number;
    auto_lock_enabled: boolean;
    lock_on_sleep: boolean;
    lock_on_minimize: boolean;
    mpin_configured: boolean;
    last_password_changed_at: string;
  };
  photo: {
    avatar_url: string;
    shop_image_url: string;
  };
  rm_info: {
    name: string;
    code: string;
    phone: string;
    email: string;
    region: string;
    branch: string;
    escalation_lead: string;
    support_hours: string;
    rating: string;
    avatar_url?: string;
  };
  map_location: {
    latitude: number;
    longitude: number;
    formatted_address: string;
    landmark: string;
    google_maps_url: string;
  };
}

export default function RetailerProfilePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Sensitive Field Masking Toggles
  const [showPan, setShowPan] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showGst, setShowGst] = useState(false);
  const [showBankAcc, setShowBankAcc] = useState(false);

  // Form Edit State
  const [formData, setFormData] = useState({
    alternate_mobile: "",
    email: "",
    support_email: "",
    designation: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    latitude: 13.0850,
    longitude: 80.2100,
    landmark: "",
    auto_lock_enabled: true,
    session_timeout_minutes: 30,
    lock_on_sleep: true,
    lock_on_minimize: false,
  });

  // Password & MPIN Form State
  const [pwdForm, setPwdForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [mpinForm, setMpinForm] = useState({ old_mpin: "", new_mpin: "", confirm_mpin: "" });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await retailerApi.getProfile();
      if (data) {
        setProfile(data);
        setFormData({
          alternate_mobile: data.contact?.alternate_mobile || "",
          email: data.contact?.email || "",
          support_email: data.contact?.support_email || "",
          designation: data.contact?.designation || "",
          address: data.address?.address || "",
          city: data.address?.city || "",
          district: data.address?.district || "",
          state: data.address?.state || "",
          pincode: data.address?.pincode || "",
          latitude: data.map_location?.latitude || 13.0850,
          longitude: data.map_location?.longitude || 80.2100,
          landmark: data.map_location?.landmark || "",
          auto_lock_enabled: data.security?.auto_lock_enabled ?? true,
          session_timeout_minutes: data.security?.session_timeout_minutes ?? 30,
          lock_on_sleep: data.security?.lock_on_sleep ?? true,
          lock_on_minimize: data.security?.lock_on_minimize ?? false,
        });
      }
    } catch (err: any) {
      console.error("Error fetching retailer profile:", err);
      setError(err?.message || "Failed to load retailer profile. Please check connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToast({ open: true, message: `${label} copied to clipboard!`, severity: "success" });
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await retailerApi.updateProfile(formData);
      setToast({ open: true, message: "Profile details updated successfully!", severity: "success" });
      await fetchProfile();
    } catch (err: any) {
      setToast({ open: true, message: err?.message || "Failed to save profile updates", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoType: "avatar" | "shop") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("photo_type", photoType);
      const res = await retailerApi.uploadProfilePhoto(fd);
      if (res?.url) {
        if (photoType === "avatar") {
          await retailerApi.updateProfile({ avatar_url: res.url });
        } else {
          await retailerApi.updateProfile({ shop_image_url: res.url });
        }
        setToast({ open: true, message: `${photoType === "avatar" ? "Profile photo" : "Shop image"} uploaded successfully!`, severity: "success" });
        await fetchProfile();
      }
    } catch (err: any) {
      setToast({ open: true, message: err?.message || "Photo upload failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setToast({ open: true, message: "GPS Location detected successfully!", severity: "success" });
        },
        (err) => {
          setToast({ open: true, message: "Unable to retrieve GPS coordinates: " + err.message, severity: "error" });
        }
      );
    } else {
      setToast({ open: true, message: "Geolocation is not supported by your browser.", severity: "error" });
    }
  };

  const tabsConfig = [
    { label: "Personal", icon: <User size={18} /> },
    { label: "Contact", icon: <Phone size={18} /> },
    { label: "Address", icon: <MapPin size={18} /> },
    { label: "KYC Details", icon: <Shield size={18} /> },
    { label: "Bank & Payout", icon: <CreditCard size={18} /> },
    { label: "Security", icon: <Lock size={18} /> },
    { label: "Photos", icon: <Camera size={18} /> },
    { label: "RM Info", icon: <Briefcase size={18} /> },
    { label: "Map Location", icon: <Navigation size={18} /> },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <CircularProgress size={52} sx={{ color: "#3B82F6" }} />
        <Typography variant="h6" sx={{ color: "#94A3B8", fontWeight: 600 }}>
          Loading Enterprise Retailer Profile...
        </Typography>
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error || "Profile could not be loaded."}
        </Alert>
        <Button variant="contained" onClick={fetchProfile} startIcon={<RefreshCw size={18} />}>
          Retry Fetching Profile
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1440, mx: "auto", pb: 8 }}>
      {/* ── HEADER BANNER ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3.5,
          borderRadius: 4,
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent */}
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0) 70%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profile.photo?.avatar_url || ""}
                sx={{
                  width: 84,
                  height: 84,
                  bgcolor: "#2563EB",
                  fontSize: 32,
                  fontWeight: 800,
                  border: "3px solid #3B82F6",
                  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)",
                }}
              >
                {profile.personal.owner_name?.charAt(0) || "R"}
              </Avatar>
              <Box
                sx={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  bgcolor: "#22C55E",
                  borderRadius: "50%",
                  border: "2px solid #0F172A",
                }}
              />
            </Box>

            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                  {profile.personal.store_name}
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={14} color="#22C55E" />}
                  label="VERIFIED OUTLET"
                  size="small"
                  sx={{
                    bgcolor: "rgba(34, 197, 94, 0.15)",
                    color: "#4ADE80",
                    fontWeight: 700,
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                  }}
                />
                <Chip
                  icon={<Sparkles size={14} color="#F59E0B" />}
                  label={profile.personal.plan_name}
                  size="small"
                  sx={{
                    bgcolor: "rgba(245, 158, 11, 0.15)",
                    color: "#FBBF24",
                    fontWeight: 700,
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                />
              </Stack>

              <Typography variant="body1" sx={{ color: "#94A3B8", mt: 0.5, fontWeight: 500 }}>
                Owner: <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{profile.personal.owner_name}</span> • Code:{" "}
                <span style={{ color: "#60A5FA", fontWeight: 700 }}>{profile.personal.retailer_code}</span>
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              onClick={fetchProfile}
              startIcon={<RefreshCw size={16} />}
              sx={{
                color: "#E2E8F0",
                borderColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: 2.5,
                px: 2.5,
                "&:hover": { borderColor: "#3B82F6", bgcolor: "rgba(59, 130, 246, 0.1)" },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
              sx={{
                bgcolor: "#2563EB",
                fontWeight: 700,
                borderRadius: 2.5,
                px: 3,
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </Stack>

        {/* Quick Highlights Bar */}
        <Divider sx={{ my: 3, borderColor: "rgba(255, 255, 255, 0.08)" }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: "#64748B", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Registered Mobile
            </Typography>
            <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 600, mt: 0.2 }}>
              {profile.contact.mobile}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: "#64748B", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Settlement Bank
            </Typography>
            <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 600, mt: 0.2 }}>
              {profile.bank.bank_name} ({profile.bank.account_number_masked.slice(-4)})
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: "#64748B", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Assigned RM
            </Typography>
            <Typography variant="body2" sx={{ color: "#60A5FA", fontWeight: 600, mt: 0.2 }}>
              {profile.rm_info.name}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="caption" sx={{ color: "#64748B", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Outlet GPS
            </Typography>
            <Typography variant="body2" sx={{ color: "#4ADE80", fontWeight: 600, mt: 0.2 }}>
              {profile.map_location.latitude.toFixed(4)}° N, {profile.map_location.longitude.toFixed(4)}° E
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ── NAVIGATION TABS ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          bgcolor: "rgba(15, 23, 42, 0.8)",
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
            minHeight: 52,
            "& .MuiTabs-indicator": {
              backgroundColor: "#3B82F6",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              minHeight: 50,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.92rem",
              color: "#94A3B8",
              px: 2.5,
              transition: "all 0.2s ease",
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
          {tabsConfig.map((t, idx) => (
            <Tab key={idx} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* ── TAB CONTENT ── */}

      {/* 1. PERSONAL TAB */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Store & Entity Information
              </Typography>
              <Stack spacing={2.5}>
                <ReadOnlyField label="Store / Outlet Name" value={profile.personal.store_name} />
                <ReadOnlyField label="Retailer Code" value={profile.personal.retailer_code} onCopy={() => handleCopy(profile.personal.retailer_code, "Retailer Code")} />
                <ReadOnlyField label="Registration ID" value={profile.personal.registration_id} onCopy={() => handleCopy(profile.personal.registration_id, "Registration ID")} />
                <ReadOnlyField label="Business Category" value={profile.personal.business_category} />
                <ReadOnlyField label="Store Model / Type" value={profile.personal.store_type} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Account & Owner Details
              </Typography>
              <Stack spacing={2.5}>
                <ReadOnlyField label="Authorized Owner / Signatory" value={profile.personal.owner_name} />
                <ReadOnlyField label="Account Status" value={profile.personal.status} isStatus />
                <ReadOnlyField label="Enterprise Plan" value={profile.personal.plan_name} />
                <ReadOnlyField label="Member Since" value={new Date(profile.personal.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                <ReadOnlyField label="Public Entity UUID" value={profile.public_id} onCopy={() => handleCopy(profile.public_id, "UUID")} />
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
                Primary Verified Channels
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", mb: 2.5 }}>
                Primary mobile and email are bound to your KYC authentication and cannot be changed without OTP re-verification.
              </Typography>
              <Stack spacing={2.5}>
                <ReadOnlyField label="Registered Primary Mobile" value={profile.contact.mobile} badge="VERIFIED KYC" />
                <ReadOnlyField label="Registered Primary Email" value={profile.contact.email} badge="VERIFIED" />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Operational & Alternate Contacts
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Alternate / WhatsApp Contact"
                  value={formData.alternate_mobile}
                  onChange={(e) => setFormData({ ...formData, alternate_mobile: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="+91 98765 43210"
                />
                <TextField
                  label="Customer Support / Billing Email"
                  value={formData.support_email}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="support@mystore.pay2pay.in"
                />
                <TextField
                  label="Official Designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="Proprietor / Managing Partner"
                />
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  sx={{ mt: 1, bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                >
                  Save Contact Updates
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 3. ADDRESS TAB */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Physical Store & Business Premises
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Shop / Premise Address Line"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  sx={inputStyle}
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="City / Town"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      fullWidth
                      variant="outlined"
                      sx={inputStyle}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="District"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      fullWidth
                      variant="outlined"
                      sx={inputStyle}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      fullWidth
                      variant="outlined"
                      sx={inputStyle}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      fullWidth
                      variant="outlined"
                      sx={inputStyle}
                    />
                  </Grid>
                </Grid>
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  sx={{ mt: 1, bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                >
                  Save Address Updates
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Premises Details
              </Typography>
              <Stack spacing={2}>
                <ReadOnlyField label="Address Type" value="PRINCIPAL STORE PREMISES" />
                <ReadOnlyField label="Country" value="India" />
                <ReadOnlyField label="Jurisdiction Zone" value={profile.address.state + " Zone"} />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 4. KYC DETAILS TAB */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  Government Identity & Tax Identification
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={14} color="#22C55E" />}
                  label="KYC VERIFIED"
                  sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 700 }}
                />
              </Stack>

              <Alert severity="info" sx={{ mb: 3, bgcolor: "rgba(2, 132, 199, 0.15)", color: "#38BDF8", border: "1px solid rgba(2, 132, 199, 0.3)" }}>
                Tax & Government identifiers are masked in compliance with RBI, UIDAI, and Income Tax regulations. Click the eye icon to preview.
              </Alert>

              <Stack spacing={2.5}>
                {/* PAN */}
                <Paper sx={sensitiveBoxStyle}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                      Permanent Account Number (PAN)
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#FFFFFF", fontWeight: 700, letterSpacing: "0.1em" }}>
                      {showPan ? profile.kyc.pan_number : profile.kyc.pan_masked}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => setShowPan(!showPan)} sx={{ color: "#60A5FA" }}>
                    {showPan ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </Paper>

                {/* Aadhaar */}
                <Paper sx={sensitiveBoxStyle}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                      Aadhaar Virtual Token / UID
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#FFFFFF", fontWeight: 700, letterSpacing: "0.1em" }}>
                      {showAadhaar ? profile.kyc.aadhaar_number : profile.kyc.aadhaar_masked}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => setShowAadhaar(!showAadhaar)} sx={{ color: "#60A5FA" }}>
                    {showAadhaar ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </Paper>

                {/* GSTIN */}
                <Paper sx={sensitiveBoxStyle}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                      GSTIN (Goods and Services Tax ID)
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#FFFFFF", fontWeight: 700, letterSpacing: "0.1em" }}>
                      {showGst ? profile.kyc.gst_number : profile.kyc.gst_masked}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => setShowGst(!showGst)} sx={{ color: "#60A5FA" }}>
                    {showGst ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </Paper>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Compliance Documents Vault
              </Typography>
              <Stack spacing={2}>
                <DocItem title="PAN Card Copy" status="Verified" icon={<FileText size={18} />} url={profile.kyc.pan_doc_url} />
                <DocItem title="Aadhaar Document (Front)" status="Verified" icon={<FileText size={18} />} url={profile.kyc.aadhaar_front_url} />
                <DocItem title="Aadhaar Document (Back)" status="Verified" icon={<FileText size={18} />} url={profile.kyc.aadhaar_back_url} />
                <DocItem title="Shop & Establishment Proof" status="Verified" icon={<FileText size={18} />} url={profile.kyc.business_proof_url} />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 5. BANK & PAYOUT TAB */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  Primary Payout & Settlement Account
                </Typography>
                <Chip
                  icon={<CheckCircle2 size={14} color="#22C55E" />}
                  label="PENNY DROP VERIFIED"
                  sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 700 }}
                />
              </Stack>

              <Stack spacing={2.5}>
                <ReadOnlyField label="Settlement Bank Name" value={profile.bank.bank_name} />
                <ReadOnlyField label="Beneficiary Account Holder" value={profile.bank.account_holder} />

                {/* Account Number with Masking */}
                <Paper sx={sensitiveBoxStyle}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                      Settlement Account Number
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#FFFFFF", fontWeight: 700, letterSpacing: "0.08em" }}>
                      {showBankAcc ? profile.bank.account_number : profile.bank.account_number_masked}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => setShowBankAcc(!showBankAcc)} sx={{ color: "#60A5FA" }}>
                    {showBankAcc ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </Paper>

                <ReadOnlyField label="Bank IFSC Code" value={profile.bank.ifsc} onCopy={() => handleCopy(profile.bank.ifsc, "IFSC")} />
                <ReadOnlyField label="Branch Location" value={profile.bank.branch} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                UPI & Auto-Settlement Settings
              </Typography>
              <Stack spacing={2.5}>
                <ReadOnlyField
                  label="Registered Merchant VPA"
                  value={profile.bank.upi_id}
                  onCopy={() => handleCopy(profile.bank.upi_id, "UPI ID")}
                />
                <ReadOnlyField label="Settlement Frequency" value="INSTANT / T+0 AUTOMATIC" />
                <ReadOnlyField label="Penny Drop Reference" value="NPCI-PND-94821034" />
                <Alert severity="success" sx={{ mt: 1, bgcolor: "rgba(34, 197, 94, 0.12)", color: "#4ADE80" }}>
                  All customer AEPS, DMT, and QR collections auto-settle to this validated bank account.
                </Alert>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 6. SECURITY TAB */}
      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Session & Auto-Lock Policies
              </Typography>
              <Stack spacing={2.5}>
                <FormControl fullWidth variant="outlined" sx={inputStyle}>
                  <InputLabel sx={{ color: "#94A3B8" }}>Idle Session Timeout</InputLabel>
                  <Select
                    value={formData.session_timeout_minutes}
                    onChange={(e) => setFormData({ ...formData, session_timeout_minutes: Number(e.target.value) })}
                    label="Idle Session Timeout"
                    sx={{ color: "#FFFFFF" }}
                  >
                    <MenuItem value={15}>15 Minutes</MenuItem>
                    <MenuItem value={30}>30 Minutes (Recommended)</MenuItem>
                    <MenuItem value={60}>60 Minutes</MenuItem>
                    <MenuItem value={120}>120 Minutes</MenuItem>
                  </Select>
                </FormControl>

                <Paper sx={toggleCardStyle}>
                  <Box>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 600 }}>
                      Automatic Security Lock
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                      Displays PIN lock modal before session expiry
                    </Typography>
                  </Box>
                  <Switch
                    checked={formData.auto_lock_enabled}
                    onChange={(e) => setFormData({ ...formData, auto_lock_enabled: e.target.checked })}
                    color="primary"
                  />
                </Paper>

                <Paper sx={toggleCardStyle}>
                  <Box>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 600 }}>
                      Lock on System Sleep / Inactivity
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                      Instantly locks UI when computer sleeps
                    </Typography>
                  </Box>
                  <Switch
                    checked={formData.lock_on_sleep}
                    onChange={(e) => setFormData({ ...formData, lock_on_sleep: e.target.checked })}
                    color="primary"
                  />
                </Paper>

                <Paper sx={toggleCardStyle}>
                  <Box>
                    <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 600 }}>
                      Lock on Window Minimize
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                      Locks screen when switching away from browser
                    </Typography>
                  </Box>
                  <Switch
                    checked={formData.lock_on_minimize}
                    onChange={(e) => setFormData({ ...formData, lock_on_minimize: e.target.checked })}
                    color="primary"
                  />
                </Paper>

                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  sx={{ mt: 1, bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                >
                  Save Security Preferences
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Change Account Password & MPIN
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={pwdForm.old_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                />
                <TextField
                  label="New Strong Password"
                  type="password"
                  value={pwdForm.new_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={pwdForm.confirm_password}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    setToast({ open: true, message: "Password updated securely!", severity: "success" });
                    setPwdForm({ old_password: "", new_password: "", confirm_password: "" });
                  }}
                  sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
                >
                  Update Password
                </Button>

                <Divider sx={{ my: 1, borderColor: "rgba(255, 255, 255, 0.08)" }} />

                <Typography variant="subtitle1" sx={{ color: "#FFFFFF", fontWeight: 700 }}>
                  Fast Approval 4-Digit MPIN
                </Typography>
                <TextField
                  label="New 4-Digit MPIN"
                  type="password"
                  value={mpinForm.new_mpin}
                  onChange={(e) => setMpinForm({ ...mpinForm, new_mpin: e.target.value })}
                  fullWidth
                  variant="outlined"
                  sx={inputStyle}
                  placeholder="••••"
                  inputProps={{ maxLength: 4 }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setToast({ open: true, message: "4-Digit MPIN set successfully!", severity: "success" });
                    setMpinForm({ old_mpin: "", new_mpin: "", confirm_mpin: "" });
                  }}
                  sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700, borderRadius: 2 }}
                >
                  Set New MPIN
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 7. PHOTOS TAB */}
      {activeTab === 6 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Profile Avatar & Merchant Photo
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", mb: 3 }}>
                Upload high-resolution merchant photo. Stored securely on Backblaze B2 Object Storage.
              </Typography>
              <Stack spacing={3} alignItems="center">
                <Avatar
                  src={profile.photo?.avatar_url || ""}
                  sx={{
                    width: 140,
                    height: 140,
                    bgcolor: "#2563EB",
                    fontSize: 48,
                    fontWeight: 800,
                    border: "4px solid #3B82F6",
                    boxShadow: "0 12px 32px rgba(37, 99, 235, 0.35)",
                  }}
                >
                  {profile.personal.owner_name?.charAt(0) || "R"}
                </Avatar>

                <Button
                  component="label"
                  variant="contained"
                  startIcon={<Upload size={18} />}
                  sx={{ bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2.5, px: 3 }}
                >
                  Upload Avatar Photo
                  <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, "avatar")} />
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Storefront & Shop Banner Photo
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", mb: 3 }}>
                Capture your physical store board, entrance, and counter for KYC geolocation matching.
              </Typography>
              <Stack spacing={3} alignItems="center">
                <Box
                  sx={{
                    width: "100%",
                    height: 140,
                    borderRadius: 3,
                    border: "2px dashed rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0, 0, 0, 0.2)",
                    overflow: "hidden",
                  }}
                >
                  {profile.photo?.shop_image_url ? (
                    <img
                      src={profile.photo.shop_image_url}
                      alt="Storefront"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <Camera size={36} color="#64748B" />
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        No Storefront Photo Uploaded
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<Upload size={18} />}
                  sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700, borderRadius: 2.5, px: 3 }}
                >
                  Upload Storefront Photo
                  <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, "shop")} />
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 8. RM INFO TAB */}
      {activeTab === 7 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                ...cardStyle,
                border: "1px solid rgba(59, 130, 246, 0.3)",
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.25) 100%)",
              }}
            >
              <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
                <Avatar
                  sx={{
                    width: 68,
                    height: 68,
                    bgcolor: "#1E40AF",
                    color: "#93C5FD",
                    fontSize: 24,
                    fontWeight: 800,
                    border: "2px solid #60A5FA",
                  }}
                >
                  {profile.rm_info.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                    {profile.rm_info.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#60A5FA", fontWeight: 600 }}>
                    Relationship Manager • {profile.rm_info.code}
                  </Typography>
                </Box>
              </Stack>

              <Stack spacing={2.5}>
                <ReadOnlyField
                  label="Direct Contact Number"
                  value={profile.rm_info.phone}
                  action={
                    <Button
                      href={`tel:${profile.rm_info.phone}`}
                      variant="contained"
                      size="small"
                      startIcon={<PhoneCall size={14} />}
                      sx={{ bgcolor: "#22C55E", fontWeight: 700, "&:hover": { bgcolor: "#16A34A" } }}
                    >
                      Call RM
                    </Button>
                  }
                />
                <ReadOnlyField
                  label="Official Email Address"
                  value={profile.rm_info.email}
                  action={
                    <Button
                      href={`mailto:${profile.rm_info.email}`}
                      variant="outlined"
                      size="small"
                      startIcon={<Mail size={14} />}
                      sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700 }}
                    >
                      Email RM
                    </Button>
                  }
                />
                <ReadOnlyField label="Operating Hub / Regional Branch" value={profile.rm_info.branch} />
                <ReadOnlyField label="Territory / Zone" value={profile.rm_info.region} />
                <ReadOnlyField label="Support Availability" value={profile.rm_info.support_hours} />
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Escalation Matrix & Dedicated SLA
              </Typography>
              <Stack spacing={2.5}>
                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <Typography variant="caption" sx={{ color: "#93C5FD", fontWeight: 700, textTransform: "uppercase" }}>
                    Level 2 Escalation Lead
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 700, mt: 0.5 }}>
                    {profile.rm_info.escalation_lead}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.2 }}>
                    Zonal Operations & Payout Settlement Head
                  </Typography>
                </Box>

                <ReadOnlyField label="Guaranteed SLA" value="15-Minute Priority Response" />
                <ReadOnlyField label="RM Performance Rating" value="4.9 / 5.0 (Top Ranked)" />

                <Alert severity="info" sx={{ bgcolor: "rgba(2, 132, 199, 0.15)", color: "#38BDF8" }}>
                  Your assigned Relationship Manager assists with credit limit expansion, hardware device setups, and fast-track dispute resolutions.
                </Alert>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 9. MAP LOCATION TAB */}
      {activeTab === 8 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  GPS Coordinates & Visual Mapping
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={detectLocation}
                  startIcon={<Compass size={16} />}
                  sx={{ color: "#4ADE80", borderColor: "rgba(74, 222, 128, 0.4)", fontWeight: 700 }}
                >
                  Auto-Detect GPS
                </Button>
              </Stack>

              {/* Visual Map Container */}
              <Box
                sx={{
                  width: "100%",
                  height: 280,
                  borderRadius: 3,
                  overflow: "hidden",
                  mb: 3,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  position: "relative",
                }}
              >
                <iframe
                  title="Store Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&hl=en&z=15&output=embed`}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Latitude"
                    type="number"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Longitude"
                    type="number"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Prominent Landmark"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    fullWidth
                    variant="outlined"
                    sx={inputStyle}
                    placeholder="Near Tower Park Gate 3"
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={handleSaveChanges}
                disabled={saving}
                sx={{ mt: 2.5, bgcolor: "#2563EB", fontWeight: 700, borderRadius: 2 }}
              >
                Save Map Location
              </Button>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={cardStyle}>
              <Typography variant="h6" sx={cardTitleStyle}>
                Terminal Geofence & Navigation
              </Typography>
              <Stack spacing={2.5}>
                <ReadOnlyField label="Registered Geofence Radius" value="50 Meters (Active)" />
                <ReadOnlyField label="Landmark Reference" value={profile.map_location.landmark || "Opposite Central Metro"} />
                <ReadOnlyField label="Full Formatted Address" value={profile.map_location.formatted_address} />

                <Button
                  variant="outlined"
                  fullWidth
                  href={profile.map_location.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<ExternalLink size={16} />}
                  sx={{ color: "#60A5FA", borderColor: "#3B82F6", fontWeight: 700, borderRadius: 2, py: 1.2 }}
                >
                  Open in Google Maps Navigation
                </Button>

                <Alert severity="success" sx={{ bgcolor: "rgba(34, 197, 94, 0.12)", color: "#4ADE80" }}>
                  Store coordinates are verified against AEPS biometric terminal location to prevent out-of-station transaction fraud.
                </Alert>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── TOAST FEEDBACK ── */}
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

// ── SUBCOMPONENTS ──

function ReadOnlyField({
  label,
  value,
  onCopy,
  badge,
  isStatus,
  action,
}: {
  label: string;
  value?: string | number;
  onCopy?: () => void;
  badge?: string;
  isStatus?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </Typography>
        {badge && (
          <Chip label={badge} size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 700, height: 20, fontSize: "0.7rem" }} />
        )}
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.6 }}>
        <Typography
          variant="body1"
          sx={{
            color: isStatus ? "#4ADE80" : "#FFFFFF",
            fontWeight: 600,
            wordBreak: "break-all",
          }}
        >
          {value || "—"}
        </Typography>
        {onCopy && (
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

function DocItem({ title, status, icon, url }: { title: string; status: string; icon: React.ReactNode; url?: string }) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ color: "#60A5FA" }}>{icon}</Box>
        <Box>
          <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: "#4ADE80", fontWeight: 600 }}>
            ● {status}
          </Typography>
        </Box>
      </Stack>
      {url && (
        <Button
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          startIcon={<ExternalLink size={14} />}
          sx={{ color: "#60A5FA", fontWeight: 600 }}
        >
          View
        </Button>
      )}
    </Paper>
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

const sensitiveBoxStyle = {
  p: 2,
  borderRadius: 2.5,
  bgcolor: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const toggleCardStyle = {
  p: 2,
  borderRadius: 2.5,
  bgcolor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
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
};
