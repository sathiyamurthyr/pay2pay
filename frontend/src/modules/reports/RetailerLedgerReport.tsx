import React, { useState, useEffect } from "react";
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
  InputLabel,
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
  CircularProgress,
  TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

export interface LedgerSummary {
  opening_balance: number;
  closing_balance: number;
  total_credits: number;
  total_debits: number;
  todays_credit: number;
  todays_debit: number;
}

export interface LedgerItem {
  s_no: number;
  ledger_id: string;
  transaction_date: string | null;
  transaction_id: string;
  reference_id: string;
  order_id: string;
  service: string;
  description: string;
  opening_balance: number;
  credit: number;
  debit: number;
  closing_balance: number;
  entry_type: string;
  status: string;
  remarks: string;
}

export interface FooterTotals {
  total_records: number;
  total_credit: number;
  total_debit: number;
  net_movement: number;
  closing_balance: number;
}

export const RetailerLedgerReport: React.FC = () => {
  const retailerId = "93538c98-0b19-493c-a247-4cdb02a46c68";
  const tenantId = "93538c98-0b19-493c-a247-4cdb02a46c68";

  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [footerTotals, setFooterTotals] = useState<FooterTotals | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLedger, setSelectedLedger] = useState<LedgerItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [searchTxnId, setSearchTxnId] = useState<string>("");
  const [searchRefId, setSearchRefId] = useState<string>("");
  const [searchOrderId, setSearchOrderId] = useState<string>("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("ALL");
  const [amountFrom, setAmountFrom] = useState<string>("");
  const [amountTo, setAmountTo] = useState<string>("");

  const fetchSummary = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/payout/reports/ledger/summary?retailer_id=${retailerId}&tenant_id=${tenantId}`);
      if (res.ok) {
        setSummary(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch ledger summary", e);
    }
  };

  const fetchLedgerData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        retailer_id: retailerId,
        tenant_id: tenantId,
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (fromDate) queryParams.append("from_date", fromDate);
      if (toDate) queryParams.append("to_date", toDate);
      if (searchTxnId) queryParams.append("transaction_id", searchTxnId);
      if (searchRefId) queryParams.append("reference_id", searchRefId);
      if (searchOrderId) queryParams.append("order_id", searchOrderId);
      if (entryTypeFilter !== "ALL") queryParams.append("entry_type", entryTypeFilter);
      if (amountFrom) queryParams.append("amount_from", amountFrom);
      if (amountTo) queryParams.append("amount_to", amountTo);

      const res = await fetch(`http://localhost:8000/api/v1/payout/reports/ledger/grid?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalRecords(data.pagination?.total_records || 0);
        setFooterTotals(data.footer_totals || null);
      }
    } catch (e) {
      console.error("Failed to fetch ledger grid", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchLedgerData();
  }, [page, rowsPerPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLedgerData();
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setSearchTxnId("");
    setSearchRefId("");
    setSearchOrderId("");
    setEntryTypeFilter("ALL");
    setAmountFrom("");
    setAmountTo("");
    setPage(0);
    setTimeout(() => {
      fetchLedgerData();
    }, 50);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No,Date & Time,Txn ID,Ref ID,Order ID,Service,Description,Opening Balance,Credit,Debit,Closing Balance,Entry Type,Status\n";

    items.forEach((row) => {
      csvContent += `${row.s_no},"${row.transaction_date || ""}","${row.transaction_id}","${row.reference_id}","${row.order_id}","${row.service}","${row.description}",${row.opening_balance},${row.credit},${row.debit},${row.closing_balance},"${row.entry_type}","${row.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Passbook_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (row: LedgerItem) => {
    setSelectedLedger(row);
    setDrawerOpen(true);
  };

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "#08111F", color: "#F8FAFC", p: { xs: 2.5, md: 4 }, fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif" }}>
      {/* ── HEADER ── */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "28px", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
            Ledger Statement
          </Typography>
          <Typography sx={{ color: "#CBD5E1", fontSize: "16px", mt: 0.5, fontWeight: 500 }}>
            Complete wallet debit, credit and running balance history.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
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
            Print
          </Button>
        </Stack>
      </Stack>

      {/* ── SUMMARY CARDS ── */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, mb: 4 }}>
        {[
          { title: "Opening Balance", value: summary?.opening_balance || 0, color: "#60A5FA" },
          { title: "Total Credits", value: summary?.total_credits || 0, color: "#4ADE80" },
          { title: "Total Debits", value: summary?.total_debits || 0, color: "#F87171" },
          { title: "Closing Balance", value: summary?.closing_balance || 0, color: "#38BDF8" },
          { title: "Today's Debit", value: summary?.todays_debit || 0, color: "#F87171" },
          { title: "Today's Credit", value: summary?.todays_credit || 0, color: "#4ADE80" },
        ].map((card, idx) => (
          <Box key={idx} sx={{ flex: "1 1 200px", minWidth: 160, maxWidth: 260 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "16px",
                bgcolor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                textAlign: "left",
              }}
            >
              <Typography sx={{ color: "#E2E8F0", fontSize: "16px", fontWeight: 700 }}>
                {card.title}
              </Typography>
              <Typography sx={{ color: card.color, fontWeight: 800, fontSize: "36px", mt: 1 }}>
                ₹{card.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>
          </Box>
        ))}
      </Box>

      {/* ── FILTER CONSOLE ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          mb: 4,
          borderRadius: "16px",
          bgcolor: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
        }}
      >
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "22px", mb: 3 }}>
          Search & Filter Passbook Ledger
        </Typography>

        <form onSubmit={handleSearch}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ flex: "1 1 200px" }}>
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
            </Box>

            <Box sx={{ flex: "1 1 200px" }}>
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
            </Box>

            <Box sx={{ flex: "1 1 200px" }}>
              <TextField
                fullWidth
                size="medium"
                label="Transaction ID"
                placeholder="TXN..."
                value={searchTxnId}
                onChange={(e) => setSearchTxnId(e.target.value)}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Box>

            <Box sx={{ flex: "1 1 200px" }}>
              <TextField
                fullWidth
                size="medium"
                label="Reference ID"
                placeholder="REF..."
                value={searchRefId}
                onChange={(e) => setSearchRefId(e.target.value)}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Box>

            <Box sx={{ flex: "1 1 180px" }}>
              <FormControl fullWidth size="medium">
                <InputLabel sx={{ color: "#FFFFFF", fontSize: "16px" }}>Entry Type</InputLabel>
                <Select
                  value={entryTypeFilter}
                  label="Entry Type"
                  onChange={(e) => setEntryTypeFilter(e.target.value)}
                  sx={{ color: "#FFFFFF", fontSize: "16px" }}
                >
                  <MenuItem value="ALL">ALL ENTRIES</MenuItem>
                  <MenuItem value="CREDIT">CREDIT ONLY</MenuItem>
                  <MenuItem value="DEBIT">DEBIT ONLY</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: "1 1 150px" }}>
              <TextField
                fullWidth
                size="medium"
                type="number"
                label="Amount From"
                value={amountFrom}
                onChange={(e) => setAmountFrom(e.target.value)}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Box>

            <Box sx={{ flex: "1 1 150px" }}>
              <TextField
                fullWidth
                size="medium"
                type="number"
                label="Amount To"
                value={amountTo}
                onChange={(e) => setAmountTo(e.target.value)}
                sx={{ "& input": { color: "#FFFFFF", fontSize: "16px" } }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", ml: "auto" }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchIcon sx={{ fontSize: 22 }} />}
                sx={{ height: 48, px: 3, borderRadius: "12px", fontWeight: 700, fontSize: "17px", bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }}
              >
                Search
              </Button>

              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RestartAltIcon sx={{ fontSize: 22 }} />}
                sx={{ height: 48, px: 3, borderRadius: "12px", fontWeight: 700, fontSize: "17px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)" }}
              >
                Reset
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* ── GRID TABLE VIEW ── */}
      <Paper elevation={0} sx={{ borderRadius: "16px", bgcolor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", overflow: "hidden" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 8 }}>
            <CircularProgress size={48} sx={{ color: "#60A5FA" }} />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 800, fontSize: "16px", py: 2 } }}>
                    <TableCell align="center">S.No</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Txn ID</TableCell>
                    <TableCell>Ref ID</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Opening Balance</TableCell>
                    <TableCell align="right">Credit (+)</TableCell>
                    <TableCell align="right">Debit (-)</TableCell>
                    <TableCell align="right">Closing Balance</TableCell>
                    <TableCell align="center">Entry Type</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.ledger_id} hover sx={{ "& td": { borderColor: "rgba(255,255,255,0.08)", color: "#E2E8F0", fontSize: "16px", fontWeight: 500, py: 2 } }}>
                      <TableCell align="center">{row.s_no}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", color: "#CBD5E1" }}>
                        {row.transaction_date ? new Date(row.transaction_date).toLocaleString("en-IN") : "--"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#60A5FA", fontFamily: "monospace" }}>{row.transaction_id}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", color: "#CBD5E1" }}>{row.reference_id}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>{row.service}</TableCell>
                      <TableCell sx={{ color: "#CBD5E1" }}>{row.description}</TableCell>
                      <TableCell align="right" sx={{ color: "#94A3B8" }}>
                        ₹{row.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "#4ADE80" }}>
                        {row.credit > 0 ? `+₹${row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "--"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "#F87171" }}>
                        {row.debit > 0 ? `-₹${row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "--"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                        ₹{row.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={row.entry_type === "CREDIT" ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />}
                          label={row.entry_type}
                          size="medium"
                          sx={{
                            height: 28,
                            fontSize: "14px",
                            fontWeight: 800,
                            bgcolor: row.entry_type === "CREDIT" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: row.entry_type === "CREDIT" ? "#4ADE80" : "#F87171",
                            border: `1px solid ${row.entry_type === "CREDIT" ? "#4ADE8060" : "#F8717160"}`,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => handleViewDetails(row)} sx={{ color: "#60A5FA" }}>
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ── FOOTER TOTALS ── */}
            {footerTotals && (
              <Box sx={{ p: 2.5, bgcolor: "#0B1528", borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#60A5FA" }}>
                  PASSBOOK MOVEMENT SUMMARY ({footerTotals.total_records} Records)
                </Typography>

                <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
                  <Box>
                    <Typography sx={{ fontSize: "14px", color: "#CBD5E1" }}>Total Credits (+)</Typography>
                    <Typography sx={{ fontSize: "18px", fontWeight: 800, color: "#4ADE80" }}>+₹{footerTotals.total_credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "14px", color: "#CBD5E1" }}>Total Debits (-)</Typography>
                    <Typography sx={{ fontSize: "18px", fontWeight: 800, color: "#F87171" }}>-₹{footerTotals.total_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "14px", color: "#CBD5E1" }}>Net Wallet Movement</Typography>
                    <Typography sx={{ fontSize: "18px", fontWeight: 800, color: footerTotals.net_movement >= 0 ? "#4ADE80" : "#F87171" }}>
                      {footerTotals.net_movement >= 0 ? "+" : ""}₹{footerTotals.net_movement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}

            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={totalRecords}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{ color: "#FFFFFF", "& .MuiTablePagination-selectIcon": { color: "#FFFFFF" } }}
            />
          </>
        )}
      </Paper>

      {/* ── DETAILS DRAWER ── */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selectedLedger && (
          <Box sx={{ width: { xs: "100vw", sm: 500 }, p: 4, bgcolor: "#0F172A", color: "#FFFFFF", height: "100%", overflowY: "auto" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "22px", color: "#FFFFFF" }}>Ledger Entry Details</Typography>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "#FFFFFF" }}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.14)", mb: 3 }} />

            <Paper sx={{ p: 3, bgcolor: "rgba(255,255,255,0.04)", borderRadius: 3, mb: 3 }}>
              <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "16px", mb: 1 }}>Entry Identifiers</Typography>
              <Typography sx={{ fontSize: "16px", color: "#E2E8F0" }}>Ledger ID: <strong>{selectedLedger.ledger_id}</strong></Typography>
              <Typography sx={{ fontSize: "16px", color: "#E2E8F0", mt: 0.5 }}>Txn ID: <strong>{selectedLedger.transaction_id}</strong></Typography>
              <Typography sx={{ fontSize: "16px", color: "#E2E8F0", mt: 0.5 }}>Service: <strong>{selectedLedger.service}</strong></Typography>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: "rgba(255,255,255,0.04)", borderRadius: 3, mb: 3 }}>
              <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "16px", mb: 1 }}>Running Balance Impact</Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography sx={{ fontSize: "16px", color: "#CBD5E1" }}>Opening Balance:</Typography>
                <Typography sx={{ fontSize: "18px", fontWeight: 800, color: "#FFFFFF" }}>₹{selectedLedger.opening_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography sx={{ fontSize: "16px", color: "#CBD5E1" }}>Amount:</Typography>
                <Typography sx={{ fontSize: "18px", fontWeight: 800, color: selectedLedger.entry_type === "CREDIT" ? "#4ADE80" : "#F87171" }}>
                  {selectedLedger.entry_type === "CREDIT" ? `+₹${selectedLedger.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : `-₹${selectedLedger.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.14)", my: 1.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: "16px", fontWeight: 800, color: "#38BDF8" }}>Closing Balance:</Typography>
                <Typography sx={{ fontSize: "20px", fontWeight: 800, color: "#38BDF8" }}>₹{selectedLedger.closing_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
