"use client";

import React, { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TablePagination, TextField, InputAdornment, Box, Button, Menu, MenuItem,
  Chip, IconButton, Typography, Tooltip, Stack, CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import * as XLSX from "xlsx";

export interface DataGridColumn<T = any> {
  id?: keyof T | string;
  label?: string;
  minWidth?: number;
  align?: "left" | "right" | "center";
  format?: (value: any, row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  header?: string;
  accessorKey?: string;
  isNumeric?: boolean;
}

export type ColumnConfig<T = any> = DataGridColumn<T>;

export function SoftBadge({
  children,
  status,
  variant,
}: {
  children?: React.ReactNode;
  status?: string;
  variant?: string;
}) {
  const val = status || (typeof children === "string" ? children : variant || "default");
  let bg = "#F1F5F9";
  let color = "#334155";
  const upper = String(val).toUpperCase();

  if (["SUCCESS", "ACTIVE", "VERIFIED", "SETTLED"].includes(upper)) {
    bg = "#DCFCE7";
    color = "#15803D";
  } else if (["PENDING", "PROCESSING", "IN_REVIEW"].includes(upper)) {
    bg = "#FEF3C7";
    color = "#B45309";
  } else if (["FAILED", "REJECTED", "SUSPENDED"].includes(upper)) {
    bg = "#FEE2E2";
    color = "#B91C1C";
  }

  return (
    <span style={{ backgroundColor: bg, color, padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: "0.75rem" }}>
      {children || val}
    </span>
  );
}

export interface EnterpriseDataGridProps<T = any> {
  title?: string;
  columns: DataGridColumn<T>[];
  rows?: T[];
  searchPlaceholder?: string;
  keyExtractor?: (row: T) => string;
  defaultRowsPerPage?: number;
  actionButton?: React.ReactNode;
  data?: T[];
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
  numericSumKey?: string;
  onViewRow?: (row: T) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  bulkActions?: any[];
  filterOptions?: any[];
}

export function EnterpriseDataGrid<T = any>({
  title,
  columns,
  rows,
  data,
  searchPlaceholder = "Search records...",
  keyExtractor,
  defaultRowsPerPage = 10,
  actionButton,
  loading = false,
  onRefresh,
  numericSumKey,
  onViewRow,
  onAddNew,
  addNewLabel = "Add New",
  bulkActions,
  filterOptions,
}: EnterpriseDataGridProps<T>) {
  const effectiveRows: any[] = rows || data || [];
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  // Search filtering
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return effectiveRows;
    const q = searchQuery.toLowerCase();
    return effectiveRows.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    );
  }, [effectiveRows, searchQuery]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Paginated slice
  const paginatedRows = useMemo(() => {
    return sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        columns.map((c) => `"${c.label || c.header || ""}"`).join(","),
        ...sortedRows.map((row) =>
          columns
            .map((c) => {
              const key = (c.id || c.accessorKey) as string;
              const val = key ? row[key] : "";
              return `"${String(val ?? "").replace(/"/g, '""')}"`;
            })
            .join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title || "export"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
  };

  const handleExportExcel = () => {
    const dataToExport = sortedRows.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        const key = (col.id || col.accessorKey) as string;
        obj[col.label || col.header || key] = key ? row[key] : "";
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    XLSX.writeFile(workbook, `${title || "Export"}_${Date.now()}.xlsx`);
    setExportAnchorEl(null);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Header Controls Toolbar */}
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          borderBottom: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
        }}
      >
        {title && (
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
            {title}
          </Typography>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: "100%", alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9CA3AF", fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: "100%",
              minWidth: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "#F8FAFC",
                "& fieldset": { borderColor: "#E5E7EB" },
                "&:hover fieldset": { borderColor: "#CBD5E1" },
                "&.Mui-focused fieldset": { borderColor: "#2563EB" },
              },
            }}
          />

          {onRefresh && (
            <IconButton onClick={() => onRefresh()} size="small" sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}

          {onAddNew && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddNew}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {addNewLabel}
            </Button>
          )}

          {actionButton}

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: 2,
              borderColor: "#E5E7EB",
              color: "#374151",
              fontWeight: 600,
              "&:hover": { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" },
            }}
          >
            Export
          </Button>

          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
            slotProps={{ paper: { sx: { borderRadius: 2, mt: 1, minWidth: 140 } } }}
          >
            <MenuItem onClick={handleExportCSV}>Export CSV</MenuItem>
            <MenuItem onClick={handleExportExcel}>Export Excel (.xlsx)</MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Table Area */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="enterprise data table">
          <TableHead>
            <TableRow>
              {columns.map((col, idx) => {
                const colKey = (col.id || col.accessorKey || idx) as string;
                const isSorted = sortColumn === colKey;
                const align = col.align || (col.isNumeric ? "right" : "left");
                return (
                  <TableCell
                    key={colKey}
                    align={align}
                    style={{ minWidth: col.minWidth }}
                    onClick={() => col.sortable !== false && handleSort(colKey)}
                    sx={{
                      cursor: col.sortable !== false ? "pointer" : "default",
                      userSelect: "none",
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        justifyContent: align === "right" ? "flex-end" : "flex-start",
                      }}
                    >
                      <span>{col.label || col.header}</span>
                      {col.sortable !== false && isSorted && (
                        sortDirection === "asc" ? (
                          <ArrowUpwardIcon sx={{ fontSize: 14, color: "#2563EB" }} />
                        ) : (
                          <ArrowDownwardIcon sx={{ fontSize: 14, color: "#2563EB" }} />
                        )
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => (
                <TableRow
                  hover
                  key={(keyExtractor && keyExtractor(row)) || idx}
                  onClick={() => onViewRow && onViewRow(row)}
                  sx={{
                    cursor: onViewRow ? "pointer" : "default",
                    "&:hover": { backgroundColor: "#F8FAFC" },
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {columns.map((col, cIdx) => {
                    const colKey = (col.id || col.accessorKey || cIdx) as string;
                    const value = row[colKey];
                    const align = col.align || (col.isNumeric ? "right" : "left");
                    const content = col.cell
                      ? col.cell(row)
                      : col.format
                      ? col.format(value, row)
                      : value;

                    return (
                      <TableCell key={colKey} align={align} sx={{ py: 1.75, px: 2 }}>
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: "#6B7280", fontWeight: 500 }}>
                    No matching records found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Footer */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{
          borderTop: "1px solid #E5E7EB",
          color: "#4B5563",
          ".MuiTablePagination-select": { borderRadius: 1.5 },
        }}
      />
    </Paper>
  );
}

export const DataTable = EnterpriseDataGrid;
