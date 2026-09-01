"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from "@mui/material";

// Icons
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PrintIcon from "@mui/icons-material/Print";
import ShareIcon from "@mui/icons-material/Share";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HubIcon from "@mui/icons-material/Hub";
import ShieldIcon from "@mui/icons-material/Shield";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CommentIcon from "@mui/icons-material/Comment";
import RefreshIcon from "@mui/icons-material/Refresh";

import { getApiBaseUrl } from "@/lib/api-config";
import { CompanyHeader } from "@/components/common/CompanyHeader";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export interface DynamicTransactionDetailsPayload {
  company?: {
    name?: string;
    logo?: string;
    company_name?: string;
    logo_url?: string;
    legal_name?: string;
    company_code?: string;
  };
  transaction: {
    txn_id: string;
    reference_id?: string;
    amount?: number;
    mode?: string;
    service: string;
    wallet: string;
    entry: string;
    status: string;
    date_time: string;
    initiated_at?: string;
    completed_at?: string;
    created_at?: string;
  };
  customer?: {
    name: string;
    mobile: string;
  };
  beneficiary?: {
    name: string;
    account: string;
    bank: string;
    ifsc: string;
  };
  financial?: {
    amount?: number;
    charge?: number;
    gst?: number;
    commission?: number;
    tds?: number;
    total_debit?: number;
    total_credit?: number;
    net_amount?: number;
  };
  wallet?: {
    wallet?: string;
    opening_balance?: number;
    credit?: number;
    debit?: number;
    closing_balance?: number;
  };
  vendor?: {
    name: string;
    api_status: string;
    api_response: string;
  } | null;
  comments?: string;
  party?: {
    company?: string;
    retailer?: string;
    distributor?: string;
    sd?: string;
    rm?: string;
    customer?: string;
    customer_mobile?: string;
  };
  ledger_entries?: Array<{
    entry_type: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    narration: string;
    date_time?: string;
    created_at?: string;
  }>;
  service?: {
    code: string;
    name: string;
  };
  service_details?: Record<string, any>;
  processing?: {
    status?: string;
    api_status?: string;
    api_response_code?: string;
    channel?: string;
    gateway?: string;
    utr?: string;
    rrn?: string;
  };
  audit?: {
    created_date?: string;
    updated_date?: string;
  };
}

interface DynamicTransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  txnId: string | null;
  initialData?: any;
  onToast?: (msg: string) => void;
}

const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PAYOUT: { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  DMT: { bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", border: "rgba(16, 185, 129, 0.3)" },
  AEPS: { bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.3)" },
  BBPS: { bg: "rgba(236, 72, 153, 0.15)", text: "#F472B6", border: "rgba(236, 72, 153, 0.3)" },
  RECHARGE: { bg: "rgba(6, 182, 212, 0.15)", text: "#22D3EE", border: "rgba(6, 182, 212, 0.3)" },
  SETTLEMENT: { bg: "rgba(99, 102, 241, 0.15)", text: "#818CF8", border: "rgba(99, 102, 241, 0.3)" },
  POS: { bg: "rgba(249, 115, 22, 0.15)", text: "#FB923C", border: "rgba(249, 115, 22, 0.3)" },
};

export const DynamicTransactionDetailsModal: React.FC<DynamicTransactionDetailsModalProps> = ({
  open,
  onClose,
  txnId,
  initialData,
  onToast,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<DynamicTransactionDetailsPayload | null>(null);

  const showToast = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  const handleClose = useCallback(() => {
    setLoading(false);
    setError(null);
    setDetails(null);
    onClose();
  }, [onClose]);

  // Fetch full dynamic details from GET /api/v1/payout/transactions/{transaction_number} (or /transactions/{txnId})
  const fetchDetails = useCallback(async () => {
    if (!txnId) return;

    setLoading(true);
    setError(null);
    setDetails(null);

    try {
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== "undefined" ? (
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("access_token") ||
        ""
      ) : "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token && token.trim().length > 10) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      // Try payout-specific endpoint first
      let res = await fetch(`${baseUrl}/payout/transactions/${encodeURIComponent(txnId)}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      // Fallback to universal transactions endpoint if 404
      if (!res.ok && res.status === 404) {
        res = await fetch(`${baseUrl}/transactions/${encodeURIComponent(txnId)}`, {
          headers,
          credentials: "include",
          cache: "no-store",
        });
      }

      if (!res.ok) {
        throw new Error("Unable to load transaction details.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setDetails(json.data);
      } else {
        throw new Error(json.message || "Unable to load transaction details.");
      }
    } catch (err: any) {
      console.warn("Error loading transaction details:", err);
      setError("Unable to load transaction details.");
    } finally {
      setLoading(false);
    }
  }, [txnId]);

  useEffect(() => {
    if (open && txnId) {
      fetchDetails();
    } else {
      setDetails(null);
      setError(null);
      setLoading(false);
    }
  }, [open, txnId, fetchDetails]);

  const branding = useCompanyBranding();

  if (!open) return null;

  const txn = details?.transaction;
  const party = details?.party;
  const financial = details?.financial;
  const wallet = details?.wallet;
  const customer = details?.customer;
  const beneficiary = details?.beneficiary;
  const vendor = details?.vendor;
  const comments = details?.comments;
  const ledgerEntries = details?.ledger_entries || [];
  const processing = details?.processing;
  const audit = details?.audit;

  const companyLogo = details?.company?.logo || details?.company?.logo_url || branding.logo_url || "/branding/logo.png";
  const companyName = details?.company?.name || details?.company?.company_name || branding.company_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
  const companyLegalName = details?.company?.legal_name || branding.legal_name || "SUPER REX PRODUCTS PRIVATE LIMITED";

  const serviceRaw = (txn?.service || "PAYOUT").toUpperCase();
  const serviceStyle = SERVICE_COLORS[serviceRaw] || {
    bg: "rgba(59, 130, 246, 0.15)",
    text: "#60A5FA",
    border: "rgba(59, 130, 246, 0.3)",
  };

  const statusRaw = (txn?.status || "SUCCESS").toUpperCase();
  const isSuccess = statusRaw === "SUCCESS" || statusRaw === "COMPLETED" || statusRaw === "SETTLED";
  const isPending = statusRaw === "PENDING" || statusRaw === "PROCESSING" || statusRaw === "INITIATED";
  const isReversed = statusRaw === "REVERSED";

  const headerTitle = "Payout Transaction Details";

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (!details) return;
    const shareText = `Pay2Pay Transaction Details\nTxn ID: ${txn?.txn_id}\nService: ${txn?.service}\nStatus: ${txn?.status}\nPayout Amount: ₹${(financial?.amount ?? txn?.amount ?? 0).toFixed(2)}\nTotal Debit: ₹${(financial?.total_debit ?? 0).toFixed(2)}\nBeneficiary: ${beneficiary?.name || "N/A"} (${beneficiary?.account || "N/A"})\nDate: ${txn?.date_time}`;
    copyToClipboard(shareText, "Transaction summary");
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#0B132B",
          backgroundImage: "linear-gradient(to bottom, #0F172A, #0B132B)",
          color: "#FFFFFF",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "24px",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
          p: 0,
        },
      }}
    >
      {/* ── DYNAMIC MULTI-TENANT COMPANY HEADER ──────────────────────────── */}
      <Box sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <CompanyHeader
          logoUrl={companyLogo}
          companyName={companyName}
          legalName={companyLegalName}
          title={headerTitle}
          subtitle={`Txn ID: ${txn?.txn_id || txnId || "N/A"}`}
          variant="modal"
          extraActions={
            <IconButton onClick={handleClose} sx={{ color: "#94A3B8", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.05)" } }}>
              <CloseIcon />
            </IconButton>
          }
        />
      </Box>

      {/* ── DIALOG CONTENT ────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 3, overflowY: "auto", maxHeight: "calc(85vh - 140px)" }}>
        {loading ? (
          <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <CircularProgress size={44} sx={{ color: "#3B82F6" }} />
            <Typography variant="body2" sx={{ color: "#94A3B8", fontWeight: 600 }}>
              Loading transaction details...
            </Typography>
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, borderRadius: "16px", bgcolor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", textAlign: "center" }}>
            <Typography variant="subtitle1" sx={{ color: "#F87171", fontWeight: 800, mb: 1 }}>
              Unable to load transaction details.
            </Typography>
            <Typography variant="body2" sx={{ color: "#CBD5E1", mb: 2.5 }}>
              Could not retrieve live details from the payment ledger.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchDetails}
              sx={{
                borderColor: "#3B82F6",
                color: "#60A5FA",
                fontWeight: 700,
                borderRadius: "10px",
                "&:hover": { borderColor: "#60A5FA", bgcolor: "rgba(59, 130, 246, 0.1)" },
              }}
            >
              Retry
            </Button>
          </Paper>
        ) : details && txn ? (
          <Stack spacing={3}>
            {/* ── HERO BANNER: AMOUNT & STATUS ─────────────────────────────── */}
            <Paper
              sx={{
                p: 3,
                borderRadius: "20px",
                bgcolor: isSuccess
                  ? "rgba(16, 185, 129, 0.08)"
                  : isPending
                  ? "rgba(245, 158, 11, 0.08)"
                  : isReversed
                  ? "rgba(139, 92, 246, 0.08)"
                  : "rgba(239, 68, 68, 0.08)",
                border: `1px solid ${
                  isSuccess
                    ? "rgba(16, 185, 129, 0.25)"
                    : isPending
                    ? "rgba(245, 158, 11, 0.25)"
                    : isReversed
                    ? "rgba(139, 92, 246, 0.25)"
                    : "rgba(239, 68, 68, 0.25)"
                }`,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip
                    label={txn.service}
                    size="small"
                    sx={{
                      bgcolor: serviceStyle.bg,
                      color: serviceStyle.text,
                      border: `1px solid ${serviceStyle.border}`,
                      fontWeight: 800,
                      fontSize: "11px",
                    }}
                  />
                  <Chip
                    label={txn.mode || "IMPS"}
                    size="small"
                    sx={{
                      bgcolor: "rgba(99, 102, 241, 0.15)",
                      color: "#818CF8",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      fontWeight: 800,
                      fontSize: "11px",
                    }}
                  />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 900, color: "#FFFFFF", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                  ₹{Number(txn.amount ?? financial?.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                  Wallet: <span style={{ color: "#60A5FA", fontWeight: 800 }}>{txn.wallet}</span> • {txn.initiated_at || txn.date_time}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  icon={isSuccess ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : isPending ? <AccessTimeIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}
                  label={txn.status}
                  sx={{
                    bgcolor: isSuccess ? "#10B981" : isPending ? "#F59E0B" : isReversed ? "#8B5CF6" : "#EF4444",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: "13px",
                    px: 1,
                    py: 2.2,
                    borderRadius: "12px",
                  }}
                />
              </Stack>
            </Paper>

            {/* ── SECTION A: TRANSACTION IDENTIFICATION ────────────────────── */}
            <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <ShieldIcon sx={{ fontSize: 18 }} />
                A. Transaction Identification
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Txn ID
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>
                      {txn.txn_id}
                    </Typography>
                    <Tooltip title="Copy Txn ID" arrow>
                      <IconButton size="small" onClick={() => copyToClipboard(txn.txn_id, "Txn ID")} sx={{ color: "#94A3B8", p: 0.5 }}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Ref ID / Client Ref
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>
                      {txn.reference_id || txn.txn_id}
                    </Typography>
                    <Tooltip title="Copy Ref ID" arrow>
                      <IconButton size="small" onClick={() => copyToClipboard(txn.reference_id || txn.txn_id, "Ref ID")} sx={{ color: "#94A3B8", p: 0.5 }}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Service
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {txn.service}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Transfer Mode
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#38BDF8" }}>
                    {txn.mode || "IMPS"}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Wallet Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#60A5FA" }}>
                    {txn.wallet}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Status
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: isSuccess ? "#34D399" : isPending ? "#FBBF24" : "#F87171" }}>
                    {txn.status}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Initiated At
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#E2E8F0" }}>
                    {txn.initiated_at || txn.date_time}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Completed At
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#E2E8F0" }}>
                    {txn.completed_at || audit?.updated_date || txn.initiated_at || txn.date_time}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* ── SECTION B: PARTY / CUSTOMER HIERARCHY ───────────────────── */}
            <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <AccountTreeIcon sx={{ fontSize: 18 }} />
                B. Party &amp; Customer Hierarchy
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Company</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>{companyName}</Typography>
                </Grid>
                {party?.retailer && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Retailer</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#38BDF8" }}>{party.retailer}</Typography>
                  </Grid>
                )}
                {party?.distributor && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Distributor</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{party.distributor}</Typography>
                  </Grid>
                )}
                {party?.sd && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Super Distributor</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{party.sd}</Typography>
                  </Grid>
                )}
                {party?.rm && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Regional Manager</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{party.rm}</Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Customer Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {customer?.name || party?.customer || "Not Available"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Customer Mobile</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#FFFFFF" }}>
                    {customer?.mobile || party?.customer_mobile || "Not Available"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* ── SECTION C: BENEFICIARY DETAILS ──────────────────────────── */}
            <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <AccountBalanceIcon sx={{ fontSize: 18 }} />
                C. Beneficiary Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Beneficiary Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {beneficiary?.name || "Not Available"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Account Number</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#FFFFFF" }}>
                      {beneficiary?.account || "Not Available"}
                    </Typography>
                    {beneficiary?.account && beneficiary.account !== "Not Available" && (
                      <Tooltip title="Copy Account Number" arrow>
                        <IconButton size="small" onClick={() => copyToClipboard(beneficiary.account, "Account Number")} sx={{ color: "#94A3B8", p: 0.5 }}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Bank Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {beneficiary?.bank || "Not Available"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>IFSC Code</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#38BDF8" }}>
                      {beneficiary?.ifsc || "Not Available"}
                    </Typography>
                    {beneficiary?.ifsc && beneficiary.ifsc !== "Not Available" && (
                      <Tooltip title="Copy IFSC" arrow>
                        <IconButton size="small" onClick={() => copyToClipboard(beneficiary.ifsc, "IFSC")} sx={{ color: "#94A3B8", p: 0.5 }}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* ── SECTION D & E: FINANCIAL & WALLET MOVEMENT ───────────────── */}
            <Grid container spacing={2}>
              {/* Financial Movement */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, height: "100%", borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2 }}>
                    D. Financial Summary
                  </Typography>
                  <Stack spacing={1.2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: "#94A3B8" }}>Payout Amount</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                        ₹{Number(financial?.amount ?? txn.amount ?? 0).toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: "#94A3B8" }}>Service / Transfer Charge</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: (financial?.charge ?? 0) > 0 ? "#F87171" : "#94A3B8" }}>
                        +₹{Number(financial?.charge ?? 0).toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: "#94A3B8" }}>GST</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: (financial?.gst ?? 0) > 0 ? "#F87171" : "#94A3B8" }}>
                        +₹{Number(financial?.gst ?? 0).toFixed(2)}
                      </Typography>
                    </Stack>
                    {(financial?.commission ?? 0) > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#34D399" }}>Commission Earned</Typography>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#34D399" }}>
                          +₹{Number(financial?.commission ?? 0).toFixed(2)}
                        </Typography>
                      </Stack>
                    )}
                    {(financial?.tds ?? 0) > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#94A3B8" }}>TDS Deduction</Typography>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#F87171" }}>
                          -₹{Number(financial?.tds ?? 0).toFixed(2)}
                        </Typography>
                      </Stack>
                    )}
                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>Total Wallet Debit</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, color: "#60A5FA", fontSize: "15px" }}>
                        ₹{Number(financial?.total_debit ?? ((financial?.amount ?? 0) + (financial?.charge ?? 0) + (financial?.gst ?? 0))).toFixed(2)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>

              {/* Wallet Movement */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, height: "100%", borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2 }}>
                    E. Wallet Balance Movement
                  </Typography>
                  <Stack spacing={1.2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: "#94A3B8" }}>Opening Balance</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                        ₹{Number(wallet?.opening_balance ?? 0).toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: "#F87171" }}>Debit Outflow (-)</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#F87171" }}>
                        -₹{Number(wallet?.debit ?? financial?.total_debit ?? 0).toFixed(2)}
                      </Typography>
                    </Stack>
                    {(wallet?.credit ?? 0) > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ color: "#34D399" }}>Credit / Reversal (+)</Typography>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#34D399" }}>
                          +₹{Number(wallet?.credit ?? 0).toFixed(2)}
                        </Typography>
                      </Stack>
                    )}
                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>Closing Balance</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, color: "#38BDF8", fontSize: "15px" }}>
                        ₹{Number(wallet?.closing_balance ?? 0).toFixed(2)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* ── SECTION F: FINANCIAL LEDGER ENTRIES ─────────────────────── */}
            {ledgerEntries.length > 0 && (
              <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2 }}>
                  F. Financial Ledger Entries ({ledgerEntries.length} entries)
                </Typography>
                <TableContainer sx={{ borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "rgba(0, 0, 0, 0.4)" }}>
                      <TableRow>
                        <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>ENTRY</TableCell>
                        <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>DESCRIPTION</TableCell>
                        <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>AMOUNT</TableCell>
                        <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>BEFORE</TableCell>
                        <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>AFTER</TableCell>
                        <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px" }}>DATE &amp; TIME</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ledgerEntries.map((le, idx) => (
                        <TableRow key={idx} sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.02)" } }}>
                          <TableCell>
                            <Chip
                              label={le.entry_type}
                              size="small"
                              sx={{
                                bgcolor: le.entry_type === "CREDIT" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                color: le.entry_type === "CREDIT" ? "#34D399" : "#F87171",
                                fontWeight: 800,
                                fontSize: "10px",
                                height: "20px",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: "#FFFFFF", fontWeight: 600, fontSize: "12px" }}>
                            {le.narration}
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 800, color: le.entry_type === "CREDIT" ? "#34D399" : "#F87171" }}>
                            {le.entry_type === "CREDIT" ? "+" : "-"}₹{Number(le.amount).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "12px" }}>
                            ₹{Number(le.balance_before).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: "monospace", color: "#60A5FA", fontWeight: 700, fontSize: "12px" }}>
                            ₹{Number(le.balance_after).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ color: "#64748B", fontSize: "11px" }}>
                            {le.date_time || le.created_at || "--"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* ── SECTION G: VENDOR / API DETAILS (ADMIN & CRM ONLY) ──────── */}
            {vendor && (
              <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <HubIcon sx={{ fontSize: 18 }} />
                  G. Vendor / Switch Information (Authorized Role Only)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Vendor Name</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>{vendor.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>API Status</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: vendor.api_status === "SUCCESS" ? "#34D399" : "#F87171" }}>
                      {vendor.api_status}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>API Response / Status Message</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#CBD5E1", fontSize: "13px", mt: 0.5, bgcolor: "rgba(0, 0, 0, 0.3)", p: 1.5, borderRadius: "8px" }}>
                      {vendor.api_response}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* ── SECTION H: COMMENTS / REMARKS ───────────────────────────── */}
            {comments && (
              <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                  <CommentIcon sx={{ fontSize: 18 }} />
                  H. Transaction Comments
                </Typography>
                <Typography variant="body2" sx={{ color: isSuccess ? "#34D399" : isPending ? "#FBBF24" : "#F87171", fontWeight: 600 }}>
                  {comments}
                </Typography>
              </Paper>
            )}

            {/* ── SECTION I: PROCESSING & AUDIT TRACE ──────────────────────── */}
            <Paper sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 2 }}>
                I. Processing &amp; Audit Trace
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Gateway / Switch</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{processing?.gateway || "PAY2PAY SWITCH"}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Channel</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{processing?.channel || txn.mode || "IMPS"}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Response Code</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: isSuccess ? "#34D399" : "#F87171" }}>
                    {processing?.api_response_code || (isSuccess ? "00" : "99")}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Created Timestamp</Typography>
                  <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "12px" }}>{audit?.created_date || txn.initiated_at || txn.date_time}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        ) : null}
      </DialogContent>

      {/* ── DIALOG ACTIONS ────────────────────────────────────────────────── */}
      <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(255, 255, 255, 0.08)", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              fontWeight: 700,
              borderRadius: "12px",
              px: 2.5,
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            Print Slip
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={handleShare}
            sx={{
              borderColor: "rgba(255, 255, 255, 0.15)",
              color: "#94A3B8",
              fontWeight: 700,
              borderRadius: "12px",
              px: 2.5,
              "&:hover": { borderColor: "#3B82F6", color: "#FFFFFF" },
            }}
          >
            Share
          </Button>
        </Stack>

        <Button
          variant="text"
          onClick={handleClose}
          sx={{
            color: "#94A3B8",
            fontWeight: 700,
            "&:hover": { color: "#FFFFFF" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DynamicTransactionDetailsModal;
