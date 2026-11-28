import React from "react";
import {
  Paper,
  Stack,
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  Tooltip,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { formatShortCustomerId } from "@/lib/utils";

export interface CustomerSummaryHeaderProps {
  customer: {
    name?: string;
    fullName?: string;
    full_name?: string;
    mobile?: string;
    mobile_number?: string;
    customerCode?: string;
    publicId?: string;
    public_id?: string;
    id?: string;
    kycStatus?: string;
    kyc_status?: string;
    photoUrl?: string;
    photo_url?: string;
    isVerified?: boolean;
  } | null;
  onEditCustomer?: () => void;
  onViewCustomerProfile?: () => void;
  onChangeCustomer?: () => void;
  darkTheme?: boolean;
}

export const CustomerSummaryHeader: React.FC<CustomerSummaryHeaderProps> = ({
  customer: propsCustomer,
  onEditCustomer,
  onViewCustomerProfile,
  onChangeCustomer,
  darkTheme = false,
}) => {
  const storeCustomer = useTransactionMemoryStore((state) => state.selectedCustomer);
  const customer = propsCustomer || storeCustomer;

  const name = customer?.name || customer?.fullName || customer?.full_name || "Active Customer";
  const mobile = customer?.mobile || customer?.mobile_number || "N/A";
  const rawCode = customer?.customerCode || customer?.publicId || customer?.public_id || customer?.id;
  const customerCode = formatShortCustomerId(rawCode);
  const kycStatus = customer?.kycStatus || customer?.kyc_status || "VERIFIED";
  const photoUrl = customer?.photoUrl || customer?.photo_url;
  const initials = name
    .split(" ")
    .map((n: string) => n.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase() || "CU";

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.25, sm: 1.5, md: 1.25 },
        px: { xs: 1.5, md: 2 },
        mb: 2,
        borderRadius: "16px",
        bgcolor: darkTheme ? "rgba(11, 15, 25, 0.88)" : "var(--brand-surface, #EFF6FF)",
        border: darkTheme
          ? "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))"
          : "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 1.25, md: 1.5 },
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        boxShadow: darkTheme
          ? "0 8px 30px rgba(0, 0, 0, 0.45)"
          : "0 2px 10px rgba(15, 23, 42, 0.05)",
      }}
    >
      {/* ── DESKTOP SINGLE-LINE VIEW (md and up) ── */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          gap: 1.25,
          minWidth: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Avatar
          src={photoUrl}
          alt={name}
          sx={{
            width: 38,
            height: 38,
            background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "14px",
            border: "2px solid #FFFFFF",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
            flexWrap: "nowrap",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "15px",
              letterSpacing: "-0.2px",
              lineHeight: 1,
              color: darkTheme ? "#FFFFFF" : "var(--text-primary, #0F172A)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {name}
          </Typography>

          <Chip
            icon={<ShieldIcon sx={{ "&&": { color: "#16A34A", fontSize: 11 } }} />}
            label={`KYC: ${kycStatus}`}
            size="small"
            sx={{
              height: 20,
              bgcolor: "#DCFCE7",
              color: "#166534",
              fontWeight: 800,
              fontSize: "9.5px",
              border: "1px solid #86EFAC",
              flexShrink: 0,
            }}
          />

          <Chip
            icon={<CheckCircleIcon sx={{ "&&": { color: "var(--brand-primary, #0F3B7D)", fontSize: 11 } }} />}
            label="VERIFIED"
            size="small"
            sx={{
              height: 20,
              bgcolor: "#FFFFFF",
              color: "var(--brand-primary, #0F3B7D)",
              fontWeight: 800,
              fontSize: "9.5px",
              border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
              flexShrink: 0,
            }}
          />

          <Typography sx={{ color: darkTheme ? "rgba(255, 255, 255, 0.35)" : "#94A3B8", fontWeight: 800, mx: 0.25, userSelect: "none" }}>
            ·
          </Typography>

          <Typography
            sx={{
              color: darkTheme ? "rgba(255, 255, 255, 0.90)" : "var(--text-secondary, #334155)",
              fontSize: "12.5px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            +91 {mobile}
          </Typography>

          <Typography sx={{ color: darkTheme ? "rgba(255, 255, 255, 0.35)" : "#94A3B8", fontWeight: 800, mx: 0.25, userSelect: "none" }}>
            ·
          </Typography>

          <Typography
            sx={{
              color: darkTheme ? "rgba(255, 255, 255, 0.70)" : "var(--text-muted, #64748B)",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            Customer ID:{" "}
            <span style={{ color: darkTheme ? "#FDE68A" : "var(--brand-primary, #0F3B7D)", fontFamily: "monospace", fontWeight: 800 }}>
              {customerCode}
            </span>
          </Typography>
        </Box>
      </Box>

      {/* ── MOBILE VIEW (xs to md) ── */}
      <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 0.75, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
          <Avatar
            src={photoUrl}
            alt={name}
            sx={{
              width: 38,
              height: 38,
              background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "14px",
              border: "2px solid #FFFFFF",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "14.5px",
                  letterSpacing: "-0.2px",
                  color: darkTheme ? "#FFFFFF" : "var(--text-primary, #0F172A)",
                }}
              >
                {name}
              </Typography>
              <Chip
                icon={<ShieldIcon sx={{ "&&": { color: "#16A34A", fontSize: 10 } }} />}
                label={`KYC: ${kycStatus}`}
                size="small"
                sx={{
                  height: 18,
                  bgcolor: "#DCFCE7",
                  color: "#166534",
                  fontWeight: 800,
                  fontSize: "8.5px",
                  border: "1px solid #86EFAC",
                }}
              />
              <Chip
                icon={<CheckCircleIcon sx={{ "&&": { color: "var(--brand-primary, #0F3B7D)", fontSize: 10 } }} />}
                label="VERIFIED"
                size="small"
                sx={{
                  height: 18,
                  bgcolor: "#FFFFFF",
                  color: "var(--brand-primary, #0F3B7D)",
                  fontWeight: 800,
                  fontSize: "8.5px",
                  border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
                }}
              />
            </Box>
            <Typography
              sx={{
                color: darkTheme ? "rgba(255, 255, 255, 0.80)" : "var(--text-muted, #64748B)",
                fontSize: "11px",
                mt: 0.25,
                fontWeight: 600,
              }}
            >
              <strong>+91 {mobile}</strong> · ID:{" "}
              <span style={{ color: darkTheme ? "#FDE68A" : "var(--brand-primary, #0F3B7D)", fontFamily: "monospace", fontWeight: 800 }}>
                {customerCode}
              </span>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── RIGHT: QUICK ACTIONS (Single row on desktop, 50/50 full width on mobile) ── */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          width: { xs: "100%", md: "auto" },
          justifyContent: { xs: "space-between", md: "flex-end" },
          alignItems: "center",
          flexWrap: "nowrap",
          flexShrink: 0,
          gap: 1,
          "& > *": {
            flex: { xs: 1, md: "none" },
          },
        }}
      >
        {onEditCustomer && (
          <Tooltip title="Edit Customer Details" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 13 }} />}
              onClick={onEditCustomer}
              sx={{
                height: 30,
                px: 1.25,
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                color: "var(--brand-primary, #0F3B7D)",
                borderColor: "var(--brand-border, rgba(15, 59, 125, 0.25))",
                bgcolor: "#FFFFFF",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "var(--brand-primary, #0F3B7D)",
                  color: "#FFFFFF",
                  borderColor: "var(--brand-primary, #0F3B7D)",
                },
              }}
            >
              Edit Customer
            </Button>
          </Tooltip>
        )}

        {onViewCustomerProfile && (
          <Tooltip title="View Complete 360° Profile" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonIcon sx={{ fontSize: 13 }} />}
              onClick={onViewCustomerProfile}
              sx={{
                height: 30,
                px: 1.25,
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                color: "var(--brand-primary, #0F3B7D)",
                borderColor: "var(--brand-border, rgba(15, 59, 125, 0.25))",
                bgcolor: "#FFFFFF",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "var(--brand-primary, #0F3B7D)",
                  color: "#FFFFFF",
                  borderColor: "var(--brand-primary, #0F3B7D)",
                },
              }}
            >
              View Profile
            </Button>
          </Tooltip>
        )}

        {onChangeCustomer && (
          <Tooltip title="Change Selected Customer" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SwapHorizIcon sx={{ fontSize: 13 }} />}
              onClick={onChangeCustomer}
              sx={{
                height: 30,
                px: 1.25,
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                color: "#B91C1C",
                borderColor: "#FECACA",
                bgcolor: "#FEF2F2",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#FEE2E2",
                  borderColor: "#FCA5A5",
                },
              }}
            >
              Change Customer
            </Button>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
};

export default CustomerSummaryHeader;
