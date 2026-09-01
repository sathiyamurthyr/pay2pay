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
  darkTheme = true,
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
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        borderRadius: "16px",
        bgcolor: darkTheme ? "rgba(11, 15, 25, 0.88)" : "#F0F9FF",
        backdropFilter: "blur(20px)",
        border: darkTheme
          ? "1px solid rgba(245, 158, 11, 0.25)"
          : "1px solid #BAE6FD",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        boxShadow: darkTheme
          ? "0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.08)"
          : "0 2px 10px rgba(2, 132, 199, 0.08)",
      }}
    >
      {/* LEFT: AVATAR & CUSTOMER DETAILS */}
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.25, sm: 1.75 }, minWidth: 0, width: "100%" }}>
        <Avatar
          src={photoUrl}
          alt={name}
          sx={{
            width: { xs: 44, sm: 52 },
            height: { xs: 44, sm: 52 },
            background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
            color: "#FDE68A",
            fontWeight: 900,
            fontSize: { xs: "16px", sm: "19px" },
            border: darkTheme
              ? "2px solid #F59E0B"
              : "2px solid #0284C7",
            boxShadow: darkTheme ? "0 0 12px rgba(245, 158, 11, 0.35)" : "0 2px 8px rgba(0,0,0,0.2)",
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
                color: darkTheme ? "#FFFFFF" : "#0F172A",
                fontSize: { xs: "15px", sm: "17.5px" },
                letterSpacing: "-0.2px",
                lineHeight: 1.2,
              }}
            >
              {name}
            </Typography>
            <Chip
              icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 12 } }} />}
              label={`KYC: ${kycStatus}`}
              size="small"
              sx={{
                height: 20,
                bgcolor: "rgba(34, 197, 94, 0.15)",
                color: "#4ADE80",
                fontWeight: 800,
                fontSize: "9.5px",
                border: "1px solid rgba(74, 222, 128, 0.4)",
              }}
            />
            <Chip
              icon={<CheckCircleIcon sx={{ "&&": { color: "#38BDF8", fontSize: 12 } }} />}
              label="VERIFIED"
              size="small"
              sx={{
                height: 20,
                bgcolor: "rgba(56, 189, 248, 0.15)",
                color: "#38BDF8",
                fontWeight: 800,
                fontSize: "9.5px",
                border: "1px solid rgba(56, 189, 248, 0.4)",
              }}
            />
          </Box>

          <Typography
            sx={{
              color: darkTheme ? "rgba(255, 255, 255, 0.80)" : "#475569",
              fontSize: { xs: "11.5px", sm: "13px" },
              mt: 0.3,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            <strong>+91 {mobile}</strong> · Customer ID:{" "}
            <span style={{ color: darkTheme ? "#FDE68A" : "#0284C7", fontFamily: "monospace", fontWeight: 800 }}>
              {customerCode}
            </span>
          </Typography>
        </Box>
      </Box>

      {/* RIGHT: QUICK ACTIONS */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          width: { xs: "100%", sm: "auto" },
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          flexWrap: "wrap",
          gap: 1,
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
                color: darkTheme ? "#FDE68A" : "#0369A1",
                borderColor: darkTheme ? "rgba(245, 158, 11, 0.35)" : "#BAE6FD",
                bgcolor: darkTheme ? "rgba(245, 158, 11, 0.08)" : "#E0F2FE",
                textTransform: "none",
                "&:hover": {
                  bgcolor: darkTheme ? "rgba(245, 158, 11, 0.18)" : "#BAE6FD",
                  borderColor: "#F59E0B",
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
                color: darkTheme ? "#93C5FD" : "#0369A1",
                borderColor: darkTheme ? "rgba(147, 197, 253, 0.4)" : "#BAE6FD",
                bgcolor: darkTheme ? "rgba(37, 99, 235, 0.15)" : "#E0F2FE",
                textTransform: "none",
                "&:hover": {
                  bgcolor: darkTheme ? "rgba(37, 99, 235, 0.3)" : "#BAE6FD",
                  borderColor: "#93C5FD",
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
                color: darkTheme ? "#FCA5A5" : "#B91C1C",
                borderColor: darkTheme ? "rgba(252, 165, 165, 0.4)" : "#FECACA",
                bgcolor: darkTheme ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
                textTransform: "none",
                "&:hover": {
                  bgcolor: darkTheme ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2",
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
