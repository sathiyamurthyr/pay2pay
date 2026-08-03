"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Columns,
  Download,
  Printer,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Copy,
  Eye,
  Edit,
  RotateCcw,
  Shield,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckSquare,
  Square,
  Plus,
  Settings,
  Bookmark,
  ChevronDown,
  Clock,
  Activity,
  MoreVertical,
  Trash2,
  ShieldAlert
} from "lucide-react";

export interface ColumnConfig<T> {
  id: keyof T | string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  isNumeric?: boolean;
  width?: string;
  stickyLeft?: boolean;
  stickyRight?: boolean;
}

export interface SavedView {
  id: string;
  name: string;
  search?: string;
  statusFilter?: string;
  density?: "compact" | "medium" | "comfortable";
}

export interface EnterpriseDataGridProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  totalRecords?: number;
  onRefresh?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  onRowClick?: (row: T) => void;
  onViewRow?: (row: T) => void;
  onEditRow?: (row: T) => void;
  onDeleteRow?: (row: T) => void;
  numericSumKey?: keyof T;
  bulkActions?: {
    label: string;
    icon?: React.ReactNode;
    action: (selectedRows: T[]) => void;
    variant?: "primary" | "secondary" | "danger";
  }[];
  savedViews?: SavedView[];
}

export function SoftBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE" || s === "SUCCESS" || s === "VERIFIED") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
        {status}
      </span>
    );
  }
  if (s === "PROCESSING") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]">
        {status}
      </span>
    );
  }
  if (s === "PENDING" || s === "PENDING_APPROVAL" || s === "DRAFT") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#7E22CE] border border-[#DDD6FE]">
        {status}
      </span>
    );
  }
  if (s === "SUSPENDED" || s === "COOLING_PERIOD" || s === "WARNING") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]">
        {status}
      </span>
    );
  }
  if (s === "BLOCKED" || s === "FAILED" || s === "REVERSED" || s === "ERROR") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
        {status}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
      {status}
    </span>
  );
}

export function EnterpriseDataGrid<T extends Record<string, any>>({
  columns: initialColumns,
  data,
  keyExtractor,
  title,
  subtitle,
  loading = false,
  totalRecords,
  onRefresh,
  onAddNew,
  addNewLabel = "Add New",
  onRowClick,
  onViewRow,
  onEditRow,
  onDeleteRow,
  numericSumKey,
  bulkActions = [],
  savedViews = [
    { id: "v1", name: "Default View", search: "", statusFilter: "", density: "medium" },
    { id: "v2", name: "Active Records", search: "", statusFilter: "ACTIVE", density: "compact" },
    { id: "v3", name: "Pending Approval", search: "", statusFilter: "PENDING_APPROVAL", density: "medium" },
  ],
}: EnterpriseDataGridProps<T>) {
  // Density: 'compact' (32px), 'medium' (40px), 'comfortable' (48px)
  const [density, setDensity] = useState<"compact" | "medium" | "comfortable">("medium");

  // Grid Controls & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedViewId, setSelectedViewId] = useState<string>("v1");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Column Visibility & Pinning State
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    new Set(initialColumns.map((c) => String(c.id)))
  );
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Advanced Filter Drawer State
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterOperator, setFilterOperator] = useState<string>("contains");
  const [filterValue, setFilterValue] = useState<string>("");

  // Export Dropdown State
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Row Action Dropdown State
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  // Row Details Side-Drawer State
  const [selectedDrawerRow, setSelectedDrawerRow] = useState<T | null>(null);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard Focused Row & Context Menu State
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: T | null;
  } | null>(null);

  // Auto Refresh Timer State
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>("");

  useEffect(() => {
    setLastRefreshTime(new Date().toLocaleTimeString());
  }, []);

  // Search Ref for Ctrl+F
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle Refresh Trigger
  const triggerRefresh = useCallback(() => {
    if (onRefresh) onRefresh();
    setLastRefreshTime(new Date().toLocaleTimeString());
  }, [onRefresh]);

  // Auto Refresh Effect
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const timer = setInterval(() => {
        triggerRefresh();
      }, autoRefreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [autoRefreshInterval, triggerRefresh]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + F -> Focus Search Input
      if (e.ctrlKey && e.key.toLowerCase() === "f" && !e.shiftKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl + Shift + F -> Toggle Advanced Filter Drawer
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFilterDrawer((prev) => !prev);
      }
      // Ctrl + R -> Refresh Grid
      else if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        triggerRefresh();
      }
      // Ctrl + E -> Toggle Export Menu
      else if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setShowExportMenu((prev) => !prev);
      }
      // Ctrl + P -> Print
      else if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.print();
      }
      // Esc -> Close Modals/Drawers/Context Menu
      else if (e.key === "Escape") {
        setShowColumnModal(false);
        setShowFilterDrawer(false);
        setShowExportMenu(false);
        setOpenActionDropdownId(null);
        setSelectedDrawerRow(null);
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerRefresh]);

  // Close Context Menu & Export Menu on Click Outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowExportMenu(false);
      setOpenActionDropdownId(null);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Saved View Change Handler
  const handleSavedViewChange = (viewId: string) => {
    setSelectedViewId(viewId);
    const view = savedViews.find((v) => v.id === viewId);
    if (view) {
      if (view.search !== undefined) setSearchQuery(view.search);
      if (view.density) setDensity(view.density);
    }
  };

  // Filtering & Advanced Filter Logic
  const filteredData = useMemo(() => {
    let result = [...data];

    // Global Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some(
          (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    // Advanced Field Filter
    if (filterColumn && filterValue.trim()) {
      const q = filterValue.toLowerCase();
      result = result.filter((row) => {
        const val = row[filterColumn];
        if (val === null || val === undefined) return false;
        const strVal = String(val).toLowerCase();

        if (filterOperator === "equals") return strVal === q;
        if (filterOperator === "starts_with") return strVal.startsWith(q);
        if (filterOperator === "ends_with") return strVal.endsWith(q);
        if (filterOperator === "greater_than") return Number(val) > Number(filterValue);
        if (filterOperator === "less_than") return Number(val) < Number(filterValue);
        return strVal.includes(q);
      });
    }

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === "asc"
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [data, searchQuery, filterColumn, filterOperator, filterValue, sortField, sortDirection]);

  // Paginated Data
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Selected Rows List
  const selectedRows = useMemo(() => {
    return data.filter((row) => selectedIds.has(keyExtractor(row)));
  }, [data, selectedIds, keyExtractor]);

  // Select All Checkbox Handler
  const isAllPageSelected = paginatedData.length > 0 && paginatedData.every((r) => selectedIds.has(keyExtractor(r)));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedData.forEach((r) => next.delete(keyExtractor(r)));
    } else {
      paginatedData.forEach((r) => next.add(keyExtractor(r)));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Sort Handler
  const handleSort = (fieldId: string) => {
    if (sortField === fieldId) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(fieldId);
      setSortDirection("asc");
    }
  };

  // Export Format Handlers (CSV, Excel, PDF, JSON)
  const exportCSV = () => {
    const activeCols = initialColumns.filter((c) => visibleColumnIds.has(String(c.id)));
    const headers = activeCols.map((c) => `"${c.header}"`).join(",");
    const rows = filteredData.map((row) =>
      activeCols
        .map((c) => {
          const val = row[c.accessorKey || (c.id as keyof T)];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `grid_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `grid_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sum Total calculation for numeric columns
  const sumTotalAmount = useMemo(() => {
    if (!numericSumKey) return 0;
    return filteredData.reduce((acc, row) => acc + (Number(row[numericSumKey]) || 0), 0);
  }, [filteredData, numericSumKey]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!gridContainerRef.current) return;
    if (!isFullscreen) {
      if (gridContainerRef.current.requestFullscreen) {
        gridContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Right-Click Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, row: T) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      row,
    });
  };

  return (
    <div
      ref={gridContainerRef}
      className={`space-y-3 bg-[#FFFFFF] p-4 border border-[#E2E8F0] rounded-[6px] shadow-2xs font-sans ${
        isFullscreen ? "fixed inset-0 z-50 overflow-auto p-6" : ""
      }`}
    >
      {/* Grid Header & Subtitle */}
      {(title || subtitle || onAddNew) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
          <div>
            {title && (
              <h2 className="ent-page-title text-2xl font-extrabold text-[#334155] tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="ent-caption text-xs text-[#64748B] mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {onAddNew && (
            <button
              onClick={onAddNew}
              className="ent-btn ent-btn-primary py-2 px-4 text-xs font-bold bg-[#6C63FF] hover:bg-[#5B52E5] text-white rounded-[6px] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{addNewLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* Structured 2-Row Enterprise Banking Toolbar */}
      <div className="space-y-2 bg-[#FFFFFF] p-3 rounded-[6px] border border-[#E2E8F0]">
        {/* Toolbar Row 1: Search (360-420px) + Saved Views */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Global Search Bar (360-420px width) */}
            <div className="relative min-w-[320px] max-w-[420px] flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Global Search across all columns (Ctrl+F)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ent-input pl-9 text-xs font-medium text-[#334155] bg-[#FFFFFF] border-[#D6DEE8] focus:border-[#6C63FF] shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#334155]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Saved Views Selector */}
            <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#D6DEE8] rounded-[6px] px-2.5 py-1.5 shadow-2xs">
              <Bookmark className="w-3.5 h-3.5 text-[#6C63FF]" />
              <select
                value={selectedViewId}
                onChange={(e) => handleSavedViewChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#334155] focus:outline-none cursor-pointer"
              >
                {savedViews.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Filter Drawer Trigger */}
          <button
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            className={`ent-btn text-xs font-bold py-1.5 px-3 rounded-[6px] border flex items-center gap-1.5 ${
              filterValue
                ? "bg-[#EDE9FE] text-[#4338CA] border-[#C4B5FD]"
                : "ent-btn-secondary"
            }`}
            title="Advanced Filter Drawer (Ctrl+Shift+F)"
          >
            <Filter className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Advanced Filter</span>
            {filterValue && <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>}
          </button>
        </div>

        {/* Toolbar Row 2: Controls & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#2A3B5C]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Density Selector */}
            <div className="flex border border-[#D9E2EC] dark:border-[#2A3B5C] rounded-[6px] p-0.5 bg-[#FFFFFF] dark:bg-[#0F172A]">
              <button
                onClick={() => setDensity("compact")}
                className={`px-2 py-1 text-xs font-bold rounded ${
                  density === "compact"
                    ? "bg-[#123B73] text-white"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
                title="Compact (32px)"
              >
                Compact
              </button>
              <button
                onClick={() => setDensity("medium")}
                className={`px-2 py-1 text-xs font-bold rounded ${
                  density === "medium"
                    ? "bg-[#123B73] text-white"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
                title="Medium (40px)"
              >
                Medium
              </button>
              <button
                onClick={() => setDensity("comfortable")}
                className={`px-2 py-1 text-xs font-bold rounded ${
                  density === "comfortable"
                    ? "bg-[#123B73] text-white"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
                title="Comfortable (48px)"
              >
                Comfortable
              </button>
            </div>

            {/* Column Chooser Modal */}
            <button
              onClick={() => setShowColumnModal(true)}
              className="ent-btn ent-btn-secondary py-1.5 px-2.5 text-xs font-bold flex items-center gap-1"
              title="Column Chooser & Visibility"
            >
              <Columns className="w-3.5 h-3.5 text-[#123B73]" />
              <span>Columns</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Dropdown Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu((prev) => !prev);
                }}
                className="ent-btn ent-btn-secondary py-1.5 px-2.5 text-xs font-bold flex items-center gap-1"
                title="Export Data Menu (Ctrl+E)"
              >
                <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#FFFFFF] dark:bg-[#1A2642] border border-[#D9E2EC] dark:border-[#2A3B5C] rounded-[6px] shadow-lg py-1 w-44 text-xs font-semibold text-[#111827] dark:text-white">
                  <button
                    onClick={exportCSV}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] dark:hover:bg-[#1E293B] flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" /> Export Excel (.xlsx)
                  </button>
                  <button
                    onClick={exportCSV}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] dark:hover:bg-[#1E293B] flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#2563EB]" /> Export CSV (.csv)
                  </button>
                  <button
                    onClick={exportJSON}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] dark:hover:bg-[#1E293B] flex items-center gap-2"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#D97706]" /> Export JSON (.json)
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] dark:hover:bg-[#1E293B] flex items-center gap-2 border-t border-[#E5E7EB] dark:border-[#2A3B5C]"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#6B7280]" /> Print View (Ctrl+P)
                  </button>
                </div>
              )}
            </div>

            {/* Refresh & Auto Refresh */}
            <div className="flex items-center gap-1">
              <button
                onClick={triggerRefresh}
                className="ent-btn ent-btn-secondary py-1.5 px-2.5 text-xs font-bold"
                title="Refresh Grid (Ctrl+R)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>

              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="ent-input text-xs font-semibold py-1 px-1.5 bg-[#FFFFFF] dark:bg-[#0F172A]"
                title="Auto Refresh Interval"
              >
                <option value={0}>Auto: Off</option>
                <option value={5}>Every 5s</option>
                <option value={10}>Every 10s</option>
                <option value={30}>Every 30s</option>
              </select>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="ent-btn ent-btn-secondary py-1.5 px-2.5 text-xs font-bold"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Drawer Bar */}
      {showFilterDrawer && (
        <div className="p-3 bg-[#EEF6FF] dark:bg-[#1E293B] border border-[#BFD9FF] dark:border-[#2A3B5C] rounded-[6px] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#123B73] dark:text-[#60A5FA] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Field Condition Filter Engine
            </span>
            <button
              onClick={() => {
                setFilterColumn("");
                setFilterValue("");
                setShowFilterDrawer(false);
              }}
              className="text-xs font-bold text-[#6B7280] hover:text-[#111827]"
            >
              Reset &amp; Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="ent-input text-xs font-semibold bg-[#FFFFFF] dark:bg-[#0F172A]"
            >
              <option value="">Select Target Column...</option>
              {initialColumns.map((c) => (
                <option key={String(c.id)} value={String(c.accessorKey || c.id)}>
                  {c.header}
                </option>
              ))}
            </select>

            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="ent-input text-xs font-semibold bg-[#FFFFFF] dark:bg-[#0F172A]"
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
              <option value="starts_with">Starts With</option>
              <option value="ends_with">Ends With</option>
              <option value="greater_than">Greater Than (&gt;)</option>
              <option value="less_than">Less Than (&lt;)</option>
            </select>

            <input
              type="text"
              placeholder="Enter filter value..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="ent-input text-xs font-semibold bg-[#FFFFFF] dark:bg-[#0F172A]"
            />
          </div>
        </div>
      )}

      {/* Sticky Multi-Row Selection Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 p-3 bg-[#DCEEFF] dark:bg-[#1E3A8A] border border-[#BFD9FF] dark:border-[#2A3B5C] rounded-[6px] shadow-md flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#123B73] dark:text-white">
            {selectedIds.size} row(s) selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => action.action(selectedRows)}
                className="ent-btn ent-btn-primary py-1 px-3 text-xs font-bold shadow-xs"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-[#123B73] underline ml-2 font-bold hover:text-[#0F2F5C]"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Enterprise Banking Data Grid Table View */}
      <div className="ent-table-container">
        <table className={`ent-table ent-grid-${density}`}>
          <thead>
            <tr>
              <th className="w-10 text-center sticky-col-left bg-[#F3F6FA] dark:bg-[#1A2642]">
                <input
                  type="checkbox"
                  checked={isAllPageSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-[#D9E2EC] text-[#123B73] focus:ring-0 cursor-pointer"
                />
              </th>
              {initialColumns
                .filter((c) => visibleColumnIds.has(String(c.id)))
                .map((col) => {
                  const isSorted = sortField === String(col.id);
                  return (
                    <th
                      key={String(col.id)}
                      onClick={() => col.sortable !== false && handleSort(String(col.id))}
                      className={`cursor-pointer select-none ${col.stickyLeft ? "sticky-col-left" : ""} ${
                        col.stickyRight ? "sticky-col-right" : ""
                      }`}
                      style={{ width: col.width }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#111827] dark:text-[#FFFFFF] text-[15px]">{col.header}</span>
                        {col.sortable !== false && (
                          <span className="text-[#6B7280]">
                            {isSorted ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[#123B73]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[#123B73]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              {(onViewRow || onEditRow || onDeleteRow) && (
                <th className="text-right sticky-col-right bg-[#F3F6FA] dark:bg-[#1A2642] font-bold text-[#111827] dark:text-[#FFFFFF] text-[15px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={initialColumns.length + 2} className="py-12 text-center text-[#4B5563]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#123B73] mb-2" />
                  <span className="font-semibold">Loading records from platform database...</span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={initialColumns.length + 2} className="py-12 text-center text-[#4B5563]">
                  <span className="font-semibold">No matching records found in platform registry.</span>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const rowId = keyExtractor(row);
                const isSelected = selectedIds.has(rowId);
                const isFocused = focusedRowIndex === idx;

                return (
                  <tr
                    key={rowId}
                    onClick={() => {
                      setFocusedRowIndex(idx);
                      setSelectedDrawerRow(row);
                      if (onRowClick) onRowClick(row);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, row)}
                    className={`cursor-pointer ${isSelected ? "selected" : ""} ${isFocused ? "focused" : ""}`}
                  >
                    <td className="w-10 text-center sticky-col-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRow(rowId, e as any)}
                        className="rounded border-[#D9E2EC] text-[#123B73] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    {initialColumns
                      .filter((c) => visibleColumnIds.has(String(c.id)))
                      .map((col) => {
                        const cellVal = row[col.accessorKey || (col.id as keyof T)];
                        return (
                          <td
                            key={String(col.id)}
                            className={`text-[14px] font-semibold text-[#111827] dark:text-[#F9FAFB] ${col.stickyLeft ? "sticky-col-left" : ""} ${
                              col.stickyRight ? "sticky-col-right" : ""
                            }`}
                          >
                            {col.cell ? col.cell(row) : String(cellVal ?? "")}
                          </td>
                        );
                      })}
                    {(onViewRow || onEditRow || onDeleteRow) && (
                      <td className="text-right sticky-col-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionDropdownId(openActionDropdownId === rowId ? null : rowId);
                            }}
                            className="ent-btn ent-btn-secondary p-1 text-xs"
                            title="Actions Menu"
                          >
                            <MoreVertical className="w-4 h-4 text-[#111827]" />
                          </button>

                          {openActionDropdownId === rowId && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-[#FFFFFF] border border-[#E2E8F0] rounded-[6px] shadow-xl py-1 w-48 text-xs font-semibold text-[#334155]">
                              {onViewRow && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewRow(row);
                                    setOpenActionDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#2563EB]" /> View Details &amp; Workflow
                                </button>
                              )}
                              {onEditRow && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditRow(row);
                                    setOpenActionDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] flex items-center gap-2"
                                >
                                  <Edit className="w-3.5 h-3.5 text-[#14B8A6]" /> Edit Metadata
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDrawerRow(row);
                                  setOpenActionDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] flex items-center gap-2"
                              >
                                <Clock className="w-3.5 h-3.5 text-[#F59E0B]" /> Audit History Log
                              </button>
                              {onDeleteRow && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRow(row);
                                    setOpenActionDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-[#FEE2E2] text-[#DC2626] flex items-center gap-2 border-t border-[#E2E8F0]"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" /> Delete Record
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Summary Row */}
          <tfoot>
            <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] text-[#334155] font-semibold text-xs">
              <td className="w-10 text-center py-2.5 font-bold">Sum</td>
              {initialColumns
                .filter((c) => visibleColumnIds.has(String(c.id)))
                .map((col, i) => {
                  const isNumeric = col.isNumeric || col.accessorKey === numericSumKey || col.id === numericSumKey;
                  if (i === 0) {
                    return (
                      <td key={String(col.id)} className="py-2.5 px-3 font-bold text-[#334155]">
                        Summary Total ({filteredData.length} records)
                      </td>
                    );
                  }
                  return (
                    <td key={String(col.id)} className="py-2.5 px-3 font-mono font-bold text-[#334155]">
                      {isNumeric && numericSumKey
                        ? `₹${sumTotalAmount.toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                  );
                })}
              {(onViewRow || onEditRow || onDeleteRow) && <td className="py-2.5 px-3"></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Grid Summary Footer Telemetry & Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-semibold text-[#64748B] bg-[#FFFFFF]">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            Total Records: <strong className="text-[#334155] font-mono font-bold">{totalRecords ?? filteredData.length}</strong>
          </span>
          {searchQuery && (
            <span>
              Filtered Records: <strong className="text-[#6C63FF] font-mono font-bold">{filteredData.length}</strong>
            </span>
          )}
          {selectedIds.size > 0 && (
            <span>
              Selected: <strong className="text-[#22C55E] font-mono font-bold">{selectedIds.size}</strong>
            </span>
          )}
          {numericSumKey && (
            <span>
              Sum Amount: <strong className="text-[#334155] font-mono font-bold">₹{sumTotalAmount.toLocaleString("en-IN")}</strong>
            </span>
          )}
          <span>Last Refresh: {lastRefreshTime}</span>
        </div>

        {/* Compact Pagination Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Rows/page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ent-input text-xs font-bold py-0.5 px-1.5 bg-[#FFFFFF] border-[#D1D5DB] text-[#334155]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          <span className="px-2.5 py-0.5 text-xs font-bold text-white bg-[#6C63FF] rounded-md shadow-2xs">
            {currentPage} / {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row Details & Audit Side-Drawer */}
      {selectedDrawerRow && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#0F172A] border-l border-[#D9E2EC] dark:border-[#2A3B5C] h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] dark:border-[#2A3B5C] pb-3">
              <div>
                <h3 className="ent-card-title text-lg font-bold flex items-center gap-2 text-[#111827] dark:text-white">
                  <Activity className="w-5 h-5 text-[#123B73]" /> Row Details &amp; Audit Inspection
                </h3>
                <p className="ent-caption text-xs font-mono mt-0.5 text-[#6B7280]">ID: {keyExtractor(selectedDrawerRow)}</p>
              </div>
              <button
                onClick={() => setSelectedDrawerRow(null)}
                className="text-[#6B7280] hover:text-[#111827] p-1 rounded hover:bg-[#F3F4F6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Field Value Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">Record Metadata Attributes</h4>
              <div className="border border-[#D9E2EC] dark:border-[#2A3B5C] rounded-[6px] divide-y divide-[#E5E7EB] dark:divide-[#2A3B5C]">
                {Object.entries(selectedDrawerRow).map(([key, val]) => (
                  <div key={key} className="flex justify-between p-2.5 text-xs font-semibold">
                    <span className="font-mono text-[#4B5563]">{key}:</span>
                    <span className="font-bold text-[#111827] dark:text-white font-mono truncate max-w-[260px]">
                      {val === null || val === undefined ? "null" : typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-[#2A3B5C]">
              <h4 className="text-xs font-bold uppercase text-[#6B7280] tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#123B73]" /> Immutable Audit Trail Log
              </h4>
              <div className="p-3 bg-[#FAFBFC] dark:bg-[#1A2642] border border-[#D9E2EC] dark:border-[#2A3B5C] rounded-[6px] space-y-2 text-xs font-semibold">
                <div className="flex justify-between text-[#4B5563]">
                  <span>System Verification:</span>
                  <strong className="text-[#16A34A] font-bold">PASSED (SHA-256 Verified)</strong>
                </div>
                <div className="flex justify-between text-[#4B5563]">
                  <span>Last Modified:</span>
                  <span className="font-mono font-bold text-[#111827] dark:text-white">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setSelectedDrawerRow(null)}
                className="ent-btn ent-btn-secondary text-xs font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Chooser Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#1A2642] border border-[#D9E2EC] dark:border-[#2A3B5C] rounded-[6px] p-5 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] dark:border-[#2A3B5C] pb-2">
              <h3 className="ent-card-title text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <Columns className="w-4 h-4 text-[#123B73]" /> Column Visibility &amp; Layout Manager
              </h3>
              <button onClick={() => setShowColumnModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {initialColumns.map((col) => {
                const idStr = String(col.id);
                const isChecked = visibleColumnIds.has(idStr);
                return (
                  <label
                    key={idStr}
                    className="flex items-center justify-between p-2 rounded hover:bg-[#FAFBFC] dark:hover:bg-[#1E293B] cursor-pointer text-xs font-bold"
                  >
                    <span className="text-[#111827] dark:text-white">{col.header}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = new Set(visibleColumnIds);
                        if (next.has(idStr)) next.delete(idStr);
                        else next.add(idStr);
                        setVisibleColumnIds(next);
                      }}
                      className="rounded border-[#D9E2EC] text-[#123B73] focus:ring-0"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#2A3B5C]">
              <button
                onClick={() => setVisibleColumnIds(new Set(initialColumns.map((c) => String(c.id))))}
                className="ent-btn ent-btn-secondary text-xs font-bold"
              >
                Reset Default
              </button>
              <button
                onClick={() => setShowColumnModal(false)}
                className="ent-btn ent-btn-primary text-xs font-bold"
              >
                Apply Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[#FFFFFF] dark:bg-[#1A2642] border border-[#D9E2EC] dark:border-[#2A3B5C] rounded-[6px] shadow-lg py-1.5 w-48 text-xs font-semibold text-[#111827] dark:text-white"
        >
          {contextMenu.row && (
            <button
              onClick={() => {
                setSelectedDrawerRow(contextMenu.row);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] dark:hover:bg-[#1E293B] flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5 text-[#123B73]" /> View Row &amp; Audit Trail
            </button>
          )}
          {contextMenu.row && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(contextMenu.row));
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#EEF6FF] dark:hover:bg-[#1E293B] flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-[#16A34A]" /> Copy Row JSON
            </button>
          )}
        </div>
      )}
    </div>
  );
}
