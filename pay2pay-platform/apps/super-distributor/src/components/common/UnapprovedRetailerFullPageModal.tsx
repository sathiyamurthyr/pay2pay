"use client";

import React, { useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Container,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

export const UnapprovedRetailerFullPageModal: React.FC = () => {
  const { openContactSupportModal } = useContactSupportModal();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.replace("/retailer/dashboard");
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: "#060D19",
        backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(37, 99, 235, 0.25), rgba(255, 255, 255, 0))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      <Container maxWidth="sm" sx={{ my: "auto" }}>
        <Paper
          elevation={24}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 4,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(24px)",
            border: "1.5px solid rgba(59, 130, 246, 0.4)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 99, 235, 0.15)",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
            <Chip
              icon={<LockIcon sx={{ "&&": { fontSize: 12, color: "#60A5FA" } }} />}
              label="PAY2PAY SECURE RETAILER WORKSTATION"
              sx={{
                bgcolor: "rgba(37, 99, 235, 0.15)",
                color: "#60A5FA",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                fontWeight: 900,
                fontSize: "10px",
                py: 0.3,
                px: 1,
                letterSpacing: "0.5px",
              }}
            />
          </Box>

          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(37, 99, 235, 0.15)",
              border: "2px solid #2563EB",
              color: "#60A5FA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.25)",
            }}
          >
            <ShieldIcon sx={{ fontSize: 30 }} />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              color: "#FFFFFF",
              fontSize: { xs: "19px", sm: "23px" },
              letterSpacing: "-0.5px",
              mb: 0.5,
            }}
          >
            RETAILER WORKSTATION
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: "#60A5FA",
              fontSize: { xs: "12.5px", sm: "14px" },
              mb: 1.5,
            }}
          >
            Loading your dashboard & services...
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => window.location.replace("/retailer/dashboard")}
              endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "12.5px",
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              Enter Dashboard
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => openContactSupportModal()}
              startIcon={<ContactPhoneIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "12.5px",
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "#3B82F6",
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                },
              }}
            >
              Contact Support
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
