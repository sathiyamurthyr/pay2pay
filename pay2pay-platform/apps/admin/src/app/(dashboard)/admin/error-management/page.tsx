"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Grid,
  Chip,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SecurityIcon from "@mui/icons-material/Security";
import RefreshIcon from "@mui/icons-material/Refresh";
import CodeIcon from "@mui/icons-material/Code";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SpeedIcon from "@mui/icons-material/Speed";
import StorageIcon from "@mui/icons-material/Storage";

import apiClient from "@/lib/api";

interface VendorApiLog {
  id: number;
  public_id: string;
  vendor_name: string;
  vendor_url: string;
  http_method: string;
  http_status: number;
  latency_ms: number;
  correlation_id: string;
  request_json: any;
  response_json: any;
  headers: any;
  created_at: string;
}

interface ErrorMasterRule {
  id: number;
  internal_error_code: string;
  vendor_name: string;
  vendor_error_code: string | null;
  customer_message: string;
  retailer_message: string;
  admin_message: string;
  severity: string;
  category: string;
  is_active: boolean;
}

interface TransactionErrorRecord {
  id: number;
  transaction_id: string;
  internal_error_code: string;
  friendly_message: string;
  vendor_reference: string | null;
  vendor_status: string | null;
  rollback_status: string;
  retry_count: number;
  created_at: string;
}

export default function AdminErrorManagementPage() {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [selectedHttpStatus, setSelectedHttpStatus] = useState<string>("ALL");

  // Data States
  const [logs, setLogs] = useState<VendorApiLog[]>([]);
  const [rules, setRules] = useState<ErrorMasterRule[]>([]);
  const [txErrors, setTxErrors] = useState<TransactionErrorRecord[]>([]);

  // Selected Log Drawer/Modal State
  const [selectedLog, setSelectedLog] = useState<VendorApiLog | null>(null);

  const fetchVendorLogs = async () => {
    setLoading(true);
    try {
      let url = "/admin/error-management/vendor-logs?limit=100";
      if (selectedVendor !== "ALL") url += `&vendor_name=${selectedVendor}`;
      if (selectedHttpStatus !== "ALL") url += `&http_status=${selectedHttpStatus}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await apiClient.get(url);
      if (res.data && res.data.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch vendor logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await apiClient.get("/admin/error-management/master-rules");
      if (res.data && res.data.rules) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.error("Failed to fetch error master rules:", err);
    }
  };

  const fetchTxErrors = async () => {
    try {
      const res = await apiClient.get("/admin/error-management/transaction-errors");
      if (res.data && res.data.errors) {
        setTxErrors(res.data.errors);
      }
    } catch (err) {
      console.error("Failed to fetch transaction errors:", err);
    }
  };

  useEffect(() => {
    fetchVendorLogs();
    fetchRules();
    fetchTxErrors();
  }, [selectedVendor, selectedHttpStatus]);

  const handleRefresh = () => {
    fetchVendorLogs();
    fetchRules();
    fetchTxErrors();
  };

  const getStatusChipColor = (status: number) => {
    if (status >= 200 && status < 300) return "success";
    if (status >= 400 && status < 500) return "warning";
    return "error";
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#0B0F19", minHeight: "100vh", color: "#FFFFFF" }}>
      {/* ── PAGE HEADER ── */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: "24px", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
            🛡️ Enterprise Error & Telemetry Management Portal
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>
            Zero-leakage error mapping, raw vendor API telemetry logging, and ACID reversal auditing.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleRefresh}
          startIcon={<RefreshIcon />}
          sx={{ bgcolor: "#2563EB", fontWeight: 800, borderRadius: "10px", height: 42 }}
        >
          Refresh Telemetry
        </Button>
      </Stack>

      {/* ── METRICS SUMMARY CARDS ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", fontWeight: 700 }}>Total Telemetry Logs</Typography>
            <Typography sx={{ color: "#FFFFFF", fontSize: "28px", fontWeight: 900, my: 0.5 }}>{logs.length}</Typography>
            <Typography sx={{ color: "#60A5FA", fontSize: "11px", fontWeight: 800 }}>Raw Request/Response Telemetry</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", fontWeight: 700 }}>Failed Vendor Requests</Typography>
            <Typography sx={{ color: "#EF4444", fontSize: "28px", fontWeight: 900, my: 0.5 }}>
              {logs.filter((l) => l.http_status >= 400).length}
            </Typography>
            <Typography sx={{ color: "#F87171", fontSize: "11px", fontWeight: 800 }}>Intercepted & Mapped</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", fontWeight: 700 }}>Auto Reversals Completed</Typography>
            <Typography sx={{ color: "#4ADE80", fontSize: "28px", fontWeight: 900, my: 0.5 }}>
              {txErrors.filter((e) => e.rollback_status === "COMPLETED").length}
            </Typography>
            <Typography sx={{ color: "#4ADE80", fontSize: "11px", fontWeight: 800 }}>ACID Refund Audited</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(251, 191, 36, 0.2)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", fontWeight: 700 }}>Error Master Rules</Typography>
            <Typography sx={{ color: "#FBBF24", fontSize: "28px", fontWeight: 900, my: 0.5 }}>{rules.length}</Typography>
            <Typography sx={{ color: "#FBBF24", fontSize: "11px", fontWeight: 800 }}>PAY-1001 to PAY-1012 Active</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── NAVIGATION TABS ── */}
      <Paper elevation={0} sx={{ borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          sx={{
            px: 2,
            pt: 1,
            "& .MuiTab-root": { color: "rgba(255, 255, 255, 0.6)", fontWeight: 800, fontSize: "13px" },
            "& .Mui-selected": { color: "#60A5FA !important" },
          }}
        >
          <Tab label="📡 Raw Vendor API Logs" />
          <Tab label="⚙️ Error Master Code Rules" />
          <Tab label="🔄 Transaction Reversal Audit" />
        </Tabs>
      </Paper>

      {/* ── TAB 1: RAW VENDOR API LOGS ── */}
      {currentTab === 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          {/* SEARCH & FILTERS BAR */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search Correlation ID, URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchVendorLogs()}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.4)" }} />
                    </InputAdornment>
                  ),
                  sx: { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.05)", borderRadius: "10px" },
                },
              }}
            />

            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel sx={{ color: "rgba(255, 255, 255, 0.6)" }}>Vendor</InputLabel>
              <Select
                value={selectedVendor}
                label="Vendor"
                onChange={(e) => setSelectedVendor(e.target.value)}
                sx={{ color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.05)", borderRadius: "10px" }}
              >
                <MenuItem value="ALL">All Vendors</MenuItem>
                <MenuItem value="BulkPe">BulkPe</MenuItem>
                <MenuItem value="Cashfree">Cashfree</MenuItem>
                <MenuItem value="NPCI">NPCI</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel sx={{ color: "rgba(255, 255, 255, 0.6)" }}>HTTP Status</InputLabel>
              <Select
                value={selectedHttpStatus}
                label="HTTP Status"
                onChange={(e) => setSelectedHttpStatus(e.target.value)}
                sx={{ color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.05)", borderRadius: "10px" }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="200">200 OK</MenuItem>
                <MenuItem value="400">400 Bad Request</MenuItem>
                <MenuItem value="401">401 Unauthorized</MenuItem>
                <MenuItem value="422">422 Unprocessable</MenuItem>
                <MenuItem value="500">500 Server Error</MenuItem>
                <MenuItem value="502">502 Bad Gateway</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* TELEMETRY TABLE */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 800 }}>
                <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                  <TableRow>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Timestamp</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Vendor</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Endpoint / Method</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>HTTP Status</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Latency</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Correlation ID</TableCell>
                    <TableCell align="right" sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" } }}>
                      <TableCell sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "12px", fontFamily: "monospace" }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.vendor_name} color="primary" variant="outlined" size="small" sx={{ fontWeight: 800 }} />
                      </TableCell>
                      <TableCell sx={{ color: "#FFFFFF", fontSize: "12.5px" }}>
                        <Typography sx={{ fontFamily: "monospace", fontSize: "11.5px", color: "#60A5FA" }}>
                          [{log.http_method}] {log.vendor_url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`HTTP ${log.http_status}`}
                          color={getStatusChipColor(log.http_status)}
                          size="small"
                          sx={{ fontWeight: 900 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px", fontFamily: "monospace" }}>
                        {log.latency_ms} ms
                      </TableCell>
                      <TableCell sx={{ color: "#60A5FA", fontSize: "11px", fontFamily: "monospace" }}>
                        {log.correlation_id}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => setSelectedLog(log)}
                          startIcon={<VisibilityIcon sx={{ fontSize: 13 }} />}
                          sx={{ height: 28, fontSize: "10.5px", fontWeight: 800, bgcolor: "#2563EB" }}
                        >
                          Inspect JSON
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ── TAB 2: ERROR MASTER RULES ── */}
      {currentTab === 1 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Typography sx={{ fontWeight: 900, fontSize: "16px", mb: 2, color: "#60A5FA" }}>
            ⚙️ Mapped Internal Error Code Library (PAY-1001 to PAY-1012)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                <TableRow>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Internal Code</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Category</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Customer / Retailer Friendly Message</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Admin Description</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Severity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Chip label={rule.internal_error_code} color="warning" size="small" sx={{ fontWeight: 900, fontFamily: "monospace" }} />
                    </TableCell>
                    <TableCell sx={{ color: "#FFFFFF", fontSize: "12px", fontWeight: 700 }}>{rule.category}</TableCell>
                    <TableCell sx={{ color: "#4ADE80", fontSize: "12.5px", fontWeight: 700 }}>{rule.customer_message}</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px" }}>{rule.admin_message}</TableCell>
                    <TableCell>
                      <Chip label={rule.severity} color={rule.severity === "HIGH" ? "error" : "default"} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── TAB 3: TRANSACTION REVERSAL AUDIT ── */}
      {currentTab === 2 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: "14px", bgcolor: "rgba(18, 27, 48, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Typography sx={{ fontWeight: 900, fontSize: "16px", mb: 2, color: "#4ADE80" }}>
            🔄 Transaction Error & Automatic Reversal Log
          </Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                <TableRow>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Timestamp</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Tx Reference</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Error Code</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Friendly Message</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 800 }}>Rollback Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txErrors.map((err) => (
                  <TableRow key={err.id}>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px", fontFamily: "monospace" }}>
                      {err.created_at ? new Date(err.created_at).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ color: "#60A5FA", fontSize: "12px", fontWeight: 800, fontFamily: "monospace" }}>
                      {err.transaction_id}
                    </TableCell>
                    <TableCell>
                      <Chip label={err.internal_error_code} color="warning" size="small" sx={{ fontWeight: 900 }} />
                    </TableCell>
                    <TableCell sx={{ color: "#FFFFFF", fontSize: "12.5px" }}>{err.friendly_message}</TableCell>
                    <TableCell>
                      <Chip
                        label={err.rollback_status}
                        color={err.rollback_status === "COMPLETED" ? "success" : "default"}
                        size="small"
                        sx={{ fontWeight: 900 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── ADMIN RAW JSON TELEMETRY INSPECTION DIALOG ── */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid #2563EB",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1, color: "#60A5FA" }}>
          <SecurityIcon sx={{ color: "#60A5FA" }} /> Raw Vendor Telemetry Inspector [ADMIN ONLY]
        </DialogTitle>

        {selectedLog && (
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Vendor</Typography>
                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF" }}>{selectedLog.vendor_name}</Typography>
                  </Grid>

                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>HTTP Status</Typography>
                    <Chip label={`HTTP ${selectedLog.http_status}`} color={getStatusChipColor(selectedLog.http_status)} size="small" sx={{ fontWeight: 900 }} />
                  </Grid>

                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Latency</Typography>
                    <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontFamily: "monospace" }}>{selectedLog.latency_ms} ms</Typography>
                  </Grid>

                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Correlation ID</Typography>
                    <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontFamily: "monospace", fontSize: "11.5px" }}>{selectedLog.correlation_id}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* RAW REQUEST JSON */}
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px", mb: 0.5 }}>RAW VENDOR REQUEST JSON</Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "10px",
                    bgcolor: "#08111F",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#4ADE80",
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedLog.request_json, null, 2)}</pre>
                </Paper>
              </Box>

              {/* RAW RESPONSE JSON */}
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#EF4444", fontSize: "12px", mb: 0.5 }}>RAW VENDOR RESPONSE JSON</Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "10px",
                    bgcolor: "#08111F",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#F87171",
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedLog.response_json, null, 2)}</pre>
                </Paper>
              </Box>
            </Stack>
          </DialogContent>
        )}

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setSelectedLog(null)} sx={{ color: "rgba(255, 255, 255, 0.7)", borderColor: "rgba(255, 255, 255, 0.2)" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
