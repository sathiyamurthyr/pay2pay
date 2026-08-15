"use client";

import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Chip,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Drawer,
  IconButton,
  Divider,
  CircularProgress,
  Pagination,
  Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";

interface SummaryKPIs {
  todays_settlement: number;
  todays_transactions: number;
  total_settlement_amount: number;
  pending_settlement: number;
  failed_settlement: number;
  this_month_settlement: number;
}

interface SettlementItem {
  s_no: number;
  settlement_id: string;
  settlement_number: string;
  transaction_number: string;
  order_id: string;
  terminal_id: string;
  merchant_id: string;
  bank_name: string;
  card_type: string;
  card_network: string;
  masked_card_number: string;
  transaction_amount: number;
  mdr_charge: number;
  gst_amount: number;
  tds_amount: number;
  other_charges: number;
  net_settlement_amount: number;
  settlement_bank_account: string;
  utr_number: string;
  status: string;
  settlement_date: string;
  transaction_date: string;
  remarks: string;
}

interface FooterTotals {
  total_transactions: number;
  gross_transaction_amount: number;
  total_mdr: number;
  total_gst: number;
  total_tds: number;
  other_charges: number;
  total_net_settlement: number;
  pending_settlement_amount: number;
}

const getActiveRetailerId = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
  }
  return "";
};

export const SwipeMachineSettlementReport: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<SummaryKPIs>({
    todays_settlement: 0,
    todays_transactions: 0,
    total_settlement_amount: 0,
    pending_settlement: 0,
    failed_settlement: 0,
    this_month_settlement: 0
  });

  const [items, setItems] = useState<SettlementItem[]>([]);
  const [footerTotals, setFooterTotals] = useState<FooterTotals>({
    total_transactions: 0,
    gross_transaction_amount: 0,
    total_mdr: 0,
    total_gst: 0,
    total_tds: 0,
    other_charges: 0,
    total_net_settlement: 0,
    pending_settlement_amount: 0
  });

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [settlementId, setSettlementId] = useState<string>("");
  const [terminalId, setTerminalId] = useState<string>("");
  const [cardType, setCardType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [selectedSettlement, setSelectedSettlement] = useState<SettlementItem | null>(null);

  const fetchSummary = async () => {
    try {
      const activeRetailerId = getActiveRetailerId();
      const qParam = activeRetailerId ? `?retailer_id=${activeRetailerId}` : "";
      const res = await fetch(`${getApiBaseUrl()}/payout/reports/swipe-settlement/summary${qParam}`);
      if (res.ok) setSummary(await res.json());
    } catch (e) {
      console.error("Failed to fetch settlement summary", e);
    }
  };

  const fetchGridData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10"
      });

      const activeRetailerId = getActiveRetailerId();
      if (activeRetailerId) queryParams.append("retailer_id", activeRetailerId);

      if (fromDate) queryParams.append("from_date", fromDate);
      if (toDate) queryParams.append("to_date", toDate);
      if (settlementId) queryParams.append("settlement_id", settlementId);
      if (terminalId) queryParams.append("terminal_id", terminalId);
      if (cardType !== "ALL") queryParams.append("card_type", cardType);
      if (statusFilter !== "ALL") queryParams.append("status", statusFilter);

      const res = await fetch(`${getApiBaseUrl()}/payout/reports/swipe-settlement/grid?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.pagination) {
          setTotalPages(data.pagination.total_pages || 1);
          setTotalRecords(data.pagination.total_records || 0);
        }
        if (data.footer_totals) setFooterTotals(data.footer_totals);
      }
    } catch (e) {
      console.error("Failed to fetch settlement grid data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchGridData();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGridData();
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setSettlementId("");
    setTerminalId("");
    setCardType("ALL");
    setStatusFilter("ALL");
    setPage(1);
    setTimeout(() => {
      fetchGridData();
    }, 50);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No,Settlement Date,Settlement ID,Txn ID,TID,MID,Bank,Card,Gross Amount,MDR,GST,TDS,Net Settlement,UTR,Status\n";

    items.forEach((row) => {
      csvContent += `${row.s_no},"${row.settlement_date}","${row.settlement_number}","${row.transaction_number}","${row.terminal_id}","${row.merchant_id}","${row.bank_name}","${row.card_type}",${row.transaction_amount},${row.mdr_charge},${row.gst_amount},${row.tds_amount},${row.net_settlement_amount},"${row.utr_number}","${row.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Swipe_Settlement_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusChip = (st: string) => {
    let color = "#3B82F6";
    let bg = "rgba(59, 130, 246, 0.2)";
    const u = st.toUpperCase();

    if (u === "SETTLED") {
      color = "#4ADE80";
      bg = "rgba(22, 163, 74, 0.2)";
    } else if (u === "PENDING" || u === "PROCESSING") {
      color = "#FBBF24";
      bg = "rgba(217, 119, 6, 0.2)";
    } else if (u === "FAILED") {
      color = "#F87171";
      bg = "rgba(220, 38, 38, 0.2)";
    }

    return (
      <Chip
        label={u}
        size="medium"
        style={{
          backgroundColor: bg,
          color: color,
          fontWeight: 800,
          fontSize: "14px",
          height: 28,
          border: `1px solid ${color}60`
        }}
      />
    );
  };

  return (
    <Box sx={{ backgroundColor: "#08111F", color: "#F8FAFC", minHeight: "100vh", p: { xs: 2.5, md: 4 }, fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif" }}>
      {/* 1. HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "28px" }}>
            Swipe Machine Settlement Report
          </Typography>
          <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px", mt: 0.5, fontWeight: 500 }}>
            Track POS settlements, MDR deductions and bank credits.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon sx={{ fontSize: 22 }} />}
            onClick={handleExportCSV}
            sx={{ height: 48, borderRadius: "12px", fontWeight: 700, fontSize: "17px", color: "#60A5FA", borderColor: "rgba(96, 165, 250, 0.5)", px: 3 }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon sx={{ fontSize: 22 }} />}
            onClick={() => window.print()}
            sx={{ height: 48, borderRadius: "12px", fontWeight: 700, fontSize: "17px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", px: 3 }}
          >
            Print Report
          </Button>
        </Box>
      </Box>

      {/* 2. SUMMARY KPIS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Today's Settlement", value: `₹${summary.todays_settlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "#4ADE80" },
          { label: "Today's Transactions", value: summary.todays_transactions, color: "#60A5FA" },
          { label: "Total Settlement Amount", value: `₹${summary.total_settlement_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "#38BDF8" },
          { label: "Pending Settlement", value: `₹${summary.pending_settlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "#FBBF24" },
          { label: "Failed Settlement", value: `₹${summary.failed_settlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "#F87171" },
          { label: "This Month Settlement", value: `₹${summary.this_month_settlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "#C084FC" }
        ].map((k) => (
          <Grid size={{ xs: 12, sm: 6, md: 2 }} key={k.label}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", borderLeft: `6px solid ${k.color}` }}>
              <Typography variant="subtitle1" sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "18px" }}>{k.label}</Typography>
              <Typography variant="h1" sx={{ fontWeight: 800, color: "#FFFFFF", mt: 1, fontSize: "36px" }}>{k.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 3. FILTER CONSOLE */}
      <Paper elevation={0} sx={{ p: 3.5, mb: 4, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)" }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "22px", mb: 3 }}>
          Search & Filter POS Settlements
        </Typography>

        <form onSubmit={handleSearch}>
          <Grid container spacing={2} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                size="medium"
                type="date"
                label="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                size="medium"
                type="date"
                label="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                size="medium"
                label="Settlement ID"
                placeholder="SET-..."
                value={settlementId}
                onChange={(e) => setSettlementId(e.target.value)}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                size="medium"
                label="Terminal ID (TID)"
                placeholder="TID-..."
                value={terminalId}
                onChange={(e) => setTerminalId(e.target.value)}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                select
                fullWidth
                size="medium"
                label="Card Type"
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                sx={{ "& .MuiSelect-select": { color: "#FFFFFF", fontSize: "16px" } }}
              >
                <MenuItem value="ALL">ALL CARD TYPES</MenuItem>
                <MenuItem value="Credit Card">CREDIT CARD</MenuItem>
                <MenuItem value="Debit Card">DEBIT CARD</MenuItem>
                <MenuItem value="Prepaid Card">PREPAID CARD</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                select
                fullWidth
                size="medium"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ "& .MuiSelect-select": { color: "#FFFFFF", fontSize: "16px" } }}
              >
                <MenuItem value="ALL">ALL STATUSES</MenuItem>
                <MenuItem value="SETTLED">SETTLED</MenuItem>
                <MenuItem value="PENDING">PENDING</MenuItem>
                <MenuItem value="FAILED">FAILED</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchIcon sx={{ fontSize: 22 }} />}
                sx={{ height: 48, px: 3, borderRadius: "12px", fontWeight: 700, fontSize: "17px", backgroundColor: "#2563EB" }}
              >
                Search Settlements
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RestartAltIcon sx={{ fontSize: 22 }} />}
                sx={{ height: 48, px: 3, borderRadius: "12px", fontWeight: 700, fontSize: "17px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)" }}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* 4. GRID TABLE */}
      <Paper elevation={0} sx={{ borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
            <CircularProgress size={48} sx={{ color: "#60A5FA" }} />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow sx={{ "& th": { backgroundColor: "#0F172A", color: "#FFFFFF", fontWeight: 800, fontSize: "16px", py: 2 } }}>
                    <TableCell align="center">S.No</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Settlement ID</TableCell>
                    <TableCell>TID / MID</TableCell>
                    <TableCell>Card Details</TableCell>
                    <TableCell align="right">Gross Amount</TableCell>
                    <TableCell align="right">MDR Charge</TableCell>
                    <TableCell align="right">GST (18%)</TableCell>
                    <TableCell align="right">Net Settlement</TableCell>
                    <TableCell>Bank Account / UTR</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.settlement_id} hover sx={{ "& td": { borderColor: "rgba(255,255,255,0.08)", color: "#E2E8F0", fontSize: "16px", fontWeight: 500, py: 2 } }}>
                      <TableCell align="center">{row.s_no}</TableCell>
                      <TableCell sx={{ color: "#CBD5E1" }}>{row.settlement_date}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#60A5FA", fontFamily: "monospace" }}>{row.settlement_number}</TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>{row.terminal_id}</Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "14px" }}>{row.merchant_id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>{row.card_type} ({row.card_network})</Typography>
                        <Typography variant="caption" sx={{ color: "#CBD5E1", fontFamily: "monospace", fontSize: "14px" }}>{row.masked_card_number}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "#FFFFFF" }}>₹{row.transaction_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ color: "#F87171" }}>-₹{row.mdr_charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ color: "#FBBF24" }}>-₹{row.gst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "#4ADE80" }}>₹{row.net_settlement_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontSize: "16px", color: "#FFFFFF" }}>{row.bank_name}</Typography>
                        <Typography variant="caption" sx={{ color: "#4ADE80", fontFamily: "monospace", fontSize: "14px" }}>{row.utr_number}</Typography>
                      </TableCell>
                      <TableCell align="center">{renderStatusChip(row.status)}</TableCell>
                      <TableCell align="center">
                        <Button variant="outlined" size="small" onClick={() => setSelectedSettlement(row)} sx={{ textTransform: "none", fontWeight: 700, fontSize: "14px", borderColor: "rgba(255,255,255,0.3)", color: "#FFFFFF" }}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* FOOTER TOTALS */}
            <Box sx={{ p: 3, backgroundColor: "#0B1528", borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "16px" }}>
                Total Records: {totalRecords} | Gross Vol: ₹{footerTotals.gross_transaction_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "18px" }}>
                Total Net Settlement: ₹{footerTotals.total_net_settlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
              <Pagination count={totalPages} page={page} onChange={(_, val) => setPage(val)} color="primary" size="large" sx={{ "& .MuiPaginationItem-root": { color: "#FFFFFF", fontSize: "16px" } }} />
            </Box>
          </>
        )}
      </Paper>

      {/* 5. SIDE DRAWER DETAILS */}
      <Drawer anchor="right" open={Boolean(selectedSettlement)} onClose={() => setSelectedSettlement(null)}>
        {selectedSettlement && (
          <Box sx={{ width: { xs: "100vw", sm: 480 }, p: 4, backgroundColor: "#0F172A", color: "#FFFFFF", height: "100%", overflowY: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px" }}>Settlement Breakdown</Typography>
              <IconButton onClick={() => setSelectedSettlement(null)} sx={{ color: "#FFFFFF" }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.14)", mb: 3 }} />

            <Paper sx={{ p: 3, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "18px", mb: 1 }}>Terminal Info</Typography>
              <Typography variant="body1" sx={{ fontSize: "16px", color: "#CBD5E1" }}>Settlement ID: <strong>{selectedSettlement.settlement_number}</strong></Typography>
              <Typography variant="body1" sx={{ fontSize: "16px", color: "#CBD5E1", mt: 0.5 }}>TID: <strong>{selectedSettlement.terminal_id}</strong></Typography>
              <Typography variant="body1" sx={{ fontSize: "16px", color: "#CBD5E1", mt: 0.5 }}>MID: <strong>{selectedSettlement.merchant_id}</strong></Typography>
            </Paper>

            <Paper sx={{ p: 3, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "18px", mb: 1 }}>Financial Deduction Ledger</Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography variant="body1" sx={{ fontSize: "16px", color: "#CBD5E1" }}>Gross Amount:</Typography>
                <Typography variant="body1" sx={{ fontSize: "18px", fontWeight: 800, color: "#FFFFFF" }}>₹{selectedSettlement.transaction_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography variant="body1" sx={{ fontSize: "16px", color: "#CBD5E1" }}>MDR Charge:</Typography>
                <Typography variant="body1" sx={{ fontSize: "16px", fontWeight: 700, color: "#F87171" }}>-₹{selectedSettlement.mdr_charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography variant="body1" sx={{ fontSize: "16px", color: "#CBD5E1" }}>GST (18%):</Typography>
                <Typography variant="body1" sx={{ fontSize: "16px", fontWeight: 700, color: "#FBBF24" }}>-₹{selectedSettlement.gst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.14)", my: 1.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "18px" }}>Net Credit to Bank:</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "22px" }}>₹{selectedSettlement.net_settlement_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>
            </Paper>

            <Button fullWidth variant="contained" onClick={() => window.print()} sx={{ py: 1.8, fontSize: "17px", fontWeight: 700, borderRadius: 3, backgroundColor: "#2563EB" }}>
              Print Settlement Voucher
            </Button>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
