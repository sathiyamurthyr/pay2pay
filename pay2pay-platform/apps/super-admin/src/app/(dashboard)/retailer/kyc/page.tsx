"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Alert, Grid } from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { M3Stepper, M3Button } from "@/components/ui/m3-components";
import { M3TextField, M3FileUpload } from "@/components/ui/form-components";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function KycPage() {
  const { outlet } = useRetailerStore();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    "Personal & Shop Details",
    "Aadhaar OTP Verification",
    "PAN Card Verification",
    "Bank Account & Document Upload",
  ];

  const [aadhaar, setAadhaar] = useState("998877664412");
  const [otp, setOtp] = useState("123456");
  const [pan, setPan] = useState("ABCDE1234F");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [passbookFile, setPassbookFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [kycComplete, setKycComplete] = useState(false);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setKycComplete(true);
      }, 1500);
    }
  };

  return (
    <Box sx={{ spaceY: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
        <VerifiedUserIcon sx={{ color: "#16A34A", fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
            Retailer KYC Compliance & Document Verification
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B7280" }}>
            RBI & NPCI mandated e-KYC onboarding with instant document OCR verification.
          </Typography>
        </Box>
      </Stack>

      <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <M3Stepper steps={steps} activeStep={activeStep} />

        {kycComplete ? (
          <Alert severity="success" icon={<VerifiedUserIcon sx={{ fontSize: 32 }} />} sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              KYC Verification Approved & Live!
            </Typography>
            <Typography variant="body2">
              Your merchant account <strong>{outlet.code}</strong> is fully verified for unlimited DMT & AEPS transactions.
            </Typography>
          </Alert>
        ) : (
          <Box sx={{ maxWidth: 600, mx: "auto", mt: 2 }}>
            {activeStep === 0 && (
              <Stack spacing={2.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Step 1: Merchant & Outlet Details</Typography>
                <M3TextField label="Full Legal Name (as per PAN)" defaultValue="Sathiya Murthy" />
                <M3TextField label="Outlet / Firm Name" defaultValue="Sri Venkateswara Telecom & FinTech" />
                <M3TextField label="Full Address" defaultValue="Anna Salai, Chennai, Tamil Nadu - 600002" />
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack spacing={2.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Step 2: Aadhaar e-KYC OTP Verification</Typography>
                <M3TextField label="12-Digit Aadhaar Number" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
                <M3TextField label="Enter 6-Digit OTP sent to UIDAI Linked Mobile" value={otp} onChange={(e) => setOtp(e.target.value)} />
              </Stack>
            )}

            {activeStep === 2 && (
              <Stack spacing={2.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Step 3: PAN Card OCR & NSDL Verification</Typography>
                <M3TextField label="10-Digit PAN Number" value={pan} onChange={(e) => setPan(e.target.value)} />
                <M3FileUpload
                  label="Upload Front Photo of PAN Card"
                  fileName={panFile?.name}
                  onFileSelect={(f) => setPanFile(f)}
                />
              </Stack>
            )}

            {activeStep === 3 && (
              <Stack spacing={2.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Step 4: Bank Account & Passbook Upload</Typography>
                <M3TextField label="Settlement Bank Account Number" defaultValue="001105991823" />
                <M3TextField label="IFSC Code" defaultValue="ICIC0000011" />
                <M3FileUpload
                  label="Upload Cancelled Cheque or Bank Passbook Copy"
                  fileName={passbookFile?.name}
                  onFileSelect={(f) => setPassbookFile(f)}
                />
              </Stack>
            )}

            <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", mt: 4 }}>
              <M3Button variant="outlined" disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}>
                Back
              </M3Button>
              <M3Button variant="contained" loading={loading} onClick={handleNext}>
                {activeStep === steps.length - 1 ? "Submit Full KYC for Instant Verification" : "Continue to Next Step"}
              </M3Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
