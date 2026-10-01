"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  Search,
  Filter,
  Columns,
  Download,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Check,
  ChevronDown,
  FileText,
  FileCode,
  Printer,
  CheckSquare,
  Square,
  Clock,
  LayoutList,
  AlignJustify,
  List,
  Settings2,
  Mail,
  MessageSquare,
  Share2,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

export interface TableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  align?: "left" | "center" | "right";
  sticky?: "left" | "right";
  hidden?: boolean;
}

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  totalRecords?: number;
  pageSize?: number;
  onRefresh?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => ReactNode;
  bulkActions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: (rows: T[]) => void;
    variant?: "primary" | "danger" | "secondary";
    disabled?: (rows: T[]) => boolean;
  }>;
  searchPlaceholder?: string;
  filterOptions?: Array<{
    key: string;
    label: string;
    options: Array<{ label: string; value: string }>;
  }>;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

type Density = "compact" | "medium" | "comfortable";
type SortDir = "asc" | "desc" | null;

const DENSITY_CONFIG: Record<Density, { rowH: string; fontSize: string; label: string; icon: ReactNode }> = {
  compact:     { rowH: "h-8",  fontSize: "text-[12px]", label: "Compact",     icon: <List className="w-3.5 h-3.5" /> },
  medium:      { rowH: "h-10", fontSize: "text-[13px]", label: "Medium",      icon: <AlignJustify className="w-3.5 h-3.5" /> },
  comfortable: { rowH: "h-12", fontSize: "text-[14px]", label: "Comfortable", icon: <LayoutList className="w-3.5 h-3.5" /> },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ──────────────────────────────────────────────────────────────────
// Skeleton Row
// ──────────────────────────────────────────────────────────────────
const SkeletonRow: React.FC<{ cols: number; density: Density }> = ({ cols, density }) => {
  const heights: Record<Density, string> = { compact: "h-3", medium: "h-3.5", comfortable: "h-4" };
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2 sticky left-0 bg-white">
        <div className="w-4 h-4 bg-[#E5E7EB] rounded" />
      </td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div className={`${heights[density]} bg-[#E5E7EB] rounded ${i === 0 ? "w-3/4" : "w-1/2"}`} />
          {i === 0 && <div className={`${heights[density]} bg-[#F3F4F6] rounded w-1/3 mt-1.5`} />}
        </td>
      ))}
      <td className="px-3 py-2 sticky right-0 bg-white">
        <div className="w-6 h-6 bg-[#E5E7EB] rounded" />
      </td>
    </tr>
  );
};

// ──────────────────────────────────────────────────────────────────
// Empty State
// ──────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ message?: string; icon?: ReactNode; onClear?: () => void }> = ({
  message = "No records found",
  icon,
  onClear,
}) => (
  <tr>
    <td colSpan={999}>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        {icon ?? (
          <div className="w-12 h-12 rounded-full bg-[#F3F6FA] flex items-center justify-center">
            <Search className="w-5 h-5 text-[#9CA3AF]" />
          </div>
        )}
        <p className="text-[14px] font-semibold text-[#374151]">{message}</p>
        <p className="text-[12px] text-[#9CA3AF]">Try adjusting your search or filter criteria.</p>
        {onClear && (
          <button
            onClick={onClear}
            className="mt-2 px-4 py-1.5 text-[12px] font-semibold text-[#2563EB] bg-[#EFF6FF] rounded-md hover:bg-[#DBEAFE] transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    </td>
  </tr>
);

// ──────────────────────────────────────────────────────────────────
// Main DataTable Component
// ──────────────────────────────────────────────────────────────────
export function DataTable<T = any>({
  data,
  columns,
  keyExtractor,
  loading = false,
  totalRecords,
  pageSize: initialPageSize = 10,
  onRefresh,
  onAddNew,
  addNewLabel = "Add New",
  onRowClick,
  renderRowActions,
  bulkActions = [],
  searchPlaceholder = "Search records… (Ctrl+K)",
  filterOptions = [],
  emptyMessage,
  emptyIcon,
}: DataTableProps<T>) {

  // ── State ──
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [density, setDensity] = useState<Density>("medium");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Keyboard shortcut Ctrl+K ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Auto-refresh ──
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        handleRefresh();
      }, 30000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh]);

  // ── Fullscreen ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // ── Derived: visible columns ──
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.has(c.id) && !c.hidden),
    [columns, hiddenColumns]
  );

  // ── Derived: filter chips ──
  const filterChips: FilterChip[] = useMemo(() =>
    Object.entries(activeFilters)
      .filter(([, v]) => v)
      .map(([key, value]) => {
        const filter = filterOptions.find((f) => f.key === key);
        const option = filter?.options.find((o) => o.value === value);
        return {
          key,
          label: filter?.label ?? key,
          value: option?.label ?? value,
        };
      }),
    [activeFilters, filterOptions]
  );

  // ── Derived: sorted + filtered rows ──
  const processedRows = useMemo(() => {
    let rows = [...data];

    // Global search (deep recursive string match)
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchValue = (val: unknown): boolean => {
        if (val === null || val === undefined) return false;
        if (typeof val === "object") {
          return Object.values(val as Record<string, unknown>).some(matchValue);
        }
        return String(val).toLowerCase().includes(q);
      };
      rows = rows.filter((row) => Object.values(row as any).some(matchValue));
    }

    // Active filters
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (!val) return;
      rows = rows.filter((row) => String((row as Record<string, unknown>)[key] ?? "").toUpperCase() === val.toUpperCase());
    });

    // Sort
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const aVal = String(a[sortCol as keyof T] ?? "");
        const bVal = String(b[sortCol as keyof T] ?? "");
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, search, activeFilters, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const paginatedRows = processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ── Handlers ──
  const handleSort = useCallback((colId: string) => {
    setSortCol((prev) => {
      if (prev !== colId) { setSortDir("asc"); return colId; }
      setSortDir((d) => {
        if (d === "asc") return "desc";
        if (d === "desc") { return null; }
        return "asc";
      });
      return prev;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedKeys.size === paginatedRows.length && paginatedRows.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(paginatedRows.map(keyExtractor)));
    }
  }, [selectedKeys, paginatedRows, keyExtractor]);

  const handleSelectRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setLastRefreshed(new Date());
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [onRefresh]);

  const handleClearSearch = () => { setSearch(""); setCurrentPage(1); };

  const removeFilterChip = (key: string) => {
    setActiveFilters((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setActiveFilters({});
    setCurrentPage(1);
  };

  const handleExport = (format: string) => {
    setShowExport(false);
    const rows = selectedKeys.size > 0
      ? processedRows.filter((r) => selectedKeys.has(keyExtractor(r)))
      : processedRows;

    if (format === "csv") {
      const headers = visibleColumns.filter((c) => c.accessorKey).map((c) => c.header);
      const csvRows = rows.map((r) =>
        visibleColumns
          .filter((c) => c.accessorKey)
          .map((c) => `"${String(r[c.accessorKey as keyof T] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
      const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "export.csv"; a.click();
      URL.revokeObjectURL(url);
    }
    if (format === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "export.json"; a.click();
      URL.revokeObjectURL(url);
    }
    if (format === "print") {
      window.print();
    }
    if (format === "whatsapp") {
      const text = `📊 Pay2Pay Report: ${document.title}\n📍 Page Link: ${window.location.href}\n🔢 Total Records: ${rows.length}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
    if (format === "email") {
      const subject = encodeURIComponent(`Pay2Pay Data Report - ${document.title}`);
      const body = encodeURIComponent(`Hello,\n\nPlease find the Pay2Pay data report summary below:\n\nTitle: ${document.title}\nTotal Records: ${rows.length}\nDirect Page Link: ${window.location.href}\n\nRegards,\nPay2Pay Enterprise Portal`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    }
    if (format === "link") {
      navigator.clipboard.writeText(window.location.href);
      alert("🔗 Direct page report link copied to clipboard!");
    }
  };

  const selectedRows = useMemo(
    () => processedRows.filter((r) => selectedKeys.has(keyExtractor(r))),
    [processedRows, selectedKeys, keyExtractor]
  );

  const allSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedKeys.has(keyExtractor(r)));
  const someSelected = selectedKeys.size > 0 && !allSelected;

  const densityConf = DENSITY_CONFIG[density];

  // ── Render ──
  return (
    <div
      ref={containerRef}
      className={`
        flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden
        shadow-2xs
        ${isFullscreen ? "fixed inset-0 z-[200] rounded-none border-0 shadow-none" : ""}
      `}
    >
      {/* ── TOOLBAR ROW 1 ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E2E8F0] bg-white">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
          <input
            ref={searchRef}
            id="dt-global-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={searchPlaceholder}
            aria-label="Search all records"
            className="
              w-full pl-8 pr-8 py-1.5 text-[13px] font-medium
              bg-white border border-[#D6DEE8] rounded-md
              text-[#334155] placeholder-[#94A3B8]
              focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20
              transition-all duration-150
            "
          />
          {search && (
            <button
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter button */}
        {filterOptions.length > 0 && (
          <button
            id="dt-advanced-filter"
            onClick={() => setShowFilterDrawer((p) => !p)}
            aria-label="Open advanced filters"
            aria-pressed={showFilterDrawer}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md border
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40
              ${filterChips.length > 0
                ? "bg-[#EDE9FE] border-[#C4B5FD] text-[#4338CA]"
                : "bg-white border-[#D1D5DB] text-[#475569] hover:bg-[#F8FAFC]"
              }
            `}
          >
            <Filter className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Filter</span>
            {filterChips.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#6C63FF] text-white text-[10px] flex items-center justify-center font-bold">
                {filterChips.length}
              </span>
            )}
          </button>
        )}

        {/* Density Chooser */}
        <div className="relative">
          <button
            id="dt-density"
            onClick={() => { setShowDensity((p) => !p); setShowColumnChooser(false); setShowExport(false); }}
            aria-label="Change row density"
            aria-haspopup="menu"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-[#475569] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F8FAFC] transition-colors"
          >
            {densityConf.icon}
            <span>{densityConf.label}</span>
          </button>
          {showDensity && (
            <div role="menu" className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 min-w-[140px]">
              {(["compact", "medium", "comfortable"] as Density[]).map((d) => (
                <button
                  key={d}
                  role="menuitem"
                  onClick={() => { setDensity(d); setShowDensity(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium transition-colors ${density === d ? "bg-[#EDE9FE] text-[#4338CA] font-semibold" : "text-[#475569] hover:bg-[#EEF6FF]"}`}
                >
                  {DENSITY_CONFIG[d].icon}
                  {DENSITY_CONFIG[d].label}
                  {density === d && <Check className="w-3.5 h-3.5 ml-auto text-[#6C63FF]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column Chooser */}
        <div className="relative">
          <button
            id="dt-column-chooser"
            onClick={() => { setShowColumnChooser((p) => !p); setShowExport(false); setShowDensity(false); }}
            aria-label="Toggle column visibility"
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-[#475569] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F8FAFC] transition-colors"
          >
            <Columns className="w-3.5 h-3.5 text-[#6C63FF]" />
            Columns
          </button>
          {showColumnChooser && (
            <div role="dialog" aria-label="Column chooser" className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-2 min-w-[200px]">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] border-b border-[#E2E8F0]">
                Visible Columns
              </p>
              <div className="max-h-56 overflow-y-auto py-1">
                {columns.filter((c) => !c.hidden).map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setHiddenColumns((prev) => {
                      const n = new Set(prev);
                      if (n.has(col.id)) n.delete(col.id); else n.add(col.id);
                      return n;
                    })}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-[#334155] font-medium hover:bg-[#EEF6FF] transition-colors text-left"
                  >
                    {hiddenColumns.has(col.id)
                      ? <Square className="w-3.5 h-3.5 text-[#CBD5E1]" />
                      : <CheckSquare className="w-3.5 h-3.5 text-[#6C63FF]" />
                    }
                    {col.header}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export Menu */}
        <div className="relative">
          <button
            id="dt-export"
            onClick={() => { setShowExport((p) => !p); setShowColumnChooser(false); setShowDensity(false); }}
            aria-label="Export data"
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-[#475569] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F8FAFC] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#22C55E]" />
            Export
            <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
          </button>
          {showExport && (
            <div role="menu" className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 min-w-[180px]">
              {[
                { fmt: "excel",    label: "Export Excel (.xlsx)", icon: <FileText className="w-3.5 h-3.5 text-[#16A34A]" /> },
                { fmt: "csv",      label: "Export CSV (.csv)",     icon: <FileText className="w-3.5 h-3.5 text-[#22C55E]" /> },
                { fmt: "json",     label: "Export JSON (.json)",   icon: <FileCode className="w-3.5 h-3.5 text-[#F59E0B]" /> },
                { fmt: "print",    label: "Print / Export PDF",   icon: <Printer className="w-3.5 h-3.5 text-[#DC2626]" /> },
                { fmt: "whatsapp", label: "Share to WhatsApp",    icon: <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" /> },
                { fmt: "email",    label: "Share via Email",      icon: <Mail className="w-3.5 h-3.5 text-[#2563EB]" /> },
                { fmt: "link",     label: "Copy Shareable Link",  icon: <Share2 className="w-3.5 h-3.5 text-[#7C3AED]" /> },
              ].map(({ fmt, label, icon }) => (
                <button
                  key={fmt}
                  role="menuitem"
                  onClick={() => handleExport(fmt)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

        {/* Refresh */}
        <button
          id="dt-refresh"
          onClick={handleRefresh}
          aria-label="Refresh data"
          className="p-1.5 rounded-md text-[#64748B] hover:text-[#334155] hover:bg-[#F8FAFC] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>

        {/* Auto-refresh toggle */}
        <button
          id="dt-auto-refresh"
          onClick={() => setAutoRefresh((p) => !p)}
          aria-label={`Auto-refresh: ${autoRefresh ? "On" : "Off"}`}
          aria-pressed={autoRefresh}
          className={`
            inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border
            transition-colors
            ${autoRefresh
              ? "bg-[#EDE9FE] border-[#C4B5FD] text-[#4338CA]"
              : "bg-white border-[#D1D5DB] text-[#94A3B8] hover:text-[#334155]"
            }
          `}
        >
          <Clock className="w-3 h-3" />
          Auto
        </button>

        {/* Fullscreen */}
        <button
          id="dt-fullscreen"
          onClick={() => setIsFullscreen((p) => !p)}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="p-1.5 rounded-md text-[#64748B] hover:text-[#334155] hover:bg-[#F8FAFC] transition-colors"
        >
          {isFullscreen
            ? <Minimize2 className="w-3.5 h-3.5" />
            : <Maximize2 className="w-3.5 h-3.5" />
          }
        </button>

        <div className="flex-1" />

        {/* Add New Button if supplied */}
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[#6C63FF] hover:bg-[#5B52E5] rounded-md transition-colors shadow-2xs"
          >
            {addNewLabel}
          </button>
        )}

        {/* Total count */}
        <span className="text-[11px] font-medium text-[#94A3B8] whitespace-nowrap">
          {processedRows.length.toLocaleString()} records
        </span>
      </div>

      {/* ── FILTER CHIPS ── */}
      {filterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Active filters:</span>
          {filterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#EDE9FE] border border-[#C4B5FD] text-[11px] font-semibold text-[#4338CA]"
            >
              <span className="font-bold">{chip.label}:</span> {chip.value}
              <button
                onClick={() => removeFilterChip(chip.key)}
                aria-label={`Remove filter: ${chip.label}`}
                className="ml-0.5 p-0.5 rounded-full hover:bg-[#DDD6FE] transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-semibold text-[#94A3B8] hover:text-[#334155] underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── STICKY SELECTION BANNER ── */}
      {selectedKeys.size > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-[#DCEEFF] border-b border-[#BFD9FF] shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#6C63FF]" />
            <span className="text-[13px] font-bold text-[#334155]">
              {selectedKeys.size} row{selectedKeys.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick(selectedRows)}
                disabled={action.disabled?.(selectedRows)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold rounded-md
                  transition-colors focus:outline-none
                  ${action.variant === "danger"
                    ? "bg-[#EF4444] text-white hover:bg-[#DC2626]"
                    : action.variant === "primary"
                      ? "bg-[#6C63FF] text-white hover:bg-[#5B52E5]"
                      : "bg-white text-[#475569] border border-[#D1D5DB] hover:bg-[#F8FAFC]"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedKeys(new Set())}
            aria-label="Deselect all rows"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#334155] hover:text-[#111827] ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Deselect All
          </button>
        </div>
      )}

      {/* ── TABLE ── */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse ent-table">
          {/* thead */}
          <thead>
            <tr className="bg-[#F3F6FB]">
              {/* Select All */}
              <th
                scope="col"
                className="sticky left-0 z-10 bg-[#F3F6FB] px-3 py-0 w-10 border-b border-[#D8E2F0] border-r border-[#EDF2F7] h-[46px]"
              >
                <button
                  onClick={handleSelectAll}
                  aria-label={allSelected ? "Deselect all rows" : "Select all rows on this page"}
                  className="flex items-center justify-center w-full h-full focus:outline-none rounded cursor-pointer"
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-[#6C63FF]" />
                    : someSelected
                      ? <div className="w-4 h-4 border-2 border-[#6C63FF] rounded bg-[#EDE9FE] flex items-center justify-center"><div className="w-2 h-0.5 bg-[#6C63FF]" /></div>
                      : <Square className="w-4 h-4 text-[#94A3B8] hover:text-[#334155]" />
                  }
                </button>
              </th>

              {/* Data columns */}
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  style={{ width: col.width, minWidth: col.minWidth }}
                  className={`
                    px-3 py-3 text-[14px] font-semibold text-[#334155] whitespace-nowrap
                    border-b border-[#D8E2F0] border-r border-[#EDF2F7] select-none h-[46px] bg-[#F3F6FB]
                    ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                    ${col.sticky === "left" ? "sticky left-10 z-10 bg-[#F3F6FB]" : ""}
                    ${col.sticky === "right" ? "sticky right-10 z-10 bg-[#F3F6FB]" : ""}
                    ${col.sortable ? "cursor-pointer hover:bg-[#EAEFF8] transition-colors" : ""}
                  `}
                  onClick={() => col.sortable && handleSort(col.accessorKey as string ?? col.id)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-[#94A3B8]">
                        {sortCol === (col.accessorKey as string ?? col.id)
                          ? sortDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5 text-[#6C63FF]" />
                            : sortDir === "desc"
                              ? <ArrowDown className="w-3.5 h-3.5 text-[#6C63FF]" />
                              : <ArrowUpDown className="w-3.5 h-3.5" />
                          : <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                        }
                      </span>
                    )}
                  </span>
                </th>
              ))}

              {/* Actions column */}
              {renderRowActions && (
                <th
                  scope="col"
                  className="sticky right-0 z-10 bg-[#F3F6FB] px-3 py-3 text-[14px] font-semibold text-[#334155] border-b border-[#D8E2F0] text-center w-16 h-[46px]"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* tbody */}
          <tbody className="divide-y divide-[#EDF2F7]">
            {loading
              ? Array.from({ length: pageSize > 5 ? 8 : pageSize }).map((_, i) => (
                  <SkeletonRow key={i} cols={visibleColumns.length} density={density} />
                ))
              : paginatedRows.length === 0
                ? <EmptyState message={emptyMessage} icon={emptyIcon} onClear={search || filterChips.length > 0 ? clearAllFilters : undefined} />
                : paginatedRows.map((row, idx) => {
                    const key = keyExtractor(row);
                    const isSelected = selectedKeys.has(key);
                    const isEven = idx % 2 === 1;
                    return (
                      <tr
                        key={key}
                        className={`
                          group transition-colors duration-75 text-[#334155]
                          ${isSelected 
                            ? "bg-[#DCEEFF] hover:bg-[#DCEEFF]" 
                            : isEven 
                              ? "bg-[#FCFDFE] hover:bg-[#EEF6FF]" 
                              : "bg-[#FFFFFF] hover:bg-[#EEF6FF]"
                          }
                          ${onRowClick ? "cursor-pointer" : ""}
                        `}
                        onClick={() => onRowClick?.(row)}
                        tabIndex={onRowClick ? 0 : undefined}
                        role={onRowClick ? "button" : "row"}
                        aria-selected={isSelected}
                      >
                        {/* Checkbox */}
                        <td
                          className={`sticky left-0 z-[5] px-3 w-10 border-r border-[#EDF2F7] ${densityConf.rowH} ${isSelected ? "bg-[#DCEEFF]" : isEven ? "bg-[#FCFDFE] group-hover:bg-[#EEF6FF]" : "bg-white group-hover:bg-[#EEF6FF]"}`}
                          onClick={(e) => { e.stopPropagation(); handleSelectRow(key); }}
                        >
                          <button
                            aria-label={`Select row ${key}`}
                            className="flex items-center justify-center focus:outline-none rounded cursor-pointer"
                          >
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-[#6C63FF]" />
                              : <Square className="w-4 h-4 text-[#94A3B8] group-hover:text-[#334155]" />
                            }
                          </button>
                        </td>

                        {/* Data cells */}
                        {visibleColumns.map((col) => (
                          <td
                            key={col.id}
                            className={`
                              px-3 border-r border-[#EDF2F7] ${densityConf.rowH} ${densityConf.fontSize}
                              text-[#334155] font-normal
                              ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                              ${col.sticky === "left" ? `sticky left-10 z-[5] ${isSelected ? "bg-[#DCEEFF]" : isEven ? "bg-[#FCFDFE] group-hover:bg-[#EEF6FF]" : "bg-white group-hover:bg-[#EEF6FF]"}` : ""}
                              ${col.sticky === "right" ? `sticky right-10 z-[5] ${isSelected ? "bg-[#DCEEFF]" : isEven ? "bg-[#FCFDFE] group-hover:bg-[#EEF6FF]" : "bg-white group-hover:bg-[#EEF6FF]"}` : ""}
                            `}
                          >
                            {col.cell
                              ? col.cell(row)
                              : col.accessorKey
                                ? <span>{String(row[col.accessorKey as keyof T] ?? "—")}</span>
                                : null
                            }
                          </td>
                        ))}

                        {/* Actions */}
                        {renderRowActions && (
                          <td
                            className={`sticky right-0 z-[5] px-3 ${densityConf.rowH} text-center ${isSelected ? "bg-[#DCEEFF]" : "bg-white group-hover:bg-[#EEF6FF]"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderRowActions(row)}
                          </td>
                        )}
                      </tr>
                    );
                  })
            }
          </tbody>
        </table>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-[#E5E7EB] bg-[#FAFBFC] shrink-0">
        {/* Left: record count + refresh timestamp */}
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-[#64748B]">
            {processedRows.length > 0
              ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, processedRows.length)} of ${(totalRecords ?? processedRows.length).toLocaleString()} records`
              : "No records"
            }
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            Last refresh: {mounted ? lastRefreshed.toLocaleTimeString() : ""}
          </span>
        </div>

        {/* Right: rows-per-page + pagination */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="dt-page-size" className="text-[11px] text-[#94A3B8] whitespace-nowrap font-medium">
              Rows/page
            </label>
            <select
              id="dt-page-size"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="text-[12px] font-semibold px-2 py-0.5 rounded border border-[#D1D5DB] bg-white text-[#334155] focus:outline-none focus:border-[#6C63FF]"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="dt-page-first"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              aria-label="First page"
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              id="dt-page-prev"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-0.5 text-[12px] font-bold text-white bg-[#6C63FF] rounded-md shadow-2xs whitespace-nowrap">
              {currentPage} / {totalPages}
            </span>

            <button
              id="dt-page-next"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="dt-page-last"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
              className="p-1 rounded text-[#64748B] hover:text-[#334155] hover:bg-[#EEF2FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Click-away for dropdowns */}
      {(showDensity || showColumnChooser || showExport) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowDensity(false); setShowColumnChooser(false); setShowExport(false); }}
          aria-hidden
        />
      )}
    </div>
  );
}

export default DataTable;
