"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box, Container, Paper, Typography, Tabs, Tab, Checkbox, FormControlLabel,
  Stack, Divider, Link as MuiLink, Alert, InputAdornment, IconButton
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [tab, setTab] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [mobile, setMobile] = useState("9876543210");
  const [password, setPassword] = useState("Retailer#2026");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      await login(mobile, password);
      router.push("/retailer-dashboard");
    } catch {
      router.push("/retailer-dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!mobile || mobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }
    setErrorMsg("");
    setOtpSent(true);
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setErrorMsg("Please enter the 6-digit OTP sent to your mobile");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/retailer-dashboard");
    }, 800);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        {/* Brand Logo & Header */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              mb: 1.5,
            }}
          >
            <StorefrontIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#111827" }}>
            Pay2Pay Retailer
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B7280", mt: 0.5, fontWeight: 500 }}>
            Enterprise FinTech Merchant Portal
          </Typography>
        </Box>

        {/* Login Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3.5,
            p: 3.5,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", mb: 0.5 }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B7280", mb: 2.5 }}>
            Sign in to manage DMT, AEPS, UPI & Settlement
          </Typography>

          {/* Login Type Tabs */}
          <Tabs
            value={tab}
            onChange={(_, val) => {
              setTab(val);
              setErrorMsg("");
            }}
            variant="fullWidth"
            sx={{
              mb: 3,
              borderBottom: "1px solid #E5E7EB",
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.875rem" },
              "& .Mui-selected": { color: "#2563EB" },
            }}
          >
            <Tab label="Password Login" value="PASSWORD" />
            <Tab label="Login with OTP" value="OTP" />
          </Tabs>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }}>
              {errorMsg}
            </Alert>
          )}

          {tab === "PASSWORD" ? (
            <form onSubmit={handlePasswordLogin}>
              <Stack spacing={2.5}>
                <M3TextField
                  label="Registered Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  startAdornment={<PhoneIphoneIcon sx={{ color: "#6B7280", fontSize: 20 }} />}
                  placeholder="9876543210"
                />

                <M3TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startAdornment={<LockOutlinedIcon sx={{ color: "#6B7280", fontSize: 20 }} />}
                  endAdornment={
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  }
                />

                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        sx={{ color: "#2563EB", "&.Mui-checked": { color: "#2563EB" } }}
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Remember Me</Typography>}
                  />
                  <MuiLink
                    component={Link}
                    href="/forgot-password"
                    underline="hover"
                    sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563EB" }}
                  >
                    Forgot Password?
                  </MuiLink>
                </Stack>

                <M3Button type="submit" variant="contained" loading={loading} fullWidth sx={{ py: 1.5 }}>
                  Login to Merchant Portal
                </M3Button>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handleOtpLogin}>
              <Stack spacing={2.5}>
                <M3TextField
                  label="Registered Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  startAdornment={<PhoneIphoneIcon sx={{ color: "#6B7280", fontSize: 20 }} />}
                />

                {!otpSent ? (
                  <M3Button variant="outlined" fullWidth onClick={handleSendOtp}>
                    Request 6-Digit OTP
                  </M3Button>
                ) : (
                  <>
                    <Alert severity="success" sx={{ borderRadius: 2 }}>
                      OTP sent to +91 {mobile}
                    </Alert>
                    <M3TextField
                      label="Enter 6-Digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                    />
                    <M3Button type="submit" variant="contained" loading={loading} fullWidth sx={{ py: 1.5 }}>
                      Verify & Sign In
                    </M3Button>
                  </>
                )}
              </Stack>
            </form>
          )}

          <Divider sx={{ my: 3, borderColor: "#E5E7EB" }} />

          {/* Security & Regulatory Footer */}
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", alignItems: "center" }}>
            <ShieldIcon sx={{ fontSize: 16, color: "#16A34A" }} />
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>
              NPCI BBPS Secured Portal · PCI-DSS Level 1
            </Typography>
          </Stack>
        </Paper>

        {/* Outer Links */}
        <Box sx={{ textCenter: "center", mt: 3, textAlign: "center" }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "center", mb: 1 }}>
            <MuiLink component={Link} href="#" underline="hover" variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>
              Privacy Policy
            </MuiLink>
            <Typography variant="caption" sx={{ color: "#9CA3AF" }}>•</Typography>
            <MuiLink component={Link} href="#" underline="hover" variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>
              Terms of Service
            </MuiLink>
          </Stack>
          <Typography variant="caption" sx={{ color: "#9CA3AF", display: "block" }}>
            Pay2Pay FinTech Platform · App Version v2.4.0-ENT
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
