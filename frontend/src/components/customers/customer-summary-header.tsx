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
  const customerCode = customer?.customerCode || customer?.publicId || customer?.public_id || customer?.id || "N/A";
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
        p: 2.25,
        mb: 2.5,
        borderRadius: "14px",
        bgcolor: darkTheme ? "rgba(37, 99, 235, 0.12)" : "#F0F9FF",
        border: darkTheme
          ? "1px solid rgba(96, 165, 250, 0.3)"
          : "1px solid #BAE6FD",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
        boxShadow: darkTheme
          ? "0 4px 20px rgba(37, 99, 235, 0.15)"
          : "0 2px 10px rgba(2, 132, 199, 0.08)",
      }}
    >
      {/* LEFT: AVATAR & CUSTOMER DETAILS */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Avatar
          src={photoUrl}
          alt={name}
          sx={{
            width: 52,
            height: 52,
            bgcolor: "#2563EB",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "18px",
            border: darkTheme
              ? "2px solid rgba(255, 255, 255, 0.25)"
              : "2px solid #0284C7",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {initials}
        </Avatar>

        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
            <Typography
              sx={{
                fontWeight: 900,
                color: darkTheme ? "#FFFFFF" : "#0F172A",
                fontSize: "17px",
                letterSpacing: "-0.2px",
              }}
            >
              👤 {name}
            </Typography>
            <Chip
              icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />}
              label={`KYC: ${kycStatus}`}
              size="small"
              sx={{
                height: 22,
                bgcolor: "rgba(34, 197, 94, 0.2)",
                color: "#4ADE80",
                fontWeight: 800,
                fontSize: "10px",
                border: "1px solid rgba(34, 197, 94, 0.4)",
              }}
            />
            <Chip
              icon={<CheckCircleIcon sx={{ "&&": { color: "#38BDF8", fontSize: 13 } }} />}
              label="VERIFIED"
              size="small"
              sx={{
                height: 22,
                bgcolor: "rgba(56, 189, 248, 0.2)",
                color: "#38BDF8",
                fontWeight: 800,
                fontSize: "10px",
                border: "1px solid rgba(56, 189, 248, 0.4)",
              }}
            />
          </Stack>

          <Typography
            sx={{
              color: darkTheme ? "rgba(255, 255, 255, 0.80)" : "#475569",
              fontSize: "13px",
              mt: 0.5,
              fontWeight: 600,
            }}
          >
            📱 <strong>+91 {mobile}</strong> · Customer ID:{" "}
            <span style={{ color: darkTheme ? "#60A5FA" : "#0284C7", fontWeight: 800 }}>
              {customerCode}
            </span>
          </Typography>
        </Box>
      </Stack>

      {/* RIGHT: QUICK ACTIONS */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignSelf: { xs: "stretch", sm: "center" },
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          flexWrap: "wrap",
        }}
      >
        {onEditCustomer && (
          <Tooltip title="Edit Customer Details" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={onEditCustomer}
              sx={{
                height: 32,
                px: 1.5,
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                color: darkTheme ? "#93C5FD" : "#0369A1",
                borderColor: darkTheme ? "rgba(147, 197, 253, 0.4)" : "#BAE6FD",
                bgcolor: darkTheme ? "rgba(37, 99, 235, 0.15)" : "#E0F2FE",
                "&:hover": {
                  bgcolor: darkTheme ? "rgba(37, 99, 235, 0.3)" : "#BAE6FD",
                  borderColor: "#93C5FD",
                },
              }}
            >
              ✏ Edit Customer
            </Button>
          </Tooltip>
        )}

        {onViewCustomerProfile && (
          <Tooltip title="View Complete 360° Profile" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonIcon sx={{ fontSize: 14 }} />}
              onClick={onViewCustomerProfile}
              sx={{
                height: 32,
                px: 1.5,
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                color: darkTheme ? "#93C5FD" : "#0369A1",
                borderColor: darkTheme ? "rgba(147, 197, 253, 0.4)" : "#BAE6FD",
                bgcolor: darkTheme ? "rgba(37, 99, 235, 0.15)" : "#E0F2FE",
                "&:hover": {
                  bgcolor: darkTheme ? "rgba(37, 99, 235, 0.3)" : "#BAE6FD",
                  borderColor: "#93C5FD",
                },
              }}
            >
              👤 View Profile
            </Button>
          </Tooltip>
        )}

        {onChangeCustomer && (
          <Tooltip title="Change Selected Customer" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
              onClick={onChangeCustomer}
              sx={{
                height: 32,
                px: 1.5,
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                color: darkTheme ? "#FCA5A5" : "#B91C1C",
                borderColor: darkTheme ? "rgba(252, 165, 165, 0.4)" : "#FECACA",
                bgcolor: darkTheme ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
                "&:hover": {
                  bgcolor: darkTheme ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2",
                  borderColor: "#FCA5A5",
                },
              }}
            >
              🔄 Change Customer
            </Button>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
};
