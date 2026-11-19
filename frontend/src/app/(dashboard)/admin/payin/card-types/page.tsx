"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Switch, Button, Alert, CircularProgress, Chip, Grid,
  Card, CardContent, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, Tooltip, Snackbar, Stack
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import PublicIcon from "@mui/icons-material/Public";
import SearchIcon from "@mui/icons-material/Search";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import Link from "next/link";
import apiClient from "@/lib/api";

interface CardTypeItem {
  payin_card_type_ref_id: number;
  card_type_code: string;
  card_type_name: string;
  card_network: string;
  card_desc?: string | null;
  status?: string;
  is_enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export default function AdminPayinCardTypesPage() {
  const [cards, setCards] = useState<CardTypeItem[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [dbTotal, setDbTotal] = useState<number>(0);
  const [dbActive, setDbActive] = useState<number>(0);
  const [dbInactive, setDbInactive] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/card-types");
      if (res.data && res.data.success) {
        const fetchedCards: CardTypeItem[] = res.data.card_types || [];
        setCards(fetchedCards);

        // Populate summary counts directly from authoritative DB response
        setDbTotal(res.data.total ?? fetchedCards.length);
        setDbActive(res.data.active_count ?? fetchedCards.filter(c => c.is_enabled).length);
        setDbInactive(res.data.inactive_count ?? fetchedCards.filter(c => !c.is_enabled).length);

        // Dynamically extract networks from DB API or from the records
        const dynamicNetworks = res.data.networks || Array.from(
          new Set(fetchedCards.map(c => c.card_network).filter(Boolean))
        ).sort();
        setNetworks(dynamicNetworks);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load card types catalog from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleToggle = async (cardRefId: number, currentVal: boolean) => {
    try {
      setTogglingId(cardRefId);
      const targetState = !currentVal;
      const res = await apiClient.post(`/api/v1/admin/payin/card-types/${cardRefId}/toggle`, {
        is_enabled: targetState
      });
      if (res.data && res.data.success) {
        setCards((prev) =>
          prev.map((c) =>
            c.payin_card_type_ref_id === cardRefId
              ? { ...c, is_enabled: targetState, status: targetState ? "ACTIVE" : "DISABLED" }
              : c
          )
        );
        // Recalculate metrics
        setDbActive((prev) => (targetState ? prev + 1 : prev - 1));
        setDbInactive((prev) => (targetState ? prev - 1 : prev + 1));
        setToastMessage(`Card type #${cardRefId} ${targetState ? "enabled" : "disabled"} successfully.`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to toggle card status.");
    } finally {
      setTogglingId(null);
    }
  };

  // Client-side filtering across the loaded authoritative DB records
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      // Network filter
      if (selectedNetwork !== "ALL" && c.card_network.toUpperCase() !== selectedNetwork.toUpperCase()) {
        return false;
      }
      // Status filter
      if (selectedStatus === "ACTIVE" && !c.is_enabled) return false;
      if (selectedStatus === "DISABLED" && c.is_enabled) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = c.card_type_code.toLowerCase().includes(q);
        const nameMatch = c.card_type_name.toLowerCase().includes(q);
        const networkMatch = c.card_network.toLowerCase().includes(q);
        const descMatch = c.card_desc?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !networkMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });
  }, [cards, selectedNetwork, selectedStatus, searchQuery]);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedNetwork !== "ALL" || selectedStatus !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedNetwork("ALL");
    setSelectedStatus("ALL");
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* 1. Header with Breadcrumb and Action */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            component={Link}
            href="/admin/payin/dashboard"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
            sx={{ textTransform: "none", borderColor: "grey.300", color: "text.secondary" }}
          >
            Dashboard
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
              Card Types & Networks Catalog
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
              Authoritative database catalog of supported card schemes, classifications, and network routing rules.
            </Typography>
          </Box>
        </Box>
        <div className="flex items-center space-x-3">
          <Button
            component={Link}
            href="/admin/payin/mdr"
            variant="contained"
            color="primary"
            size="small"
            startIcon={<CreditCardIcon />}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Configure Gateway MDR Rates
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={fetchCards}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        </div>
      </Box>

      {/* Error Feedback */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 2. Summary KPI Metrics (Synchronized with DB) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Total Card Types
                </Typography>
                <CreditCardIcon sx={{ color: "primary.main", fontSize: 24 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: "text.primary" }}>
                {dbTotal}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Authoritative database entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Active & Routable
                </Typography>
                <CheckCircleIcon sx={{ color: "success.main", fontSize: 24 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: "success.main" }}>
                {dbActive}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Available for PayIn transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Disabled / Inactive
                </Typography>
                <BlockIcon sx={{ color: dbInactive > 0 ? "warning.main" : "text.disabled", fontSize: 24 }} />
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, mt: 1, color: dbInactive > 0 ? "warning.main" : "text.secondary" }}
              >
                {dbInactive}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Temporarily suspended schemes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Configured Networks
                </Typography>
                <PublicIcon sx={{ color: "info.main", fontSize: 24 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: "text.primary" }}>
                {networks.length}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                {networks.map((net) => (
                  <Chip key={net} label={net} size="small" variant="outlined" sx={{ fontSize: "0.68rem", height: 20 }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Filter & Search Controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Card Code, Name, or Network..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="network-select-label">Network</InputLabel>
              <Select
                labelId="network-select-label"
                label="Network"
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
              >
                <MenuItem value="ALL">All Networks</MenuItem>
                {networks.map((net) => (
                  <MenuItem key={net} value={net}>
                    {net}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-select-label">Status</InputLabel>
              <Select
                labelId="status-select-label"
                label="Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="ACTIVE">Active Only</MenuItem>
                <MenuItem value="DISABLED">Disabled Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={12} md={1.5} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            {hasActiveFilters && (
              <Button
                variant="text"
                size="small"
                startIcon={<FilterListOffIcon />}
                onClick={handleResetFilters}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Reset
              </Button>
            )}
          </Grid>
        </Grid>

        {/* Filter status count */}
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Showing <strong>{filteredCards.length}</strong> of <strong>{dbTotal}</strong> configured card records
          </Typography>
          {hasActiveFilters && (
            <Chip
              label="Filters Applied"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )}
        </Box>
      </Paper>

      {/* 4. Authoritative Database Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Retrieving card types catalog from database...
            </Typography>
          </Box>
        ) : filteredCards.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CreditCardIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.secondary" }}>
              No card types match the selected filters
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mb: 2 }}>
              Try adjusting your search criteria or resetting filters.
            </Typography>
            {hasActiveFilters && (
              <Button variant="outlined" size="small" onClick={handleResetFilters} sx={{ textTransform: "none" }}>
                Clear Filters
              </Button>
            )}
          </Box>
        ) : (
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: "10%" }}>Reference ID</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "20%" }}>Card Code</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "30%" }}>Card Name</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "15%" }}>Network</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "13%" }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: "12%" }}>Enabled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCards.map((c) => (
                <TableRow key={c.payin_card_type_ref_id} hover>
                  <TableCell>
                    <Chip
                      label={`#${c.payin_card_type_ref_id}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, bgcolor: "grey.50" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "text.primary",
                        letterSpacing: "0.02em"
                      }}
                    >
                      {c.card_type_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {c.card_type_name}
                    </Typography>
                    {c.card_desc && (
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {c.card_desc}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.card_network}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.is_enabled ? "ACTIVE" : "DISABLED"}
                      color={c.is_enabled ? "success" : "default"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={c.is_enabled ? "Click to disable card type" : "Click to enable card type"}>
                      <Switch
                        checked={c.is_enabled}
                        onChange={() => handleToggle(c.payin_card_type_ref_id, c.is_enabled)}
                        disabled={togglingId === c.payin_card_type_ref_id}
                        color="primary"
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Snackbar feedback */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
      />
    </Box>
  );
}
