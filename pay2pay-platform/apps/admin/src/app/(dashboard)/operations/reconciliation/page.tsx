"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowLeftRight,
  Layers,
  Scale,
  Calendar,
  Building2,
  AlertOctagon,
  FileText,
  Info,
  HelpCircle,
  X,
  PlusCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  FileCheck
} from "lucide-react";

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

interface VendorOption {
  vendor_code: string;
  vendor_name: string;
  column_config: {
    transaction_id?: string;
    amount?: string;
    status?: string;
    utr?: string;
    vendor_reference?: string;
    service?: string;
    retailer_id?: string;
    transaction_date?: string;
  };
  status_mapping?: Record<string, string>;
  is_active: boolean;
}

interface ReconciliationBatch {
  id: number;
  batch_reference: string;
  vendor_code: string;
  vendor_name: string;
  service_name: string;
  report_date: string;
  file_name: string;
  file_format: string;
  file_size_bytes: number;
  file_url: string;
  total_vendor_records: number;
  total_internal_records: number;
  matched_count: number;
  amount_mismatch_count: number;
  status_mismatch_count: number;
  missing_internal_count: number;
  missing_vendor_count: number;
  duplicate_count: number;
  invalid_count: number;
  vendor_total_amount: number;
  internal_total_amount: number;
  matched_amount: number;
  status: "UPLOADED" | "VALIDATING" | "PROCESSING" | "COMPLETED" | "FAILED";
  uploaded_by_name: string;
  created_at: string;
  completed_at: string | null;
  processing_error: string | null;
  summary_metrics?: Record<string, any>;
}

interface ReconciliationResultItem {
  id: number;
  batch_id: number;
  transaction_id: string;
  vendor_txn_id: string | null;
  internal_txn_id: string | null;
  vendor_amount: number | null;
  internal_amount: number | null;
  amount_difference: number | null;
  vendor_status: string | null;
  internal_status: string | null;
  vendor_utr: string | null;
  internal_utr: string | null;
  service_name: string | null;
  retailer_id: string | null;
  retailer_name: string | null;
  vendor_timestamp: string | null;
  internal_timestamp: string | null;
  reconciliation_status: string;
  discrepancy_reason: string | null;
  review_status: string;
  review_remarks: string | null;
  created_at: string;
}

// ==============================================================================
// DEFAULT VENDORS & SERVICES CONFIGURATIONS (SECTION 20)
// ==============================================================================

const DEFAULT_PAYOUT_VENDORS: VendorOption[] = [
  {
    vendor_code: "URBANRUPEE",
    vendor_name: "UrbanRupee Payout",
    column_config: {
      transaction_id: "order_id",
      amount: "amount",
      status: "status",
      utr: "rrn",
      vendor_reference: "ur_txn_id",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "created_at"
    },
    is_active: true
  },
  {
    vendor_code: "BULKPE",
    vendor_name: "BulkPe Gateway",
    column_config: {
      transaction_id: "client_reference_id",
      amount: "amount",
      status: "status",
      utr: "utr",
      vendor_reference: "bulkpe_reference_id",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "created_at"
    },
    is_active: true
  },
  {
    vendor_code: "WOWPE",
    vendor_name: "WowPe Payout",
    column_config: {
      transaction_id: "order_id",
      amount: "amount",
      status: "status",
      utr: "utr",
      vendor_reference: "wowpe_id",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "created_at"
    },
    is_active: true
  },
  {
    vendor_code: "CASHFREE",
    vendor_name: "Cashfree Payments",
    column_config: {
      transaction_id: "transferId",
      amount: "amount",
      status: "status",
      utr: "utr",
      vendor_reference: "cfTransferId",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "addedOn"
    },
    is_active: true
  },
  {
    vendor_code: "UTKALDIGITAL",
    vendor_name: "Utkal Digital",
    column_config: {
      transaction_id: "client_id",
      amount: "amount",
      status: "status",
      utr: "operator_ref",
      vendor_reference: "utkal_id",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "created_at"
    },
    is_active: true
  },
  {
    vendor_code: "MSWIPE",
    vendor_name: "Mswipe POS / UPI",
    column_config: {
      transaction_id: "orig_txn_id",
      amount: "amount",
      status: "status",
      utr: "rrn",
      vendor_reference: "rrn",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "txn_date_time"
    },
    is_active: true
  },
  {
    vendor_code: "PAYU",
    vendor_name: "PayU Payments",
    column_config: {
      transaction_id: "txnid",
      amount: "amount",
      status: "status",
      utr: "bank_ref_num",
      vendor_reference: "payu_id",
      service: "service",
      retailer_id: "retailer_id",
      transaction_date: "addedon"
    },
    is_active: true
  },
  {
    vendor_code: "GENERIC_VENDOR",
    vendor_name: "Generic / Custom Vendor",
    column_config: {
      transaction_id: "Transaction ID",
      amount: "Amount",
      status: "Status",
      utr: "UTR",
      vendor_reference: "Vendor Ref",
      service: "Service",
      retailer_id: "Retailer ID",
      transaction_date: "Date"
    },
    is_active: true
  }
];

const DEFAULT_SERVICES = [
  "PAYOUT",
  "DMT",
  "AEPS",
  "RECHARGE",
  "BBPS",
  "UPI",
  "POS",
  "QR_PAY",
  "TOPUP"
];

// ==============================================================================
// COMPONENT: CONSOLIDATED TRANSACTION RECONCILIATION
// ==============================================================================

export default function ConsolidatedReconciliationPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"reconciliation" | "exceptions" | "batches">("reconciliation");

  // Dynamic Options
  const [vendors, setVendors] = useState<VendorOption[]>(DEFAULT_PAYOUT_VENDORS);
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Active Batch & Batches List
  const [batches, setBatches] = useState<ReconciliationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [activeBatch, setActiveBatch] = useState<ReconciliationBatch | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // Reconciliation Results Table State
  const [results, setResults] = useState<ReconciliationResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingResults, setLoadingResults] = useState(false);

  // Table Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [quickFilter, setQuickFilter] = useState<"ALL" | "AMOUNT_MISMATCH" | "STATUS_MISMATCH" | "MISSING" | "DUPLICATES">("ALL");

  // Exceptions Table State
  const [exceptions, setExceptions] = useState<ReconciliationResultItem[]>([]);
  const [totalExceptions, setTotalExceptions] = useState(0);
  const [exceptionPage, setExceptionPage] = useState(1);
  const [exceptionFilter, setExceptionFilter] = useState("ALL");
  const [loadingExceptions, setLoadingExceptions] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadVendor, setUploadVendor] = useState(DEFAULT_PAYOUT_VENDORS[0].vendor_code);
  const [uploadService, setUploadService] = useState("PAYOUT");
  const [uploadReportDate, setUploadReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploadFileType, setUploadFileType] = useState("AUTO");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [customColumnMapping, setCustomColumnMapping] = useState({
    transaction_id: DEFAULT_PAYOUT_VENDORS[0].column_config.transaction_id || "",
    amount: DEFAULT_PAYOUT_VENDORS[0].column_config.amount || "",
    status: DEFAULT_PAYOUT_VENDORS[0].column_config.status || "",
    utr: DEFAULT_PAYOUT_VENDORS[0].column_config.utr || "",
    vendor_reference: DEFAULT_PAYOUT_VENDORS[0].column_config.vendor_reference || "",
    service: DEFAULT_PAYOUT_VENDORS[0].column_config.service || "",
    retailer_id: DEFAULT_PAYOUT_VENDORS[0].column_config.retailer_id || "",
    transaction_date: DEFAULT_PAYOUT_VENDORS[0].column_config.transaction_date || "",
  });

  // Transaction Detail Drawer
  const [selectedTxn, setSelectedTxn] = useState<ReconciliationResultItem | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewStatus, setReviewStatus] = useState("REVIEWED");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-refresh timer for processing batches
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);

  // ----------------------------------------------------------------------------
  // COPY HELPER
  // ----------------------------------------------------------------------------
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ----------------------------------------------------------------------------
  // FORMATTERS & SAFE HELPERS
  // ----------------------------------------------------------------------------
  const formatCurrency = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(val));
  };

  const formatNumber = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "0";
    return Number(val).toLocaleString("en-IN");
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // ----------------------------------------------------------------------------
  // DATA NORMALIZERS (PREVENTS ANY RUNTIME DESERIALIZATION CRASH)
  // ----------------------------------------------------------------------------
  const normalizeBatch = (b: any): ReconciliationBatch => {
    if (!b) return b;
    const kpi = b.kpi || {};
    const fin = b.financial || {};
    return {
      id: Number(b.id || 0),
      batch_reference: b.batch_reference || b.batch_number || `BATCH-${b.id}`,
      vendor_code: b.vendor_code || "",
      vendor_name: b.vendor_name || b.vendor_code || "",
      service_name: b.service_name || "ALL",
      report_date: b.report_date || "",
      file_name: b.file_name || "",
      file_format: b.file_type || b.file_format || "CSV",
      file_size_bytes: Number(b.file_size_bytes || 0),
      file_url: b.file_b2_url || b.file_url || "",
      total_vendor_records: Number(b.total_vendor_records ?? kpi.total_vendor_records ?? 0),
      total_internal_records: Number(b.total_internal_records ?? kpi.total_internal_records ?? 0),
      matched_count: Number(b.matched_count ?? b.matched_records ?? kpi.matched_records ?? 0),
      amount_mismatch_count: Number(b.amount_mismatch_count ?? b.amount_mismatch_records ?? kpi.amount_mismatch_records ?? 0),
      status_mismatch_count: Number(b.status_mismatch_count ?? b.status_mismatch_records ?? kpi.status_mismatch_records ?? 0),
      missing_internal_count: Number(b.missing_internal_count ?? b.missing_in_internal_records ?? kpi.missing_in_internal_records ?? 0),
      missing_vendor_count: Number(b.missing_vendor_count ?? b.missing_in_vendor_records ?? kpi.missing_in_vendor_records ?? 0),
      duplicate_count: Number(b.duplicate_count ?? b.duplicate_vendor_records ?? kpi.duplicate_vendor_records ?? 0),
      invalid_count: Number(b.invalid_count ?? b.invalid_records ?? kpi.invalid_vendor_records ?? 0),
      vendor_total_amount: Number(b.vendor_total_amount ?? fin.vendor_total_amount ?? 0),
      internal_total_amount: Number(b.internal_total_amount ?? fin.internal_total_amount ?? 0),
      matched_amount: Number(b.matched_amount ?? fin.matched_amount ?? 0),
      status: b.status || "UPLOADED",
      uploaded_by_name: b.uploaded_by_name || b.uploaded_by || "Admin",
      created_at: b.created_at || b.uploaded_at || "",
      completed_at: b.completed_at || null,
      processing_error: b.processing_error || b.error_message || null,
      summary_metrics: b.summary_metrics || fin,
    };
  };

  const normalizeResultItem = (item: any): ReconciliationResultItem => {
    return {
      id: Number(item.id || 0),
      batch_id: Number(item.batch_id || selectedBatchId || 0),
      transaction_id: item.transaction_id || item.txn_id || "—",
      vendor_txn_id: item.vendor_txn_id || null,
      internal_txn_id: item.internal_txn_id || item.internal_ref_id || null,
      vendor_amount: item.vendor_amount !== undefined ? (item.vendor_amount !== null ? Number(item.vendor_amount) : null) : (item.vendor_value?.amount !== undefined ? (item.vendor_value?.amount !== null ? Number(item.vendor_value?.amount) : null) : null),
      internal_amount: item.internal_amount !== undefined ? (item.internal_amount !== null ? Number(item.internal_amount) : null) : (item.internal_value?.amount !== undefined ? (item.internal_value?.amount !== null ? Number(item.internal_value?.amount) : null) : null),
      amount_difference: item.amount_difference !== undefined ? (item.amount_difference !== null ? Number(item.amount_difference) : null) : (item.difference !== undefined ? (item.difference !== null ? Number(item.difference) : null) : null),
      vendor_status: item.vendor_status || item.vendor_value?.status || null,
      internal_status: item.internal_status || item.internal_value?.status || null,
      vendor_utr: item.vendor_utr || item.vendor_value?.utr || null,
      internal_utr: item.internal_utr || item.internal_value?.utr || null,
      service_name: item.service_name || item.internal_service || item.vendor_service || "PAYOUT",
      retailer_id: item.retailer_id || item.internal_retailer_id || null,
      retailer_name: item.retailer_name || item.internal_retailer_name || item.internal_value?.retailer || null,
      vendor_timestamp: item.vendor_timestamp || item.vendor_date || item.vendor_value?.date || null,
      internal_timestamp: item.internal_timestamp || item.internal_date || item.internal_value?.date || null,
      reconciliation_status: item.reconciliation_status || item.recon_status || item.exception_category || "MATCHED",
      discrepancy_reason: item.discrepancy_reason || item.recommended_action || null,
      review_status: item.review_status || "PENDING",
      review_remarks: item.review_remarks || null,
      created_at: item.created_at || "",
    };
  };

  // ----------------------------------------------------------------------------
  // FETCH VENDORS & SERVICES CONFIG
  // ----------------------------------------------------------------------------
  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [vRes, sRes] = await Promise.all([
        api.get("/admin/reconciliation/vendors"),
        api.get("/admin/reconciliation/services"),
      ]);

      const rawVendors = (vRes.data && (vRes.data.vendors || vRes.data.data)) || [];
      if (Array.isArray(rawVendors) && rawVendors.length > 0) {
        const mappedVendors: VendorOption[] = rawVendors.map((v: any) => {
          const colMap = v.column_config || v.column_mapping || {};
          return {
            vendor_code: v.vendor_code,
            vendor_name: v.vendor_name,
            column_config: {
              transaction_id: Array.isArray(colMap.transaction_id) ? colMap.transaction_id[0] : (colMap.transaction_id || ""),
              amount: Array.isArray(colMap.amount) ? colMap.amount[0] : (colMap.amount || ""),
              status: Array.isArray(colMap.status) ? colMap.status[0] : (colMap.status || ""),
              utr: Array.isArray(colMap.utr) ? colMap.utr[0] : (colMap.utr || ""),
              vendor_reference: Array.isArray(colMap.vendor_reference || colMap.vendor_txn_id) ? (colMap.vendor_reference || colMap.vendor_txn_id)[0] : (colMap.vendor_reference || colMap.vendor_txn_id || ""),
              service: Array.isArray(colMap.service) ? colMap.service[0] : (colMap.service || ""),
              retailer_id: Array.isArray(colMap.retailer_id) ? colMap.retailer_id[0] : (colMap.retailer_id || ""),
              transaction_date: Array.isArray(colMap.transaction_date) ? colMap.transaction_date[0] : (colMap.transaction_date || ""),
            },
            status_mapping: v.status_mapping,
            is_active: v.is_active ?? true,
          };
        });

        // Merge mapped with DEFAULT_PAYOUT_VENDORS to ensure payout vendors always exist
        const vendorMap = new Map<string, VendorOption>();
        mappedVendors.forEach((v) => vendorMap.set(v.vendor_code, v));
        DEFAULT_PAYOUT_VENDORS.forEach((v) => {
          if (!vendorMap.has(v.vendor_code)) {
            vendorMap.set(v.vendor_code, v);
          }
        });
        const finalVendors = Array.from(vendorMap.values());
        setVendors(finalVendors);
      }

      const rawServices = (sRes.data && (sRes.data.services || sRes.data.data)) || [];
      if (Array.isArray(rawServices) && rawServices.length > 0) {
        const uniqueServices = Array.from(new Set([...DEFAULT_SERVICES, ...rawServices]));
        setServices(uniqueServices);
      }
    } catch (err: any) {
      console.error("Failed to load reconciliation configuration", err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // When vendor changes in upload modal, update default column mapping
  const handleVendorSelectChange = (vendorCode: string) => {
    setUploadVendor(vendorCode);
    const found = vendors.find((v) => v.vendor_code === vendorCode);
    if (found && found.column_config) {
      setCustomColumnMapping({
        transaction_id: found.column_config.transaction_id || "",
        amount: found.column_config.amount || "",
        status: found.column_config.status || "",
        utr: found.column_config.utr || "",
        vendor_reference: found.column_config.vendor_reference || "",
        service: found.column_config.service || "",
        retailer_id: found.column_config.retailer_id || "",
        transaction_date: found.column_config.transaction_date || "",
      });
    }
  };

  // ----------------------------------------------------------------------------
  // FETCH BATCHES LIST
  // ----------------------------------------------------------------------------
  const fetchBatches = useCallback(async (selectLatest = false) => {
    try {
      const res = await api.get("/admin/reconciliation/batches?limit=30");
      const rawBatches = (res.data && (res.data.batches || res.data.data)) || [];
      if (Array.isArray(rawBatches)) {
        const batchList = rawBatches.map(normalizeBatch);
        setBatches(batchList);
        if (batchList.length > 0) {
          if (selectLatest || !selectedBatchId) {
            setSelectedBatchId(batchList[0].id);
            setActiveBatch(batchList[0]);
          } else {
            const current = batchList.find((b: ReconciliationBatch) => b.id === selectedBatchId);
            if (current) setActiveBatch(current);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch batches list", err);
    }
  }, [selectedBatchId]);

  // ----------------------------------------------------------------------------
  // FETCH SPECIFIC BATCH DETAILS
  // ----------------------------------------------------------------------------
  const fetchBatchDetails = useCallback(async (batchId: number) => {
    setLoadingBatch(true);
    try {
      const res = await api.get(`/admin/reconciliation/batches/${batchId}`);
      const rawBatch = (res.data && (res.data.batch || res.data.data)) || null;
      if (rawBatch) {
        setActiveBatch(normalizeBatch(rawBatch));
      }
    } catch (err: any) {
      console.error(`Failed to fetch batch ${batchId} details`, err);
    } finally {
      setLoadingBatch(false);
    }
  }, []);

  // ----------------------------------------------------------------------------
  // FETCH RECONCILIATION RESULTS
  // ----------------------------------------------------------------------------
  const fetchResults = useCallback(async () => {
    if (!selectedBatchId) return;
    setLoadingResults(true);
    try {
      let statusParam = statusFilter;
      if (quickFilter !== "ALL") {
        statusParam = quickFilter;
      }

      const params: Record<string, any> = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusParam && statusParam !== "ALL") params.status = statusParam;

      const res = await api.get(`/admin/reconciliation/batches/${selectedBatchId}/results`, { params });
      if (res.data) {
        const rawResults = res.data.results || (Array.isArray(res.data.data) ? res.data.data : []);
        const resultList = rawResults.map(normalizeResultItem);
        setResults(resultList);
        setTotalResults(res.data.total_results || res.data.pagination?.total || resultList.length || 0);
        setTotalPages(res.data.total_pages || res.data.pagination?.pages || 1);
      }
    } catch (err: any) {
      console.error("Failed to fetch reconciliation results", err);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [selectedBatchId, currentPage, pageSize, searchQuery, statusFilter, quickFilter]);

  // ----------------------------------------------------------------------------
  // FETCH EXCEPTIONS
  // ----------------------------------------------------------------------------
  const fetchExceptions = useCallback(async () => {
    if (!selectedBatchId) return;
    setLoadingExceptions(true);
    try {
      const params: Record<string, any> = {
        page: exceptionPage,
        page_size: 25,
      };
      if (exceptionFilter && exceptionFilter !== "ALL") {
        params.exception_type = exceptionFilter;
      }
      const res = await api.get(`/admin/reconciliation/batches/${selectedBatchId}/exceptions`, { params });
      if (res.data) {
        const rawExceptions = res.data.exceptions || (Array.isArray(res.data.data) ? res.data.data : []);
        const exceptionList = rawExceptions.map(normalizeResultItem);
        setExceptions(exceptionList);
        setTotalExceptions(res.data.total_exceptions || res.data.pagination?.total || exceptionList.length || 0);
      }
    } catch (err: any) {
      console.error("Failed to fetch batch exceptions", err);
      setExceptions([]);
    } finally {
      setLoadingExceptions(false);
    }
  }, [selectedBatchId, exceptionPage, exceptionFilter]);

  // Initial Load
  useEffect(() => {
    fetchConfig();
    fetchBatches(true);
  }, [fetchConfig, fetchBatches]);

  // Trigger results fetch when batch or pagination or filters change
  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchDetails(selectedBatchId);
      if (activeTab === "reconciliation") {
        fetchResults();
      } else if (activeTab === "exceptions") {
        fetchExceptions();
      }
    }
  }, [selectedBatchId, activeTab, fetchBatchDetails, fetchResults, fetchExceptions]);

  // Auto-refresh poll if active batch is in PROCESSING or VALIDATING
  useEffect(() => {
    if (activeBatch && (activeBatch.status === "PROCESSING" || activeBatch.status === "VALIDATING")) {
      const timer = setTimeout(() => {
        setAutoRefreshCount((prev) => prev + 1);
        if (selectedBatchId) {
          fetchBatchDetails(selectedBatchId);
          fetchResults();
          fetchExceptions();
          fetchBatches();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeBatch, selectedBatchId, autoRefreshCount, fetchBatchDetails, fetchResults, fetchExceptions, fetchBatches]);

  // ----------------------------------------------------------------------------
  // FILE UPLOAD HANDLER
  // ----------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["csv", "xlsx", "xls"].includes(ext || "")) {
        setUploadError("Invalid file type. Supported formats: .csv, .xlsx, .xls");
        setSelectedFile(null);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setUploadError("File exceeds maximum allowed size (20MB).");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a vendor transaction report file.");
      return;
    }
    if (!uploadVendor) {
      setUploadError("Please select a vendor.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const foundVendor = vendors.find((v) => v.vendor_code === uploadVendor);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("vendor_code", uploadVendor);
    formData.append("vendor_name", foundVendor?.vendor_name || uploadVendor);
    formData.append("service_name", uploadService);
    formData.append("report_date", uploadReportDate);
    formData.append("file_type", uploadFileType);

    // If user opened and edited Advanced Column Mapping, send as JSON override
    if (showAdvancedMapping) {
      const hasCustomCols = Object.values(customColumnMapping).some((v) => v.trim().length > 0);
      if (hasCustomCols) {
        formData.append("column_mapping", JSON.stringify(customColumnMapping));
        formData.append("custom_column_mapping", JSON.stringify(customColumnMapping));
      }
    }

    try {
      const res = await api.post("/admin/reconciliation/batches/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.success) {
        setUploadSuccess(res.data.message || "Vendor report uploaded and reconciliation started!");
        setSelectedFile(null);
        const newBatchId = res.data.batch?.id;
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadSuccess(null);
          fetchBatches();
          if (newBatchId) {
            setSelectedBatchId(newBatchId);
          }
        }, 1200);
      }
    } catch (err: any) {
      console.error("Upload error", err);
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setUploadError(detail);
      } else if (err.response?.data?.message) {
        setUploadError(err.response.data.message);
      } else {
        setUploadError("Failed to upload report. Please check file formatting and try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // EXPORT HANDLER
  // ----------------------------------------------------------------------------
  const handleExportReconciliation = () => {
    if (!selectedBatchId) return;
    const exportUrl = `${api.defaults.baseURL || ""}/admin/reconciliation/batches/${selectedBatchId}/export?export_type=ALL`;
    window.open(exportUrl, "_blank");
  };

  const handleExportExceptions = () => {
    if (!selectedBatchId) return;
    const exportUrl = `${api.defaults.baseURL || ""}/admin/reconciliation/batches/${selectedBatchId}/export?export_type=EXCEPTIONS_ONLY`;
    window.open(exportUrl, "_blank");
  };

  // ----------------------------------------------------------------------------
  // REVIEW REMARKS HANDLER
  // ----------------------------------------------------------------------------
  const handleSaveReviewRemark = async () => {
    if (!selectedBatchId || !selectedTxn || !reviewRemarks.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await api.post(
        `/admin/reconciliation/batches/${selectedBatchId}/results/${selectedTxn.id}/review`,
        {
          review_status: reviewStatus,
          remarks: reviewRemarks.trim(),
        }
      );
      if (res.data && res.data.success) {
        setSelectedTxn((prev) =>
          prev
            ? {
                ...prev,
                review_status: reviewStatus,
                review_remarks: reviewRemarks.trim(),
              }
            : null
        );
        fetchResults();
        fetchExceptions();
      }
    } catch (err: any) {
      console.error("Failed to save audit remark", err);
      alert("Error saving review remark: " + (err.response?.data?.detail || "Please try again"));
    } finally {
      setSubmittingReview(false);
    }
  };

  // ----------------------------------------------------------------------------
  // BADGE STYLING HELPERS
  // ----------------------------------------------------------------------------
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MATCHED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            MATCHED
          </span>
        );
      case "AMOUNT_MISMATCH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            AMOUNT MISMATCH
          </span>
        );
      case "STATUS_MISMATCH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            STATUS MISMATCH
          </span>
        );
      case "MISSING_IN_INTERNAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-400">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            MISSING IN INTERNAL
          </span>
        );
      case "MISSING_IN_VENDOR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-400">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            MISSING IN VENDOR
          </span>
        );
      case "DUPLICATE_VENDOR_TRANSACTION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-300">
            <Copy className="w-3.5 h-3.5" />
            DUPLICATE IN VENDOR
          </span>
        );
      case "INVALID_VENDOR_TRANSACTION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            INVALID RECORD
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            PENDING REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getTxnStatusBadge = (st: string | null) => {
    if (!st) return <span className="text-slate-400 text-xs">—</span>;
    const upper = st.toUpperCase();
    if (upper === "SUCCESS" || upper === "COMPLETED") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          SUCCESS
        </span>
      );
    }
    if (upper === "FAILED" || upper === "FAILURE" || upper === "REJECTED") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
          FAILED
        </span>
      );
    }
    if (upper === "PENDING" || upper === "PROCESSING" || upper === "INITIATED") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
          PENDING
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
        {st}
      </span>
    );
  };

  // Recommended Action generator
  const getRecommendedAction = (item: ReconciliationResultItem) => {
    switch (item.reconciliation_status) {
      case "STATUS_MISMATCH":
        return `Vendor is ${item.vendor_status || "UNKNOWN"} while internal ledger is ${item.internal_status || "UNKNOWN"}. Open in Status Update module to verify and manually align without changing ledger records automatically.`;
      case "AMOUNT_MISMATCH":
        return `Discrepancy of ${formatCurrency(item.amount_difference)} detected. Request vendor ledger verification and inspect commission/fee deduplication.`;
      case "MISSING_IN_INTERNAL":
        return "Transaction exists in vendor report but has no matching reference in Pay2Pay. Investigate gateway webhook or manual vendor settlement.";
      case "MISSING_IN_VENDOR":
        return "Internal transaction has not been reported by vendor. Check pending payout/recharge callback with vendor support.";
      case "DUPLICATE_VENDOR_TRANSACTION":
        return "Transaction ID appeared multiple times in the vendor report. Request cleaned vendor statement.";
      default:
        return "Review transaction discrepancy details.";
    }
  };

  // Financial delta computation
  const financialSummary = useMemo(() => {
    if (!activeBatch) return null;
    const vendorTotal = Number(activeBatch.vendor_total_amount || 0);
    const internalTotal = Number(activeBatch.internal_total_amount || 0);
    const matched = Number(activeBatch.matched_amount || 0);
    const netDifference = vendorTotal - internalTotal;
    const metrics = activeBatch.summary_metrics || {};

    return {
      vendorTotal,
      internalTotal,
      matched,
      netDifference,
      vendorSuccessAmount: Number(metrics.vendor_success_amount || 0),
      internalSuccessAmount: Number(metrics.internal_success_amount || 0),
      vendorFailedAmount: Number(metrics.vendor_failed_amount || 0),
      internalFailedAmount: Number(metrics.internal_failed_amount || 0),
      vendorPendingAmount: Number(metrics.vendor_pending_amount || 0),
      internalPendingAmount: Number(metrics.internal_pending_amount || 0),
    };
  }, [activeBatch]);

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 text-[#0F172A]">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER SECTION */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Consolidated Transaction Reconciliation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Two-Way Engine
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Upload vendor statements, execute set-based 2-way matching against internal records, and identify discrepancies without affecting ledger balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedBatchId || ""}
              onChange={(e) => setSelectedBatchId(Number(e.target.value))}
              className="bg-white text-xs font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-2 pr-8 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={loadingBatch || batches.length === 0}
            >
              {batches.length === 0 ? (
                <option value="">No batches uploaded yet</option>
              ) : (
                batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.vendor_name} ({b.report_date}) — #{b.id} [{b.status}]
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => {
              if (selectedBatchId) {
                fetchBatchDetails(selectedBatchId);
                fetchResults();
                fetchExceptions();
              }
              fetchBatches();
            }}
            disabled={loadingResults || loadingBatch}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-sm hover:bg-slate-50 focus:outline-none transition-colors"
            title="Refresh active batch data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingResults || loadingBatch ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportReconciliation}
            disabled={!selectedBatchId || (activeBatch?.matched_count === 0 && activeBatch?.amount_mismatch_count === 0)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-sm hover:bg-slate-50 focus:outline-none transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <Upload className="w-4 h-4" />
            Upload Vendor Report
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ACTIVE BATCH METADATA & STATUS BANNER */}
      {/* ------------------------------------------------------------------ */}
      {activeBatch ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                BATCH #{activeBatch.id} : {activeBatch.batch_reference}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{activeBatch.vendor_name}</span>
                <span className="text-slate-400">({activeBatch.vendor_code})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Report Date: <strong className="text-slate-800">{activeBatch.report_date}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                <span>File: <strong className="text-slate-800">{activeBatch.file_name}</strong></span>
                {activeBatch.file_url && (
                  <a
                    href={activeBatch.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 ml-1"
                    title="Download stored B2 original file"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeBatch.status === "PROCESSING" || activeBatch.status === "VALIDATING" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {activeBatch.status} (Analyzing records...)
                </span>
              ) : activeBatch.status === "COMPLETED" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  COMPLETED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5" />
                  FAILED
                </span>
              )}

              <span className="text-xs text-slate-400">
                Uploaded: {formatDate(activeBatch.created_at)}
              </span>
            </div>
          </div>

          {/* Reconciliation Status Alert Condition */}
          {activeBatch.status === "COMPLETED" && (
            <div className="mt-4">
              {activeBatch.amount_mismatch_count === 0 &&
              activeBatch.status_mismatch_count === 0 &&
              activeBatch.missing_internal_count === 0 &&
              activeBatch.missing_vendor_count === 0 &&
              activeBatch.duplicate_count === 0 &&
              activeBatch.invalid_count === 0 ? (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold text-emerald-900 block text-sm">
                      Reconciliation Completed Successfully
                    </strong>
                    All {formatNumber(activeBatch.matched_count)} transactions matched identically across amounts, statuses, and identifiers. No missing records or duplicates found.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-amber-950 block text-sm">
                        Reconciliation Completed with Exceptions
                      </strong>
                      <span className="text-amber-800">
                        Identified {formatNumber(activeBatch.status_mismatch_count)} status mismatches, {formatNumber(activeBatch.amount_mismatch_count)} amount differences, {formatNumber(activeBatch.missing_internal_count)} missing in internal, and {formatNumber(activeBatch.missing_vendor_count)} missing in vendor reports.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("exceptions")}
                    className="self-start sm:self-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs transition-colors flex-shrink-0"
                  >
                    View Exceptions ({formatNumber(
                      (activeBatch.amount_mismatch_count || 0) +
                      (activeBatch.status_mismatch_count || 0) +
                      (activeBatch.missing_internal_count || 0) +
                      (activeBatch.missing_vendor_count || 0) +
                      (activeBatch.duplicate_count || 0)
                    )})
                  </button>
                </div>
              )}
            </div>
          )}

          {activeBatch.processing_error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
              <strong>Processing Error:</strong> {activeBatch.processing_error}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 mb-6 text-center shadow-sm">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">No Reconciliation Batch Selected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Upload a vendor transaction report (.csv, .xlsx, or .xls) to start set-based two-way reconciliation against internal ledger records.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload First Vendor Report
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KPI METRIC CARDS (SECTION 9) */}
      {/* ------------------------------------------------------------------ */}
      {activeBatch && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          {/* Total Vendor Records */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Vendor Records</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              {formatNumber(activeBatch.total_vendor_records)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">In uploaded file</div>
          </div>

          {/* Total Internal Records */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Internal Records</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              {formatNumber(activeBatch.total_internal_records)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Pay2Pay ledger for date</div>
          </div>

          {/* Matched */}
          <div
            onClick={() => {
              setQuickFilter("ALL");
              setStatusFilter("MATCHED");
              setActiveTab("reconciliation");
            }}
            className="bg-white border border-emerald-200 hover:border-emerald-300 rounded-xl p-3.5 shadow-sm cursor-pointer transition-all hover:bg-emerald-50/30"
          >
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1 font-medium">
              <span>Matched</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700">
              {formatNumber(activeBatch.matched_count)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              {activeBatch.total_vendor_records > 0
                ? `${(((activeBatch.matched_count || 0) / Math.max(activeBatch.total_vendor_records, 1)) * 100).toFixed(1)}% match rate`
                : "100%"}
            </div>
          </div>

          {/* Amount Mismatch */}
          <div
            onClick={() => {
              setQuickFilter("AMOUNT_MISMATCH");
              setActiveTab("reconciliation");
            }}
            className={`bg-white border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all ${
              (activeBatch.amount_mismatch_count || 0) > 0
                ? "border-amber-300 bg-amber-50/20 hover:bg-amber-50/50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-800 mb-1 font-medium">
              <span>Amount Mismatch</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-800">
              {formatNumber(activeBatch.amount_mismatch_count)}
            </div>
            <div className="text-[11px] text-amber-700 mt-1">Value discrepancy</div>
          </div>

          {/* Status Mismatch */}
          <div
            onClick={() => {
              setQuickFilter("STATUS_MISMATCH");
              setActiveTab("reconciliation");
            }}
            className={`bg-white border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all ${
              (activeBatch.status_mismatch_count || 0) > 0
                ? "border-rose-300 bg-rose-50/20 hover:bg-rose-50/50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-700 mb-1 font-medium">
              <span>Status Mismatch</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-700">
              {formatNumber(activeBatch.status_mismatch_count)}
            </div>
            <div className="text-[11px] text-rose-600 mt-1">e.g. SUCCESS vs PENDING</div>
          </div>

          {/* Missing in Internal */}
          <div
            onClick={() => {
              setQuickFilter("MISSING");
              setStatusFilter("MISSING_IN_INTERNAL");
              setActiveTab("reconciliation");
            }}
            className={`bg-white border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all ${
              (activeBatch.missing_internal_count || 0) > 0
                ? "border-red-300 bg-red-50/30 hover:bg-red-50/60"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-red-800 mb-1 font-medium">
              <span>Missing in Internal</span>
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl font-bold text-red-800">
              {formatNumber(activeBatch.missing_internal_count)}
            </div>
            <div className="text-[11px] text-red-600 mt-1">Vendor txn not in DB</div>
          </div>

          {/* Missing in Vendor */}
          <div
            onClick={() => {
              setQuickFilter("MISSING");
              setStatusFilter("MISSING_IN_VENDOR");
              setActiveTab("reconciliation");
            }}
            className={`bg-white border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all ${
              (activeBatch.missing_vendor_count || 0) > 0
                ? "border-orange-300 bg-orange-50/30 hover:bg-orange-50/60"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-orange-800 mb-1 font-medium">
              <span>Missing in Vendor</span>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-xl font-bold text-orange-800">
              {formatNumber(activeBatch.missing_vendor_count)}
            </div>
            <div className="text-[11px] text-orange-600 mt-1">DB txn not in report</div>
          </div>

          {/* Duplicate Vendor Txns */}
          <div
            onClick={() => {
              setQuickFilter("DUPLICATES");
              setActiveTab("reconciliation");
            }}
            className={`bg-white border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all ${
              (activeBatch.duplicate_count || 0) > 0
                ? "border-purple-300 bg-purple-50/30 hover:bg-purple-50/60"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1 font-medium">
              <span>Duplicate Txns</span>
              <Copy className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-700">
              {formatNumber(activeBatch.duplicate_count)}
            </div>
            <div className="text-[11px] text-purple-600 mt-1">Repeated Txn IDs in file</div>
          </div>

          {/* Invalid Records */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
              <span>Invalid Rows</span>
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-700">
              {formatNumber(activeBatch.invalid_count)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Malformed / empty rows</div>
          </div>

          {/* Total Exceptions Action Card */}
          <div
            onClick={() => setActiveTab("exceptions")}
            className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-xl p-3.5 shadow-sm cursor-pointer hover:shadow transition-all"
          >
            <div className="flex items-center justify-between text-xs text-indigo-700 mb-1 font-semibold">
              <span>Total Exceptions</span>
              <AlertTriangle className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-indigo-900">
              {formatNumber(
                (activeBatch.amount_mismatch_count || 0) +
                (activeBatch.status_mismatch_count || 0) +
                (activeBatch.missing_internal_count || 0) +
                (activeBatch.missing_vendor_count || 0) +
                (activeBatch.duplicate_count || 0)
              )}
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-1 flex items-center gap-1">
              Click to view all &rarr;
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FINANCIAL SUMMARY COMPARISON (SECTION 10) */}
      {/* ------------------------------------------------------------------ */}
      {financialSummary && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              Financial Summary (Vendor vs Internal Comparison)
            </h3>
            <span className="text-xs font-semibold text-slate-600">
              Net Delta:{" "}
              <strong
                className={
                  financialSummary.netDifference === 0
                    ? "text-emerald-600"
                    : financialSummary.netDifference > 0
                    ? "text-amber-700"
                    : "text-rose-600"
                }
              >
                {financialSummary.netDifference > 0 ? "+" : ""}
                {formatCurrency(financialSummary.netDifference)}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Vendor vs Internal Volume */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Total Transaction Volume</div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600">Vendor Total:</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(financialSummary.vendorTotal)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs text-slate-600">Internal Total:</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(financialSummary.internalTotal)}
                </span>
              </div>
            </div>

            {/* Matched Volume */}
            <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-lg">
              <div className="text-xs text-emerald-800 font-medium mb-1">Matched Volume</div>
              <div className="text-base font-bold text-emerald-700">
                {formatCurrency(financialSummary.matched)}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Verified zero-delta transaction records
              </div>
            </div>

            {/* Success Amounts Comparison */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Success Transaction Volume</div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600">Vendor Success:</span>
                <span className="text-xs font-semibold text-emerald-700">
                  {formatCurrency(financialSummary.vendorSuccessAmount)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs text-slate-600">Internal Success:</span>
                <span className="text-xs font-semibold text-emerald-700">
                  {formatCurrency(financialSummary.internalSuccessAmount)}
                </span>
              </div>
            </div>

            {/* Failed & Pending Comparison */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Failed / Pending Volume</div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600">Vendor Failed:</span>
                <span className="text-xs font-semibold text-rose-700">
                  {formatCurrency(financialSummary.vendorFailedAmount)}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs text-slate-600">Vendor Pending:</span>
                <span className="text-xs font-semibold text-amber-700">
                  {formatCurrency(financialSummary.vendorPendingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TABS NAVIGATION */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex border-b border-slate-200 mb-5 gap-6">
        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`pb-3 text-xs font-bold tracking-wide uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "reconciliation"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Scale className="w-4 h-4" />
          All Transactions ({formatNumber(totalResults)})
        </button>

        <button
          onClick={() => setActiveTab("exceptions")}
          className={`pb-3 text-xs font-bold tracking-wide uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "exceptions"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Exceptions View (
          {activeBatch
            ? formatNumber(
                (activeBatch.amount_mismatch_count || 0) +
                (activeBatch.status_mismatch_count || 0) +
                (activeBatch.missing_internal_count || 0) +
                (activeBatch.missing_vendor_count || 0) +
                (activeBatch.duplicate_count || 0)
              )
            : "0"}
          )
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 text-xs font-bold tracking-wide uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "batches"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          Reconciliation Batches ({batches.length})
        </button>
      </div>

      {/* ================================================================== */}
      {/* TAB 1: ALL TRANSACTIONS TABLE */}
      {/* ================================================================== */}
      {activeTab === "reconciliation" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Txn ID, UTR, Retailer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCurrentPage(1);
                      fetchResults();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setQuickFilter("ALL");
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="MATCHED">MATCHED</option>
                <option value="AMOUNT_MISMATCH">AMOUNT MISMATCH</option>
                <option value="STATUS_MISMATCH">STATUS MISMATCH</option>
                <option value="MISSING_IN_INTERNAL">MISSING IN INTERNAL</option>
                <option value="MISSING_IN_VENDOR">MISSING IN VENDOR</option>
                <option value="DUPLICATE_VENDOR_TRANSACTION">DUPLICATE</option>
                <option value="PENDING_REVIEW">PENDING REVIEW</option>
              </select>

              {/* Quick Filter Chips */}
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setQuickFilter("ALL");
                    setStatusFilter("ALL");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    quickFilter === "ALL" && statusFilter === "ALL"
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setQuickFilter("AMOUNT_MISMATCH");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    quickFilter === "AMOUNT_MISMATCH"
                      ? "bg-amber-600 text-white"
                      : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                  }`}
                >
                  Amount Mismatch
                </button>
                <button
                  onClick={() => {
                    setQuickFilter("STATUS_MISMATCH");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    quickFilter === "STATUS_MISMATCH"
                      ? "bg-rose-600 text-white"
                      : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Status Mismatch
                </button>
                <button
                  onClick={() => {
                    setQuickFilter("MISSING");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    quickFilter === "MISSING"
                      ? "bg-red-600 text-white"
                      : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
                  }`}
                >
                  Missing Records
                </button>
                <button
                  onClick={() => {
                    setQuickFilter("DUPLICATES");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    quickFilter === "DUPLICATES"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                  }`}
                >
                  Duplicates
                </button>
              </div>
            </div>

            {/* Page Size & Actions */}
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-3">Service / Retailer</th>
                  <th className="py-3 px-3 text-right">Vendor Amount</th>
                  <th className="py-3 px-3 text-right">Internal Amount</th>
                  <th className="py-3 px-3 text-right">Delta</th>
                  <th className="py-3 px-3 text-center">Vendor Status</th>
                  <th className="py-3 px-3 text-center">Internal Status</th>
                  <th className="py-3 px-3">UTR / Ref</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-center">Reconciliation Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingResults ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading reconciliation transactions...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No reconciliation records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  results.map((item) => {
                    const isAmountMismatch = item.reconciliation_status === "AMOUNT_MISMATCH";
                    const isStatusMismatch = item.reconciliation_status === "STATUS_MISMATCH";
                    const isMissingInternal = item.reconciliation_status === "MISSING_IN_INTERNAL";
                    const isMissingVendor = item.reconciliation_status === "MISSING_IN_VENDOR";

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isAmountMismatch
                            ? "bg-amber-50/30"
                            : isStatusMismatch
                            ? "bg-rose-50/20"
                            : isMissingInternal
                            ? "bg-red-50/30"
                            : isMissingVendor
                            ? "bg-orange-50/20"
                            : ""
                        }`}
                      >
                        {/* Transaction ID */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => setSelectedTxn(item)}
                              className="hover:text-indigo-600 hover:underline cursor-pointer"
                              title="Click to view two-way comparison"
                            >
                              {item.transaction_id}
                            </span>
                            <button
                              onClick={() => handleCopy(item.transaction_id, `txn-${item.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Copy ID"
                            >
                              {copiedId === `txn-${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Service / Retailer */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{item.service_name || "PAYOUT"}</div>
                          <div className="text-[11px] text-slate-400">
                            {item.retailer_name || item.retailer_id || "Direct"}
                          </div>
                        </td>

                        {/* Vendor Amount */}
                        <td className="py-3 px-3 text-right font-medium text-slate-900">
                          {item.vendor_amount !== null ? formatCurrency(item.vendor_amount) : (
                            <span className="text-slate-400 italic">Missing</span>
                          )}
                        </td>

                        {/* Internal Amount */}
                        <td className="py-3 px-3 text-right font-medium text-slate-900">
                          {item.internal_amount !== null ? formatCurrency(item.internal_amount) : (
                            <span className="text-slate-400 italic">Missing</span>
                          )}
                        </td>

                        {/* Delta */}
                        <td className="py-3 px-3 text-right font-semibold">
                          {item.amount_difference === null || item.amount_difference === 0 ? (
                            <span className="text-slate-400">₹0.00</span>
                          ) : (
                            <span
                              className={
                                item.amount_difference > 0 ? "text-amber-700 font-bold" : "text-rose-600 font-bold"
                              }
                            >
                              {item.amount_difference > 0 ? "+" : ""}
                              {formatCurrency(item.amount_difference)}
                            </span>
                          )}
                        </td>

                        {/* Vendor Status */}
                        <td className="py-3 px-3 text-center">
                          {getTxnStatusBadge(item.vendor_status)}
                        </td>

                        {/* Internal Status */}
                        <td className="py-3 px-3 text-center">
                          {getTxnStatusBadge(item.internal_status)}
                        </td>

                        {/* UTR / Ref */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 max-w-[140px] truncate">
                          {item.vendor_utr || item.internal_utr || item.vendor_txn_id || "—"}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDate(item.vendor_timestamp || item.internal_timestamp || item.created_at)}
                        </td>

                        {/* Reconciliation Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {getStatusBadge(item.reconciliation_status)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTxn(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Compare Side-by-Side"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing{" "}
              <strong>
                {totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(currentPage * pageSize, totalResults)}
              </strong>{" "}
              of <strong>{formatNumber(totalResults)}</strong> records
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || loadingResults}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || loadingResults}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages || loadingResults}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages || loadingResults}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: EXCEPTIONS ONLY VIEW (SECTION 13) */}
      {/* ================================================================== */}
      {activeTab === "exceptions" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header & Category Filter Chips */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Discrepancy Exception Report
              </h3>
              <p className="text-xs text-slate-500">
                Filtered view containing only records that require administrative verification or manual review.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExceptions}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-sm hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export Exceptions CSV
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-slate-200 bg-slate-50/30 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setExceptionFilter("ALL");
                setExceptionPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                exceptionFilter === "ALL"
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Exceptions
            </button>
            <button
              onClick={() => {
                setExceptionFilter("STATUS_MISMATCH");
                setExceptionPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                exceptionFilter === "STATUS_MISMATCH"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
              }`}
            >
              Status Mismatch ({activeBatch?.status_mismatch_count || 0})
            </button>
            <button
              onClick={() => {
                setExceptionFilter("AMOUNT_MISMATCH");
                setExceptionPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                exceptionFilter === "AMOUNT_MISMATCH"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              Amount Mismatch ({activeBatch?.amount_mismatch_count || 0})
            </button>
            <button
              onClick={() => {
                setExceptionFilter("MISSING_IN_INTERNAL");
                setExceptionPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                exceptionFilter === "MISSING_IN_INTERNAL"
                  ? "bg-red-600 text-white"
                  : "bg-white text-red-800 border border-red-200 hover:bg-red-50"
              }`}
            >
              Missing in Internal ({activeBatch?.missing_internal_count || 0})
            </button>
            <button
              onClick={() => {
                setExceptionFilter("MISSING_IN_VENDOR");
                setExceptionPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                exceptionFilter === "MISSING_IN_VENDOR"
                  ? "bg-orange-600 text-white"
                  : "bg-white text-orange-800 border border-orange-200 hover:bg-orange-50"
              }`}
            >
              Missing in Vendor ({activeBatch?.missing_vendor_count || 0})
            </button>
            <button
              onClick={() => {
                setExceptionFilter("DUPLICATE_VENDOR_TRANSACTION");
                setExceptionPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                exceptionFilter === "DUPLICATE_VENDOR_TRANSACTION"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
              }`}
            >
              Duplicates ({activeBatch?.duplicate_count || 0})
            </button>
          </div>

          {/* Exceptions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-3">Issue / Category</th>
                  <th className="py-3 px-3 text-right">Vendor Value</th>
                  <th className="py-3 px-3 text-right">Internal Value</th>
                  <th className="py-3 px-3 text-right">Difference</th>
                  <th className="py-3 px-4">Recommended Action</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingExceptions ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading exception items...
                    </td>
                  </tr>
                ) : exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      No exceptions found for this category!
                    </td>
                  </tr>
                ) : (
                  exceptions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* Transaction ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.transaction_id}
                        <div className="text-[10px] font-normal text-slate-400">
                          UTR: {item.vendor_utr || item.internal_utr || "—"}
                        </div>
                      </td>

                      {/* Issue */}
                      <td className="py-3 px-3">
                        {getStatusBadge(item.reconciliation_status)}
                        {item.discrepancy_reason && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            {item.discrepancy_reason}
                          </div>
                        )}
                      </td>

                      {/* Vendor Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-slate-900">
                          {item.vendor_amount !== null ? formatCurrency(item.vendor_amount) : "—"}
                        </div>
                        <div className="mt-0.5">
                          {getTxnStatusBadge(item.vendor_status)}
                        </div>
                      </td>

                      {/* Internal Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-semibold text-slate-900">
                          {item.internal_amount !== null ? formatCurrency(item.internal_amount) : "—"}
                        </div>
                        <div className="mt-0.5">
                          {getTxnStatusBadge(item.internal_status)}
                        </div>
                      </td>

                      {/* Difference */}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {item.amount_difference !== null && item.amount_difference !== 0 ? (
                          <span
                            className={
                              item.amount_difference > 0 ? "text-amber-700" : "text-rose-600"
                            }
                          >
                            {item.amount_difference > 0 ? "+" : ""}
                            {formatCurrency(item.amount_difference)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Recommended Action */}
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-sm">
                        <div className="p-2 bg-slate-50 rounded border border-slate-200">
                          {getRecommendedAction(item)}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedTxn(item)}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-semibold text-xs transition-colors"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: BATCH HISTORY TABLE (SECTION 20) */}
      {/* ================================================================== */}
      {activeTab === "batches" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                Previous Reconciliation Batches
              </h3>
              <p className="text-xs text-slate-500">
                Audit record of all uploaded vendor reports and processed reconciliation jobs.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-indigo-700"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Upload New Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Batch ID / Ref</th>
                  <th className="py-3 px-3">Vendor / Service</th>
                  <th className="py-3 px-3">Report Date</th>
                  <th className="py-3 px-3">Uploaded File</th>
                  <th className="py-3 px-3 text-right">Vendor Records</th>
                  <th className="py-3 px-3 text-right">Matched</th>
                  <th className="py-3 px-3 text-right">Exceptions</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No past reconciliation batches recorded.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const totalExc =
                      b.amount_mismatch_count +
                      b.status_mismatch_count +
                      b.missing_internal_count +
                      b.missing_vendor_count +
                      b.duplicate_count;

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          selectedBatchId === b.id ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          #{b.id}
                          <div className="text-[11px] font-normal text-slate-400">
                            {b.batch_reference}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{b.vendor_name}</div>
                          <div className="text-[11px] text-slate-400">{b.service_name}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {b.report_date}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div className="font-mono text-xs">{b.file_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {(b.file_size_bytes / 1024).toFixed(1)} KB &bull; {b.file_format}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {formatNumber(b.total_vendor_records)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-700">
                          {formatNumber(b.matched_count)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {totalExc > 0 ? (
                            <span className="text-amber-800 font-bold">{formatNumber(totalExc)}</span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {b.status === "COMPLETED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              COMPLETED
                            </span>
                          ) : b.status === "PROCESSING" ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                              PROCESSING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                              {b.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedBatchId(b.id);
                              setActiveTab("reconciliation");
                            }}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                              selectedBatchId === b.id
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {selectedBatchId === b.id ? "Viewing" : "Open"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER SAFETY NOTICE */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8 p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs text-slate-500 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 block mb-0.5">
            Enterprise Reconciliation & Accounting Safety Guarantee
          </strong>
          Uploading and processing vendor reports is purely an analytical, exception-identification operation. The reconciliation engine strictly preserves internal transaction statuses, retailer balances, and accounting ledgers without making automated mutations. Any status adjustments must be manually performed via the authorized Transaction Status Update workflow.
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODAL: UPLOAD VENDOR REPORT */}
      {/* ================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Vendor Transaction Report</h3>
                  <p className="text-xs text-slate-500">Supports .csv, .xlsx, .xls statements up to 20MB</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <span className="font-semibold text-slate-900 text-xs block">{selectedFile.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to upload
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs text-slate-700 font-medium block">
                        Drag and drop your file here, or <strong className="text-indigo-600">browse</strong>
                      </span>
                      <span className="text-[11px] text-slate-400">CSV, XLSX, XLS supported</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor & Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Vendor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={uploadVendor}
                    onChange={(e) => handleVendorSelectChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {!uploadVendor && (
                      <option value="" disabled>-- Select Vendor --</option>
                    )}
                    {vendors.map((v) => (
                      <option key={v.vendor_code} value={v.vendor_code}>
                        {v.vendor_name} ({v.vendor_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Service
                  </label>
                  <select
                    value={uploadService}
                    onChange={(e) => setUploadService(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="ALL">All Services (Auto Match)</option>
                    <option value="PAYOUT">PAYOUT (Payout / Bank Transfer)</option>
                    {services.filter((s) => s !== "PAYOUT" && s !== "ALL").map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Report Date & File Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Report Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={uploadReportDate}
                    onChange={(e) => setUploadReportDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    File Type
                  </label>
                  <select
                    value={uploadFileType}
                    onChange={(e) => setUploadFileType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="AUTO">Auto Detect Extension</option>
                    <option value="CSV">CSV Format</option>
                    <option value="XLSX">Excel 2007+ (.xlsx)</option>
                    <option value="XLS">Excel 97-2004 (.xls)</option>
                  </select>
                </div>
              </div>

              {/* Advanced Column Mapping Accordion */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                    Vendor Column Header Mapping (Dynamic Configuration)
                  </span>
                  {showAdvancedMapping ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showAdvancedMapping && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 text-xs text-slate-600">
                    <p className="text-[11px] text-slate-500">
                      Standard statement formats (including <strong>Date, Transaction ID, Status, UTR, Beneficiary Name, Bank Name, IFSC, Account Number, Type, Amount (INR), Charge (INR)</strong>) are auto-detected. Customize only if your file uses distinct non-standard column headers.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Transaction ID</label>
                        <input
                          type="text"
                          value={customColumnMapping.transaction_id}
                          onChange={(e) =>
                            setCustomColumnMapping({ ...customColumnMapping, transaction_id: e.target.value })
                          }
                          placeholder="e.g. Transaction ID, order_id, txn_id"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Amount</label>
                        <input
                          type="text"
                          value={customColumnMapping.amount}
                          onChange={(e) =>
                            setCustomColumnMapping({ ...customColumnMapping, amount: e.target.value })
                          }
                          placeholder="e.g. Amount (INR), Amount, txn_amount"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Status</label>
                        <input
                          type="text"
                          value={customColumnMapping.status}
                          onChange={(e) =>
                            setCustomColumnMapping({ ...customColumnMapping, status: e.target.value })
                          }
                          placeholder="e.g. Status, status, txn_status"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">UTR / Reference</label>
                        <input
                          type="text"
                          value={customColumnMapping.utr}
                          onChange={(e) =>
                            setCustomColumnMapping({ ...customColumnMapping, utr: e.target.value })
                          }
                          placeholder="e.g. UTR, utr, rrn, bank_ref"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Transaction Date</label>
                        <input
                          type="text"
                          value={customColumnMapping.transaction_date}
                          onChange={(e) =>
                            setCustomColumnMapping({ ...customColumnMapping, transaction_date: e.target.value })
                          }
                          placeholder="e.g. Date, created_at"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500">Payment Type / Mode</label>
                        <input
                          type="text"
                          value={customColumnMapping.service}
                          onChange={(e) =>
                            setCustomColumnMapping({ ...customColumnMapping, service: e.target.value })
                          }
                          placeholder="e.g. Type, mode, transfer_mode"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation & Error Alerts */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Validation Error:</strong> {uploadError}
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>{uploadSuccess}</div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading & Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload & Start Reconciliation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DRAWER: TRANSACTION DETAIL SIDE-BY-SIDE COMPARISON (SECTION 14) */}
      {/* ================================================================== */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                    Side-by-Side Reconciliation Comparison
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-mono font-bold text-slate-900">
                      {selectedTxn.transaction_id}
                    </h3>
                    <button
                      onClick={() => handleCopy(selectedTxn.transaction_id, "drawer-txn")}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      {copiedId === "drawer-txn" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedTxn.reconciliation_status)}
                  <button
                    onClick={() => setSelectedTxn(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Two-Column Comparison Grid */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* VENDOR COLUMN */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Vendor Report Record
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Vendor Amount</span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            selectedTxn.reconciliation_status === "AMOUNT_MISMATCH"
                              ? "text-rose-600 underline decoration-rose-300"
                              : "text-slate-900"
                          }`}
                        >
                          {selectedTxn.vendor_amount !== null
                            ? formatCurrency(selectedTxn.vendor_amount)
                            : "Missing"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Vendor Status</span>
                        <div className="mt-0.5">{getTxnStatusBadge(selectedTxn.vendor_status)}</div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Vendor UTR / RRN</span>
                        <span className="font-mono text-slate-700">
                          {selectedTxn.vendor_utr || "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Vendor Reference</span>
                        <span className="font-mono text-slate-700">
                          {selectedTxn.vendor_txn_id || "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Transaction Date</span>
                        <span className="text-slate-700">
                          {formatDate(selectedTxn.vendor_timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* INTERNAL COLUMN */}
                  <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-indigo-100 text-xs font-bold uppercase tracking-wider text-indigo-900">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Internal Ledger Record
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-indigo-400 block text-[10px] uppercase">Internal Amount</span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            selectedTxn.reconciliation_status === "AMOUNT_MISMATCH"
                              ? "text-rose-600 underline decoration-rose-300"
                              : "text-slate-900"
                          }`}
                        >
                          {selectedTxn.internal_amount !== null
                            ? formatCurrency(selectedTxn.internal_amount)
                            : "Missing"}
                        </span>
                      </div>

                      <div>
                        <span className="text-indigo-400 block text-[10px] uppercase">Internal Status</span>
                        <div className="mt-0.5">{getTxnStatusBadge(selectedTxn.internal_status)}</div>
                      </div>

                      <div>
                        <span className="text-indigo-400 block text-[10px] uppercase">Internal UTR / RRN</span>
                        <span className="font-mono text-slate-700">
                          {selectedTxn.internal_utr || "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-indigo-400 block text-[10px] uppercase">Service & Retailer</span>
                        <span className="text-slate-700 block">
                          {selectedTxn.service_name || "PAYOUT"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {selectedTxn.retailer_name || selectedTxn.retailer_id || "Direct"}
                        </span>
                      </div>

                      <div>
                        <span className="text-indigo-400 block text-[10px] uppercase">Internal Date</span>
                        <span className="text-slate-700">
                          {formatDate(selectedTxn.internal_timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discrepancy Analysis Box */}
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl mb-6 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Discrepancy Analysis & Recommended Action
                  </div>
                  <p className="text-amber-800 mb-2">
                    {getRecommendedAction(selectedTxn)}
                  </p>
                  {selectedTxn.amount_difference !== null && selectedTxn.amount_difference !== 0 && (
                    <div className="p-2 bg-white/70 rounded border border-amber-200 font-mono text-xs">
                      Difference: Vendor ({formatCurrency(selectedTxn.vendor_amount)}) - Internal (
                      {formatCurrency(selectedTxn.internal_amount)}) ={" "}
                      <strong>{formatCurrency(selectedTxn.amount_difference)}</strong>
                    </div>
                  )}
                </div>

                {/* Admin Audit Review Remarks Form */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Admin Discrepancy Note & Audit Trail
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Review Status
                      </label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="REVIEWED">Reviewed by Operations</option>
                        <option value="RESOLVED">Resolved Manually</option>
                        <option value="IGNORED">False Alarm / Ignored</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Audit Remarks
                      </label>
                      <textarea
                        rows={3}
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                        placeholder="Add investigation remarks (e.g. Verified with bank, vendor confirmed debit note #123)..."
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <button
                      onClick={handleSaveReviewRemark}
                      disabled={submittingReview || !reviewRemarks.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                    >
                      {submittingReview ? "Saving..." : "Save Audit Remark"}
                    </button>

                    {selectedTxn.review_remarks && (
                      <div className="p-2.5 bg-white border border-slate-200 rounded text-xs text-slate-600 mt-2">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Existing Remark:</span>
                        {selectedTxn.review_remarks}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <a
                href={`/operations/transaction-status-update?search=${encodeURIComponent(selectedTxn.transaction_id)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-sm hover:bg-indigo-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Transaction Status Update
              </a>

              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
