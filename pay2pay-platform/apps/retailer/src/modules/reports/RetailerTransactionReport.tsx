"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Drawer,
  Divider,
  TablePagination,
  Skeleton,
  Menu,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ClearIcon from "@mui/icons-material/Clear";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { getApiBaseUrl } from "@/lib/api-config";
import { DynamicTransactionDetailsModal } from "@/components/transactions/DynamicTransactionDetailsModal";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export interface TransactionReportSummary {
  total_transactions: number;
  total_volume: number;
  total_credit: number;
  total_debit: number;
  successful_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  reversed_transactions: number;
}

export interface TransactionReportItem {
  id: string;
  txn_id: string;
  ref_id?: string;
  client_ref_id: string;
  service: string;
  raw_service?: string;
  type: string;
  pre_bal?: number;
  dr_amt?: number;
  cr_amt?: number;
  cls_bal?: number;
  txn_amt?: number;
  tax?: number;
  date_time?: string;
  comments?: string;
  cr_dr?: string;
  customer_name: string;
  customer_mobile: string;
  beneficiary_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  amount: number;
  charges: number;
  commission: number;
  gst_amount: number;
  tds_amount: number;
  net_amount: number;
  previous_balance: number;
  cr: number;
  dr: number;
  current_balance: number;
  datetime?: string;
  transaction_datetime: string;
  date?: string;
  time?: string;
  status: string;
  raw_status?: string;
  status_description?: string;
  narration?: string;
  provider_name?: string;
  provider_txn_id?: string;
  provider_ref?: string;
  channel?: string;
}

const SERVICE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PAYOUT: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  Payout: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  "Payout Reversal": { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  PAYOUT_REVERSAL: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  DMT: { label: "DMT", bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", border: "rgba(16, 185, 129, 0.3)" },
  AEPS: { label: "AEPS", bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.3)" },
  UPI: { label: "UPI", bg: "rgba(139, 92, 246, 0.15)", text: "#A78BFA", border: "rgba(139, 92, 246, 0.3)" },
  BBPS: { label: "BBPS", bg: "rgba(236, 72, 153, 0.15)", text: "#F472B6", border: "rgba(236, 72, 153, 0.3)" },
  RECHARGE: { label: "Recharge", bg: "rgba(6, 182, 212, 0.15)", text: "#22D3EE", border: "rgba(6, 182, 212, 0.3)" },
  CARD_TO_CASH: { label: "Card-to-Cash", bg: "rgba(249, 115, 22, 0.15)", text: "#FB923C", border: "rgba(249, 115, 22, 0.3)" },
  SETTLEMENT: { label: "Settlement", bg: "rgba(99, 102, 241, 0.15)", text: "#818CF8", border: "rgba(99, 102, 241, 0.3)" },
  TOPUP: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.3)" },
  Topup: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.3)" },
  MANUAL_ADJUSTMENT: { label: "Adjustment", bg: "rgba(168, 85, 247, 0.15)", text: "#C084FC", border: "rgba(168, 85, 247, 0.3)" },
  MANUAL_TOPUP: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.3)" },
  MANUAL_DEBIT: { label: "Debit", bg: "rgba(239, 68, 68, 0.15)", text: "#F87171", border: "rgba(239, 68, 68, 0.3)" },
  BENE_VERIFY: { label: "Bene Verify", bg: "rgba(14, 165, 233, 0.15)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.3)" },
  BENEFICIARY_VERIFICATION: { label: "Bene Verify", bg: "rgba(14, 165, 233, 0.15)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.3)" },
  BENE_VERIFICATION: { label: "Bene Verify", bg: "rgba(14, 165, 233, 0.15)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.3)" },
};

const BANK_SHORT_NAMES: Record<string, string> = {
  "STATE BANK OF INDIA": "SBI",
  "STATE BANK OF HYDERABAD": "SBH",
  "STATE BANK OF PATIALA": "SBP",
  "HDFC BANK": "HDFC",
  "HDFC BANK LIMITED": "HDFC",
  "ICICI BANK": "ICICI",
  "ICICI BANK LIMITED": "ICICI",
  "PUNJAB NATIONAL BANK": "PNB",
  "BANK OF BARODA": "BOB",
  "AXIS BANK": "AXIS",
  "AXIS BANK LIMITED": "AXIS",
  "KOTAK MAHINDRA BANK": "KOTAK",
  "KOTAK MAHINDRA BANK LIMITED": "KOTAK",
  "UNION BANK OF INDIA": "UBI",
  "CANARA BANK": "CANARA",
  "INDIAN OVERSEAS BANK": "IOB",
  "IDBI BANK": "IDBI",
  "IDBI BANK LIMITED": "IDBI",
  "IDBI": "IDBI",
  "INDUSIND BANK": "INDUSIND",
  "INDUSIND BANK LIMITED": "INDUSIND",
  "FEDERAL BANK": "FEDERAL",
  "FEDERAL BANK LIMITED": "FEDERAL",
  "YES BANK": "YES",
  "YES BANK LIMITED": "YES",
  "BANK OF INDIA": "BOI",
  "CENTRAL BANK OF INDIA": "CBI",
  "INDIAN BANK": "INDIAN",
  "UCO BANK": "UCO",
  "BANK OF MAHARASHTRA": "BOM",
  "PUNJAB & SIND BANK": "PSB",
  "PUNJAB AND SIND BANK": "PSB",
  "AIRTEL PAYMENTS BANK": "AIRTEL",
  "PAYTM PAYMENTS BANK": "PAYTM",
  "FINO PAYMENTS BANK": "FINO",
  "AU SMALL FINANCE BANK": "AU BANK",
  "EQUITAS SMALL FINANCE BANK": "EQUITAS",
  "UJJIVAN SMALL FINANCE BANK": "UJJIVAN",
  "JANA SMALL FINANCE BANK": "JANA",
  "SOUTH INDIAN BANK": "SIB",
  "KARUR VYSYA BANK": "KVB",
  "CITY UNION BANK": "CUB",
  "TAMILNAD MERCANTILE BANK": "TMB",
  "BANDHAN BANK": "BANDHAN",
  "RBL BANK": "RBL",
  "STANDARD CHARTERED BANK": "SCB",
  "HSBC BANK": "HSBC",
  "CITI BANK": "CITI",
  "DBS BANK": "DBS",
};

export const getShortBankName = (bankName?: string): string => {
  if (!bankName) return "";
  const cleaned = bankName.trim().toUpperCase();
  if (BANK_SHORT_NAMES[cleaned]) return BANK_SHORT_NAMES[cleaned];
  for (const [full, short] of Object.entries(BANK_SHORT_NAMES)) {
    if (cleaned === full || cleaned.startsWith(full) || full.startsWith(cleaned)) return short;
  }
  return bankName
    .replace(/\s+Limited$/i, "")
    .replace(/\s+Ltd\.?$/i, "")
    .replace(/\s+Bank$/i, "")
    .trim();
};

export const getShortAccountNumber = (acc?: string): string => {
  if (!acc) return "";
  const digits = acc.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `•••• ${digits.slice(-4)}`;
  }
  const clean = acc.replace(/[\s-]/g, "");
  if (clean.length > 4) {
    return `•••• ${clean.slice(-4)}`;
  }
  return clean;
};

export const getTransactionComments = (row: TransactionReportItem): string => {
  if (row.status_description && row.status_description.trim() && !["SUCCESS", "LEDGER_POSTED", "COMPLETED"].includes(row.status_description.toUpperCase())) {
    return row.status_description;
  }
  if (row.comments && row.comments.trim()) return row.comments;
  if (row.narration && row.narration.trim()) return row.narration;

  const bene = row.beneficiary_name || row.customer_name;
  const shortBank = getShortBankName(row.bank_name);
  const shortAcc = getShortAccountNumber(row.account_number);

  if (row.status === "REVERSED" || row.raw_status === "REVERSED") {
    return `Reversal refund for ${row.txn_id}`;
  }
  if (row.status === "FAILED" && row.status_description) {
    return row.status_description;
  }
  if (row.service === "Payout" || row.service === "PAYOUT") {
    const bankDetails = [shortBank, shortAcc].filter(Boolean).join(" • ");
    return bene ? `Payout to ${bene}${bankDetails ? ` (${bankDetails})` : ""}` : "Payout transfer";
  }
  if (row.service === "Topup" || row.service === "TOPUP") {
    if (row.type === "MANUAL_TOPUP") return `Admin Manual Topup Allocation (+₹${row.amount.toLocaleString("en-IN")})`;
    if (row.type === "MANUAL_DEBIT") return `Admin Manual Wallet Debit (-₹${row.amount.toLocaleString("en-IN")})`;
    return `Wallet Topup (+₹${row.amount.toLocaleString("en-IN")}) [Ref: ${row.provider_ref || row.txn_id}]`;
  }
  if (row.service === "DMT") {
    return `DMT transfer to ${bene || row.customer_mobile || "Beneficiary"}`;
  }
  if (row.service === "Recharge") {
    return `Mobile Recharge ${row.customer_mobile ? `(${row.customer_mobile})` : ""}`;
  }
  if (row.service === "Bill Payment" || row.service === "BBPS") {
    return `Utility Bill Payment`;
  }
  if (row.service === "BENE_VERIFY" || row.service === "BENEFICIARY_VERIFICATION" || row.service === "Bene Verify") {
    if (row.narration && row.narration.trim()) return row.narration;
    return "Beneficiary Verification Charge";
  }
  if (row.status_description && row.status_description.trim()) {
    return row.status_description;
  }
  return `${row.service} Transaction`;
};

export const RetailerTransactionReport: React.FC = () => {
  const branding = useCompanyBranding();

  // State: Real Data directly from Database API
  const [items, setItems] = useState<TransactionReportItem[]>([]);
  const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Filters - Default focused on TODAY
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [creditDebitFilter, setCreditDebitFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("TODAY");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Drawer
  const [selectedTxn, setSelectedTxn] = useState<TransactionReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerDetails, setDrawerDetails] = useState<any>(null);

  // Export Menu
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Toast
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");

  const showToast = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  // Fetch Authoritative Transactions from Live Database via API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (serviceFilter !== "ALL") params.append("service", serviceFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (creditDebitFilter !== "ALL") {
        params.append("entry_type", creditDebitFilter === "CR" ? "CREDIT" : "DEBIT");
      }
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (globalSearch.trim()) params.append("search", globalSearch.trim());

      const token = typeof window !== "undefined" ? (
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("access_token") ||
        document.cookie.split("; ").find(r => r.startsWith("p2p_access_token=") || r.startsWith("pay2pay_access_token="))?.split("=")[1] ||
        ""
      ) : "";

      const headers: Record<string, string> = {};
      if (token && token.trim().length > 10) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      // Explicitly calls GET /api/v1/transactions/report
      const res = await fetch(`${baseUrl}/transactions/report?${params.toString()}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const rawItems = Array.isArray(json.data) ? json.data : (json.data?.items || json.items || []);
        const total = json.pagination?.total_records ?? json.data?.pagination?.total_records ?? rawItems.length;
        
        let totalVol = 0;
        let totalCr = 0;
        let totalDr = 0;
        let totalSuccess = 0;
        let totalPending = 0;
        let totalFailed = 0;
        let totalReversed = 0;

        const mappedItems: TransactionReportItem[] = rawItems.map((r: any, idx: number) => {
          const isCr = (r.entry || "").toUpperCase() === "CREDIT" || Number(r.cr_amt || r.cr || 0) > 0;
          const amt = Number(r.amount) || 0;
          const preBal = Number(r.opening_bal ?? r.balance_before ?? r.pre_bal ?? r.previous_balance) || 0;
          const clsBal = Number(r.closing_bal ?? r.balance_after ?? r.cls_bal ?? r.current_balance) || 0;
          const st = (r.status || "SUCCESS").toUpperCase();

          totalVol += amt;
          if (isCr) totalCr += amt;
          else totalDr += amt;

          if (st === "SUCCESS" || st === "SETTLED" || st === "COMPLETED") totalSuccess++;
          else if (st === "PENDING" || st === "PROCESSING" || st === "INITIATED") totalPending++;
          else if (st === "REVERSED") totalReversed++;
          else totalFailed++;

          const uniqueKey = r.transactions_ref_id
            ? String(r.transactions_ref_id)
            : r.public_id
            ? String(r.public_id)
            : `${r.txn_id || "txn"}-${r.entry || (isCr ? "CR" : "DR")}-${r.description || ""}-${amt}-${idx}`;

          return {
            id: uniqueKey,
            txn_id: r.txn_id || "",
            ref_id: r.ref_id || r.txn_id || "--",
            client_ref_id: r.ref_id || r.txn_id || "",
            service: (r.service || "PAYOUT").toUpperCase(),
            raw_service: r.service,
            type: r.wallet || "MAIN",
            customer_name: r.retailer || "Retailer",
            customer_mobile: "-",
            beneficiary_name: r.retailer || "",
            account_number: "-",
            bank_name: "-",
            ifsc_code: "-",
            amount: amt,
            charges: 0,
            commission: 0,
            gst_amount: 0,
            tds_amount: 0,
            net_amount: amt,
            pre_bal: preBal,
            previous_balance: preBal,
            dr_amt: isCr ? 0 : amt,
            dr: isCr ? 0 : amt,
            cr_amt: isCr ? amt : 0,
            cr: isCr ? amt : 0,
            cls_bal: clsBal,
            current_balance: clsBal,
            txn_amt: amt,
            tax: 0,
            date_time: r.date_time || r.created_at,
            transaction_datetime: r.date_time || r.created_at || new Date().toISOString(),
            date: (r.date_time || "").split("T")[0] || "",
            time: (r.date_time || "").split("T")[1]?.split(".")[0] || "",
            status: st,
            raw_status: r.status,
            status_description: r.description || "",
            comments: r.description || "",
            narration: r.description || "",
            cr_dr: isCr ? "CR" : "DR",
            provider_name: r.company || "Pay2Pay",
            provider_ref: r.ref_id || r.txn_id || "",
            channel: "RETAILER_PORTAL",
          };
        });

        setItems(mappedItems);
        setTotalRecords(total);
        setSummary({
          total_transactions: total,
          total_volume: totalVol,
          total_credit: totalCr,
          total_debit: totalDr,
          successful_transactions: totalSuccess,
          pending_transactions: totalPending,
          failed_transactions: totalFailed,
          reversed_transactions: totalReversed,
        });
      } else {
        setItems([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error("Failed to fetch transaction report:", err);
      setItems([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, rowsPerPage, serviceFilter, statusFilter, creditDebitFilter, fromDate, toDate, globalSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds when viewing TODAY to keep data live
  useEffect(() => {
    if (activePreset !== "TODAY") return;
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [activePreset, fetchData]);

  // Open Dynamic Transaction Details Modal
  const openDetailsDrawer = (item: TransactionReportItem) => {
    setSelectedTxn(item);
    setDrawerOpen(true);
  };

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const dNow = new Date();
    const today = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, "0")}-${String(dNow.getDate()).padStart(2, "0")}`;
    if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    } else if (preset === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "THIS_MONTH") {
      const d = new Date();
      d.setDate(1);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Txn ID",
      "Ref ID",
      "Service",
      "Pre Bal",
      "Dr Amt",
      "Cr Amt",
      "Cls Bal",
      "Txn Amt",
      "Tax",
      "Date/Time",
      "Status",
      "Comments",
      "Cr/Dr",
    ];
    const rows = items.map((t) => [
      t.txn_id,
      t.ref_id || t.provider_ref || "--",
      t.service,
      (t.pre_bal ?? t.previous_balance ?? 0).toFixed(2),
      (t.dr_amt ?? t.dr ?? 0).toFixed(2),
      (t.cr_amt ?? t.cr ?? 0).toFixed(2),
      (t.cls_bal ?? t.current_balance ?? 0).toFixed(2),
      (t.txn_amt ?? t.amount ?? 0).toFixed(2),
      (t.tax ?? t.charges ?? 0).toFixed(2),
      t.date_time || t.transaction_datetime,
      t.status,
      t.comments || getTransactionComments(t),
      t.cr_dr || ((t.cr_amt ?? t.cr ?? 0) > 0 ? "CR" : "DR"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Transactions_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
    showToast("CSV report exported successfully.");
  };

  return (
    <Box sx={{ width: "100%", color: "#F8FAFC" }}>
      {/* 1. SINGLE INTEGRATED COMPACT HEADER + FINANCIAL TOOLBAR CONTAINER (HEIGHT ~78-90px) */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1.5,
          px: 2.5,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "8px",
          minHeight: "78px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 25%)" },
            gap: { xs: 2, lg: 0 },
            width: "100%",
            alignItems: "center",
          }}
        >

          {/* SECTION 2 — TOTAL VOLUME */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
              pr: { lg: 2 },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#94A3B8",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              TOTAL VOLUME
            </Typography>
            {isLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#FFFFFF",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1,
                }}
              >
                ₹{(summary?.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", fontWeight: 500 }}>
              {summary?.total_transactions || totalRecords} txns
            </Typography>
          </Box>

          {/* SECTION 3 — TOTAL CREDIT */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
              pr: { lg: 2 },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#4ADE80",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              TOTAL CREDIT (CR)
            </Typography>
            {isLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#4ADE80",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1,
                }}
              >
                +₹{(summary?.total_credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>
              Wallet Inflow &amp; Reversals
            </Typography>
          </Box>

          {/* SECTION 4 — TOTAL DEBIT */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
              pr: { lg: 2 },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#F87171",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              TOTAL DEBIT (DR)
            </Typography>
            {isLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#F87171",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1,
                }}
              >
                -₹{(summary?.total_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>
              Payouts &amp; Outflows
            </Typography>
          </Box>

          {/* SECTION 5 — SUCCESSFUL / STATUS */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#60A5FA",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              SUCCESSFUL
            </Typography>
            {isLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#60A5FA",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1,
                }}
              >
                {summary?.total_transactions ? Math.round(((summary.successful_transactions || 0) / summary.total_transactions) * 100) : 100}%
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>
              {summary?.successful_transactions || 0} success · {summary?.reversed_transactions || 0} rev
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 2. SEARCH + DATE RANGE TOOLBAR */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1,
          px: 1.5,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "8px",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        {/* Search Input */}
        <TextField
          placeholder="Search by Transaction ID, Client Ref, Recipient, Bank, UTR, Service..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          size="small"
          sx={{
            flexGrow: 1,
            width: { xs: "100%", md: "auto" },
            "& .MuiOutlinedInput-root": {
              bgcolor: "#090D16",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#F8FAFC",
              height: "40px",
              "& fieldset": { borderColor: "#1E293B" },
              "&:hover fieldset": { borderColor: "#3B82F6" },
              "&.Mui-focused fieldset": { borderColor: "#3B82F6", borderWidth: "1.5px" },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#64748B", fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: globalSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setGlobalSearch("")} sx={{ color: "#64748B" }}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {/* Date Presets Segmented Control */}
        <Stack direction="row" spacing={0.5} sx={{ bgcolor: "#090D16", p: 0.5, borderRadius: "6px", border: "1px solid #1E293B", width: { xs: "100%", md: "auto" }, justifyContent: "center" }}>
          {[
            { key: "ALL", label: "All History" },
            { key: "TODAY", label: "Today" },
            { key: "YESTERDAY", label: "Yesterday" },
            { key: "7_DAYS", label: "7 Days" },
            { key: "30_DAYS", label: "30 Days" },
            { key: "THIS_MONTH", label: "This Month" },
          ].map((preset) => (
            <Button
              key={preset.key}
              size="small"
              onClick={() => handleDatePreset(preset.key)}
              sx={{
                px: 1.5,
                py: 0.4,
                fontSize: "12px",
                fontWeight: activePreset === preset.key ? 700 : 500,
                color: activePreset === preset.key ? "#FFFFFF" : "#94A3B8",
                bgcolor: activePreset === preset.key ? "#2563EB" : "transparent",
                borderRadius: "5px",
                textTransform: "none",
                minWidth: "auto",
                "&:hover": {
                  bgcolor: activePreset === preset.key ? "#1D4ED8" : "rgba(255, 255, 255, 0.06)",
                  color: "#FFFFFF",
                },
              }}
            >
              {preset.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      {/* 3. FILTER TOOLBAR + ACTION BUTTONS */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          px: 1.5,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "8px",
          mb: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        {/* Left Controls: Service, Status & CR/DR Selectors */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          {/* Service Selector */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(0);
              }}
              displayEmpty
              sx={{
                height: "34px",
                fontSize: "12px",
                bgcolor: "#0F172A",
                color: "#F8FAFC",
                borderRadius: "6px",
                "& fieldset": { borderColor: "#1E293B" },
              }}
            >
              <MenuItem value="ALL" sx={{ fontSize: "13px" }}>All Services</MenuItem>
              <MenuItem value="PAYOUT" sx={{ fontSize: "13px" }}>Payout</MenuItem>
              <MenuItem value="BENE_VERIFY" sx={{ fontSize: "13px" }}>Bene Verification</MenuItem>
              <MenuItem value="DMT" sx={{ fontSize: "13px" }}>DMT Transfer</MenuItem>
              <MenuItem value="AEPS" sx={{ fontSize: "13px" }}>AEPS Cash Out</MenuItem>
              <MenuItem value="UPI" sx={{ fontSize: "13px" }}>UPI Payments</MenuItem>
              <MenuItem value="BBPS" sx={{ fontSize: "13px" }}>BBPS Bill Payment</MenuItem>
              <MenuItem value="RECHARGE" sx={{ fontSize: "13px" }}>Recharge</MenuItem>
              <MenuItem value="CARD_TO_CASH" sx={{ fontSize: "13px" }}>Card-to-Cash (POS)</MenuItem>
              <MenuItem value="TOPUP" sx={{ fontSize: "13px" }}>Topup / Move to Bank</MenuItem>
              <MenuItem value="MANUAL_ADJUSTMENT" sx={{ fontSize: "13px" }}>Manual Adjustment</MenuItem>
            </Select>
          </FormControl>

          {/* Status Selector */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              displayEmpty
              sx={{
                height: "34px",
                fontSize: "12px",
                bgcolor: "#0F172A",
                color: "#F8FAFC",
                borderRadius: "6px",
                "& fieldset": { borderColor: "#1E293B" },
              }}
            >
              <MenuItem value="ALL" sx={{ fontSize: "13px" }}>All Statuses</MenuItem>
              <MenuItem value="SUCCESS" sx={{ fontSize: "13px" }}>Success</MenuItem>
              <MenuItem value="PENDING" sx={{ fontSize: "13px" }}>Pending</MenuItem>
              <MenuItem value="FAILED" sx={{ fontSize: "13px" }}>Failed</MenuItem>
              <MenuItem value="REVERSED" sx={{ fontSize: "13px" }}>Reversed</MenuItem>
            </Select>
          </FormControl>

          {/* Credit/Debit Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={creditDebitFilter}
              onChange={(e) => {
                setCreditDebitFilter(e.target.value);
                setPage(0);
              }}
              displayEmpty
              sx={{
                height: "34px",
                fontSize: "12px",
                bgcolor: "#0F172A",
                color: "#F8FAFC",
                borderRadius: "6px",
                "& fieldset": { borderColor: "#1E293B" },
              }}
            >
              <MenuItem value="ALL" sx={{ fontSize: "13px" }}>All Entries (CR &amp; DR)</MenuItem>
              <MenuItem value="CR" sx={{ fontSize: "13px" }}>Credit Only (+CR)</MenuItem>
              <MenuItem value="DR" sx={{ fontSize: "13px" }}>Debit Only (-DR)</MenuItem>
            </Select>
          </FormControl>

          {/* Reset Filters Button */}
          {(serviceFilter !== "ALL" || statusFilter !== "ALL" || creditDebitFilter !== "ALL" || globalSearch || activePreset !== "ALL") && (
            <Button
              size="small"
              onClick={() => {
                setServiceFilter("ALL");
                setStatusFilter("ALL");
                setCreditDebitFilter("ALL");
                setGlobalSearch("");
                handleDatePreset("ALL");
              }}
              sx={{
                color: "#F87171",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { bgcolor: "rgba(248, 113, 113, 0.1)" },
              }}
            >
              Reset Filters
            </Button>
          )}
        </Stack>

        {/* Right Actions: Refresh & Export */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={isRefreshing ? "animate-spin" : ""} sx={{ fontSize: 16 }} />}
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            sx={{
              height: "34px",
              borderColor: "#1E293B",
              bgcolor: "#0F172A",
              color: "#94A3B8",
              textTransform: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "12px",
              "&:hover": { borderColor: "#3B82F6", color: "#FFFFFF", bgcolor: "#1E293B" },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            sx={{
              height: "34px",
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              textTransform: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "12px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            Export
          </Button>

          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
            slotProps={{
              paper: {
                sx: { bgcolor: "#1E293B", color: "#FFFFFF", borderRadius: "8px", border: "1px solid #334155", mt: 0.5 },
              },
            }}
          >
            <MenuItem onClick={handleExportCsv} sx={{ fontSize: "13px", fontWeight: 600, gap: 1.5, py: 1 }}>
              <TableChartIcon fontSize="small" sx={{ color: "#34D399" }} /> Export CSV
            </MenuItem>
            <MenuItem onClick={handleExportCsv} sx={{ fontSize: "13px", fontWeight: 600, gap: 1.5, py: 1 }}>
              <InsertDriveFileIcon fontSize="small" sx={{ color: "#60A5FA" }} /> Export Excel (.xlsx)
            </MenuItem>
            <MenuItem onClick={() => window.print()} sx={{ fontSize: "13px", fontWeight: 600, gap: 1.5, py: 1 }}>
              <PrintIcon fontSize="small" sx={{ color: "#FBBF24" }} /> Print Report
            </MenuItem>
          </Menu>
        </Stack>
      </Paper>

      {/* ── Transaction Data Grid (Exact 13 Columns Contract) ─────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "8px",
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 1280 }} size="small">
            <TableHead sx={{ bgcolor: "#0F172A" }}>
              <TableRow sx={{ "& th": { color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", py: 1.8, px: 2, whiteSpace: "nowrap", borderBottom: "1px solid #1E293B" } }}>
                {/* 1. Txn ID */}
                <TableCell>Txn ID</TableCell>
                {/* 2. Ref ID */}
                <TableCell>Ref ID</TableCell>
                {/* 3. Service */}
                <TableCell>Service</TableCell>
                {/* 4. Pre Bal */}
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "12px", color: "#CBD5E1" }}>Pre Bal (₹)</TableCell>
                {/* 5. Dr Amt */}
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "12px", color: "#FCA5A5" }}>Dr Amt (₹)</TableCell>
                {/* 6. Cr Amt */}
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "12px", color: "#86EFAC" }}>Cr Amt (₹)</TableCell>
                {/* 7. Cls Bal */}
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "12px", color: "#CBD5E1" }}>Cls Bal (₹)</TableCell>
                {/* 8. Txn Amt */}
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "12px", color: "#93C5FD" }}>Txn Amt (₹)</TableCell>
                {/* 9. Tax */}
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "12px", color: "#FDE68A" }}>Tax (₹)</TableCell>
                {/* 10. Date/Time */}
                <TableCell>Date/Time</TableCell>
                {/* 11. Status */}
                <TableCell align="center">Status</TableCell>
                {/* 12. Comments */}
                <TableCell>Comments</TableCell>
                {/* 13. Cr/Dr (Must be last column) */}
                <TableCell align="center">Cr/Dr</TableCell>
                {/* 14. Action */}
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {Array.from({ length: 14 }).map((_, cIdx) => (
                      <TableCell key={cIdx} sx={{ py: 2, px: 2 }}>
                        <Skeleton variant="text" sx={{ bgcolor: "#1E293B" }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 8 }}>
                    <Stack sx={{ alignItems: "center" }} spacing={1.5}>
                      <ReceiptIcon sx={{ fontSize: 48, color: "#334155" }} />
                      <Typography variant="body1" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                        No transactions found in database for the selected filters.
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setServiceFilter("ALL");
                          setStatusFilter("ALL");
                          setCreditDebitFilter("ALL");
                          setGlobalSearch("");
                          handleDatePreset("ALL");
                        }}
                        sx={{ color: "#3B82F6", textTransform: "none", fontWeight: 700 }}
                      >
                        Reset All Filters
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => {
                  const badge = SERVICE_BADGES[row.service] || { label: row.service, bg: "#1E293B", text: "#94A3B8", border: "#334155" };
                  const drVal = row.dr_amt ?? row.dr ?? 0;
                  const crVal = row.cr_amt ?? row.cr ?? 0;
                  const preBalVal = row.pre_bal ?? row.previous_balance ?? 0;
                  const clsBalVal = row.cls_bal ?? row.current_balance ?? 0;
                  const txnAmtVal = row.txn_amt ?? row.amount ?? 0;
                  const taxVal = row.tax ?? row.charges ?? 0;
                  const crDrVal = row.cr_dr || (crVal > 0 ? "CR" : "DR");
                  const commentsVal = row.comments || getTransactionComments(row);
                  const refIdVal = row.ref_id || row.provider_ref || "—";
                  const dtVal = row.date_time || row.transaction_datetime;

                  return (
                    <TableRow
                      key={row.id ? `${row.id}-${idx}` : `${row.txn_id || "row"}-${idx}`}
                      hover
                      sx={{
                        "&:hover": { bgcolor: "rgba(30, 41, 59, 0.5) !important" },
                        borderBottom: "1px solid #1E293B",
                        cursor: "pointer",
                        "& td": { py: 1.5, px: 2, whiteSpace: "nowrap" },
                      }}
                      onClick={() => openDetailsDrawer(row)}
                    >
                      {/* 1. Txn ID */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Stack direction="row" sx={{ alignItems: "center" }} spacing={0.5}>
                          <Tooltip title={row.txn_id} arrow placement="top">
                            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#60A5FA", fontSize: "12px", whiteSpace: "nowrap" }}>
                              {row.txn_id}
                            </Typography>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(row.txn_id, "Transaction ID");
                            }}
                            sx={{ color: "#64748B", p: 0.3, "&:hover": { color: "#FFFFFF" } }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>

                      {/* 2. Ref ID */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#34D399", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {refIdVal}
                        </Typography>
                      </TableCell>

                      {/* 3. Service */}
                      <TableCell>
                        <Chip
                          label={badge.label || row.service}
                          size="small"
                          sx={{
                            bgcolor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            fontWeight: 800,
                            fontSize: "11px",
                            height: "24px",
                          }}
                        />
                      </TableCell>

                      {/* 4. Pre Bal */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#E2E8F0", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                          ₹{preBalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* 5. Dr Amt */}
                      <TableCell align="right">
                        {drVal > 0 ? (
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, color: "#EF4444", fontSize: "14px", whiteSpace: "nowrap" }}>
                            ₹{drVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: "#64748B", fontSize: "13px", whiteSpace: "nowrap" }}>
                            0.00
                          </Typography>
                        )}
                      </TableCell>

                      {/* 6. Cr Amt */}
                      <TableCell align="right">
                        {crVal > 0 ? (
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, color: "#10B981", fontSize: "14px", whiteSpace: "nowrap" }}>
                            ₹{crVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: "#64748B", fontSize: "13px", whiteSpace: "nowrap" }}>
                            0.00
                          </Typography>
                        )}
                      </TableCell>

                      {/* 7. Cls Bal */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#F8FAFC", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                          ₹{clsBalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* 8. Txn Amt */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, color: "#FFFFFF", fontSize: "14.5px", whiteSpace: "nowrap" }}>
                          ₹{txnAmtVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* 9. Tax */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: taxVal > 0 ? "#FBBF24" : "#94A3B8", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                          ₹{taxVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* 10. Date/Time */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ color: "#E2E8F0", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {new Date(dtVal).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", whiteSpace: "nowrap", display: "block" }}>
                          {new Date(dtVal).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </Typography>
                      </TableCell>

                      {/* 11. Status */}
                      <TableCell align="center">
                        <Chip
                          label={row.status}
                          size="small"
                          icon={
                            row.status === "SUCCESS" ? (
                              <CheckCircleIcon sx={{ fontSize: "14px !important", color: "#10B981 !important" }} />
                            ) : row.status === "PENDING" ? (
                              <AccessTimeIcon sx={{ fontSize: "14px !important", color: "#F59E0B !important" }} />
                            ) : row.status === "REVERSED" ? (
                              <RefreshIcon sx={{ fontSize: "14px !important", color: "#818CF8 !important" }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: "14px !important", color: "#EF4444 !important" }} />
                            )
                          }
                          sx={{
                            bgcolor: row.status === "SUCCESS" ? "rgba(16, 185, 129, 0.15)" : row.status === "PENDING" ? "rgba(245, 158, 11, 0.15)" : row.status === "REVERSED" ? "rgba(99, 102, 241, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: row.status === "SUCCESS" ? "#34D399" : row.status === "PENDING" ? "#FBBF24" : row.status === "REVERSED" ? "#818CF8" : "#F87171",
                            border: `1px solid ${row.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : row.status === "PENDING" ? "rgba(245, 158, 11, 0.3)" : row.status === "REVERSED" ? "rgba(99, 102, 241, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                            fontWeight: 800,
                            fontSize: "11px",
                          }}
                        />
                      </TableCell>

                      {/* 12. Comments */}
                      <TableCell sx={{ maxWidth: 220, minWidth: 150 }}>
                        <Tooltip title={commentsVal} arrow placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#F1F5F9",
                              fontWeight: 500,
                              fontSize: "12px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {commentsVal}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* 13. Cr/Dr (Must be last data column) */}
                      <TableCell align="center">
                        <Chip
                          label={crDrVal}
                          size="small"
                          sx={{
                            bgcolor: crDrVal === "CR" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: crDrVal === "CR" ? "#34D399" : "#F87171",
                            border: `1px solid ${crDrVal === "CR" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                            fontWeight: 800,
                            fontSize: "11px",
                            height: "22px",
                            fontFamily: "monospace",
                          }}
                        />
                      </TableCell>

                      {/* 14. Action */}
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsDrawer(row);
                          }}
                          sx={{ color: "#60A5FA", "&:hover": { bgcolor: "rgba(59, 130, 246, 0.15)" } }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalRecords}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          sx={{
            color: "#94A3B8",
            borderTop: "1px solid #1E293B",
            ".MuiTablePagination-selectIcon": { color: "#94A3B8" },
          }}
        />
      </Paper>

      {/* ── Dynamic Universal Transaction Details / View Report Modal ────── */}
      <DynamicTransactionDetailsModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        txnId={selectedTxn?.txn_id || null}
        initialData={selectedTxn}
        onToast={showToast}
      />

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" sx={{ bgcolor: "#10B981", color: "#FFFFFF", fontWeight: 600 }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RetailerTransactionReport;
