"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useWalletSync, triggerWalletSync } from "@/context/WalletSyncProvider";
import {
  UploadCloud,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wallet,
  Store,
  FileImage,
  ArrowUpRight,
  Info,
  AlertTriangle,
  AlertCircle,
  Receipt,
  Copy,
  Check,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Lock,
  Calculator,
  QrCode,
  Smartphone,
  Sparkles,
  Edit3,
  ShieldCheck,
  Download,
  Camera,
  ArrowLeft,
  ScanLine
} from "lucide-react";

interface TopupRequestItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  payment_reference: string;
  payment_method: string;
  payment_mode?: string;
  payment_date?: string;
  slip_id?: string;
  slip_url?: string;
  slip_original_filename?: string;
  slip_file_size_bytes?: number;
  slip_checksum?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  retailer_remarks?: string;
  admin_notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  transaction_reference?: string;
  mdr_charge?: number;
  gst_amount?: number;
  charges?: number;
  received_amount?: number;
}

interface PaymentModeOption {
  id?: string;
  code: string;
  name: string;
  display_order?: number;
  settlement_type?: string;
}

interface UpiQrData {
  request_id: string;
  amount: number;
  upi_id: string;
  payee_name: string;
  company_name: string;
  upi_url: string;
  qr_data_url: string;
  expires_at: string;
  expires_in_seconds: number;
}

interface OcrDetails {
  amount: number | null;
  transaction_id: string | null;
  payment_app: string;
  upi_id: string | null;
  payer_name: string | null;
  payee_name: string | null;
  payment_date: string | null;
  payment_time: string | null;
  payment_status: string;
  is_amount_matched: boolean;
  raw_text_preview?: string;
}

export default function RetailerTopupRequestPage() {
  // ── States & Live Sync ────────────────────────────────────────────────────────
  const { walletData, refreshWallet } = useWalletSync();
  const [walletBalance, setWalletBalance] = useState<number>(walletData?.wallet_balance ?? 0);
  const [retailerInfo, setRetailerInfo] = useState<{ code: string; name: string } | null>(
    walletData ? { code: walletData.retailer_code, name: walletData.retailer_name || walletData.owner_name } : null
  );
  const [myRequests, setMyRequests] = useState<TopupRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);

  // ── Mode Switcher ─────────────────────────────────────────────────────────────
  const [topupMode, setTopupMode] = useState<"UPI" | "POS">("UPI");

  // ── UPI Flow Sub-Steps ────────────────────────────────────────────────────────
  // AMOUNT -> QR_DISPLAY -> UPLOAD -> VERIFY -> CONFIRM -> SUCCESS
  const [upiStep, setUpiStep] = useState<"AMOUNT" | "QR_DISPLAY" | "UPLOAD" | "VERIFY" | "CONFIRM" | "SUCCESS">("AMOUNT");
  const [upiAmount, setUpiAmount] = useState<string>("");
  const [generatingQr, setGeneratingQr] = useState<boolean>(false);
  const [upiQrData, setUpiQrData] = useState<UpiQrData | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(900);
  const [isQrExpired, setIsQrExpired] = useState<boolean>(false);

  // Screenshot Upload & OCR State
  const [upiSlipFile, setUpiSlipFile] = useState<File | null>(null);
  const [upiSlipPreview, setUpiSlipPreview] = useState<string | null>(null);
  const [uploadingAndScanning, setUploadingAndScanning] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>("Analyzing image with AI OCR...");
  const [uploadedUpiSlip, setUploadedUpiSlip] = useState<{
    slip_id: string;
    slip_url: string;
    storage_path: string;
    checksum: string;
    file_size_bytes: number;
    original_filename: string;
  } | null>(null);
  const [ocrData, setOcrData] = useState<OcrDetails | null>(null);

  // Editable Detected Values
  const [verifiedAmount, setVerifiedAmount] = useState<string>("");
  const [verifiedUtr, setVerifiedUtr] = useState<string>("");
  const [verifiedPaymentApp, setVerifiedPaymentApp] = useState<string>("Google Pay");
  const [verifiedUpiId, setVerifiedUpiId] = useState<string>("");
  const [verifiedPayerName, setVerifiedPayerName] = useState<string>("");
  const [verifiedPaymentDate, setVerifiedPaymentDate] = useState<string>("");
  const [verifiedPaymentStatus, setVerifiedPaymentStatus] = useState<string>("Successful");

  // Final submission state
  const [submittingUpi, setSubmittingUpi] = useState<boolean>(false);
  const [upiCreatedRequest, setUpiCreatedRequest] = useState<{
    request_id: string;
    amount: number;
    utr: string;
    app: string;
  } | null>(null);

  // ── POS Settlement States (Existing Workflow) ─────────────────────────────────
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [requestedAmount, setRequestedAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [retailerRemarks, setRetailerRemarks] = useState<string>("");
  const [submittingPos, setSubmittingPos] = useState<boolean>(false);
  const [uploadingPosSlip, setUploadingPosSlip] = useState<boolean>(false);
  const [posSlipFile, setPosSlipFile] = useState<File | null>(null);
  const [posSlipPreview, setPosSlipPreview] = useState<string | null>(null);
  const [uploadedPosSlipData, setUploadedPosSlipData] = useState<{
    slip_id: string;
    slip_url: string;
    checksum: string;
    file_size: number;
    original_filename: string;
  } | null>(null);
  const [mdrBreakdown, setMdrBreakdown] = useState<{
    transaction_amount: number;
    mdr: number;
    gst: number;
    charges: number;
    received_amount: number;
    payment_mode: string;
    mdr_config_id?: string;
  } | null>(null);
  const [calculatingMdr, setCalculatingMdr] = useState<boolean>(false);

  // UI helpers
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const upiFileInputRef = useRef<HTMLInputElement>(null);
  const posFileInputRef = useRef<HTMLInputElement>(null);

  // Sync wallet balance
  useEffect(() => {
    if (walletData && typeof walletData.wallet_balance === "number") {
      setWalletBalance(walletData.wallet_balance);
      if (!retailerInfo && walletData.retailer_code) {
        setRetailerInfo({
          code: walletData.retailer_code,
          name: walletData.retailer_name || walletData.owner_name || "Retailer Account"
        });
      }
    }
  }, [walletData, retailerInfo]);

  // Dynamic QR Countdown Timer
  useEffect(() => {
    if (upiStep !== "QR_DISPLAY" || !upiQrData) return;

    const expiryTime = new Date(upiQrData.expires_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setQrSecondsLeft(diffSecs);
      if (diffSecs <= 0) {
        setIsQrExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [upiStep, upiQrData]);

  // Load POS Payment Modes
  useEffect(() => {
    const fetchPaymentModes = async () => {
      try {
        const res = await api.get("/api/v1/pos/payment-modes");
        const items = res.data?.items || [];
        setPaymentModes(items);
        if (items.length > 0) {
          setPaymentMethod((prev) => {
            const exists = items.some((m: any) => m.code === prev);
            return exists ? prev : items[0].code;
          });
        }
      } catch (err) {
        console.warn("Failed to load payment modes dynamically:", err);
      }
    };
    fetchPaymentModes();
  }, []);

  // POS MDR Calculation
  useEffect(() => {
    let isMounted = true;
    const amt = parseFloat(requestedAmount);
    if (!amt || isNaN(amt) || amt <= 0 || !paymentMethod) {
      setMdrBreakdown(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCalculatingMdr(true);
        const activeCode = retailerInfo?.code || walletData?.retailer_code || "";
        const res = await api.post("/api/v1/pos/calculate-mdr", {
          payment_mode: paymentMethod,
          transaction_amount: amt,
          retailer_id: activeCode || undefined
        });
        if (isMounted && res.data) {
          setMdrBreakdown(res.data);
          setErrorMessage(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setMdrBreakdown(null);
        }
      } finally {
        if (isMounted) setCalculatingMdr(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [requestedAmount, paymentMethod, retailerInfo, walletData]);

  // Fetch Requests History
  const fetchMyTopups = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingRequests(true);
      let userRefId: any = null;
      let userTypeRefId: any = 2;
      let retailerCode: string = "";
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            userTypeRefId = u.user_type_ref_id || 2;
            retailerCode = u.retailer_code || u.code || "";
          }
        } catch {}
      }
      const qParams = new URLSearchParams();
      qParams.set("user_type_ref_id", String(userTypeRefId || 2));
      if (userRefId) qParams.set("user_ref_id", String(userRefId));
      if (retailerCode) qParams.set("retailer_id", retailerCode);

      const res = await api.get(`/api/v1/topup/my-requests?${qParams.toString()}`);
      setMyRequests(res.data?.items || []);
      if (res.data?.retailer) {
        setRetailerInfo((prev) => {
          if (prev?.code === res.data.retailer.retailer_code && prev?.name === res.data.retailer.retailer_name) {
            return prev;
          }
          return {
            code: res.data.retailer.retailer_code,
            name: res.data.retailer.retailer_name
          };
        });
        if (res.data.retailer.current_wallet_balance !== undefined) {
          setWalletBalance(res.data.retailer.current_wallet_balance);
        }
      }
    } catch (err) {
      console.error("Failed to load my topup requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTopups(false);
  }, [fetchMyTopups]);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const amountPresets = [500, 1000, 2000, 5000, 10000, 25000, 50000];

  // ══════════════════════════════════════════════════════════════════════════════
  // UPI FLOW HANDLERS
  // ══════════════════════════════════════════════════════════════════════════════

  // 1. Generate Dynamic QR
  const handleGenerateUpiQr = async () => {
    const amt = parseFloat(upiAmount);
    if (isNaN(amt) || amt < 100) {
      setErrorMessage("Minimum UPI top-up amount is ₹100.00.");
      return;
    }
    if (amt > 200000) {
      setErrorMessage("Maximum UPI top-up amount is ₹2,00,000.00 per transaction.");
      return;
    }

    try {
      setGeneratingQr(true);
      setErrorMessage(null);

      const res = await api.post("/api/v1/topup/upi/generate-qr", {
        amount: amt,
        payment_mode: "UPI"
      });

      if (res.data?.success) {
        setUpiQrData(res.data);
        setQrSecondsLeft(res.data.expires_in_seconds || 900);
        setIsQrExpired(false);
        setUpiStep("QR_DISPLAY");
      }
    } catch (err: any) {
      console.error("Generate QR error:", err);
      const detail = err.response?.data?.detail || "Failed to generate dynamic UPI QR code. Please try again.";
      setErrorMessage(detail);
    } finally {
      setGeneratingQr(false);
    }
  };

  // 2. Handle File Selection & Auto OCR Scan
  const handleUpiScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Invalid format. Please upload JPG, PNG, or WEBP image.");
      return;
    }

    setUpiSlipFile(file);
    setUpiSlipPreview(URL.createObjectURL(file));
    setErrorMessage(null);

    // Trigger Upload to B2 and OCR Scan
    try {
      setUploadingAndScanning(true);
      setScanStatusMessage("Storing screenshot securely in Backblaze B2...");

      const formData = new FormData();
      formData.append("file", file);
      if (upiQrData?.amount) {
        formData.append("expected_amount", upiQrData.amount.toString());
      }
      if (upiQrData?.request_id) {
        formData.append("qr_request_id", upiQrData.request_id);
      }

      setScanStatusMessage("AI reading payment details (Amount, 12-digit UTR, App, UPI ID)...");
      const res = await api.post("/api/v1/topup/upi/upload-and-scan", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.data) {
        const d = res.data.data;
        setUploadedUpiSlip({
          slip_id: d.slip_id,
          slip_url: d.slip_url,
          storage_path: d.storage_path,
          checksum: d.checksum,
          file_size_bytes: d.file_size_bytes,
          original_filename: d.original_filename
        });

        const ext = d.extracted_details as OcrDetails;
        setOcrData(ext);

        // Pre-fill editable fields with OCR findings (fallback to requested amount / default app)
        setVerifiedAmount(ext.amount !== null && ext.amount !== undefined ? ext.amount.toString() : (upiQrData?.amount?.toString() || ""));
        setVerifiedUtr(ext.transaction_id || "");
        setVerifiedPaymentApp(ext.payment_app || "Google Pay");
        setVerifiedUpiId(ext.upi_id || "");
        setVerifiedPayerName(ext.payer_name || "");
        setVerifiedPaymentDate(ext.payment_date || new Date().toISOString().split("T")[0]);
        setVerifiedPaymentStatus(ext.payment_status || "Successful");

        // Advance to Verify Step
        setUpiStep("VERIFY");
      }
    } catch (err: any) {
      console.error("Upload & Scan error:", err);
      const detail = err.response?.data?.detail || "Failed to scan payment screenshot. Please verify image quality.";
      setErrorMessage(detail);
    } finally {
      setUploadingAndScanning(false);
    }
  };

  // 3. Final Submission of UPI Top-Up Request
  const handleSubmitUpiTopup = async () => {
    setErrorMessage(null);

    const amt = parseFloat(verifiedAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid payment amount.");
      return;
    }

    if (!verifiedUtr.trim()) {
      setErrorMessage("Transaction ID / UTR is mandatory. Please enter the 12-digit UPI UTR.");
      return;
    }

    if (!uploadedUpiSlip) {
      setErrorMessage("Payment screenshot proof is required.");
      return;
    }

    // Critical amount mismatch check
    if (upiQrData && Math.abs(amt - upiQrData.amount) > 0.01) {
      setErrorMessage(`Payment Amount Mismatch: QR requested amount was ₹${upiQrData.amount.toFixed(2)}, but detected/entered amount is ₹${amt.toFixed(2)}. Please verify or correct the amount.`);
      return;
    }

    try {
      setSubmittingUpi(true);

      const payload = {
        requested_amount: amt,
        payment_reference: verifiedUtr.trim(),
        payment_method: "UPI Top-Up",
        payment_mode: "UPI Top-Up",
        payment_date: new Date().toISOString(),
        slip_id: uploadedUpiSlip.slip_id,
        slip_url: uploadedUpiSlip.slip_url,
        slip_original_filename: uploadedUpiSlip.original_filename,
        slip_file_size_bytes: uploadedUpiSlip.file_size_bytes,
        slip_checksum: uploadedUpiSlip.checksum,
        retailer_remarks: retailerRemarks.trim() || undefined,
        payment_app: verifiedPaymentApp,
        payer_name: verifiedPayerName.trim() || undefined,
        payer_upi_id: verifiedUpiId.trim() || undefined,
        qr_request_id: upiQrData?.request_id,
        ocr_extracted_data: ocrData || undefined
      };

      let userRefId: any = null;
      let userTypeRefId: any = 2;
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            userTypeRefId = u.user_type_ref_id || 2;
          }
        } catch {}
      }
      const qParams = new URLSearchParams();
      qParams.set("user_type_ref_id", String(userTypeRefId || 2));
      if (userRefId) qParams.set("user_ref_id", String(userRefId));

      const res = await api.post(`/api/v1/topup/request?${qParams.toString()}`, payload);

      const newReqId = res.data.topup_request_id;
      setUpiCreatedRequest({
        request_id: newReqId,
        amount: amt,
        utr: verifiedUtr.trim(),
        app: verifiedPaymentApp
      });

      // Optimistically add to table
      const newClaim: TopupRequestItem = {
        id: res.data?.id || `req-${Date.now()}`,
        topup_request_id: newReqId,
        requested_amount: amt,
        approved_amount: undefined,
        payment_reference: verifiedUtr.trim(),
        payment_method: "UPI Top-Up",
        payment_mode: `UPI - ${verifiedPaymentApp}`,
        payment_date: new Date().toISOString(),
        slip_id: uploadedUpiSlip.slip_id,
        slip_url: uploadedUpiSlip.slip_url,
        status: "PENDING",
        submitted_at: new Date().toISOString(),
        received_amount: amt
      };
      setMyRequests((prev) => [newClaim, ...prev.filter(r => r.topup_request_id !== newReqId)]);

      // Advance to Success
      setUpiStep("SUCCESS");
      fetchMyTopups();
      refreshWallet();
      triggerWalletSync();
    } catch (err: any) {
      console.error("Submit UPI request error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to submit topup request.";
      setErrorMessage(detail);
    } finally {
      setSubmittingUpi(false);
    }
  };

  // Reset UPI form
  const handleResetUpiFlow = () => {
    setUpiStep("AMOUNT");
    setUpiAmount("");
    setUpiQrData(null);
    setUpiSlipFile(null);
    setUpiSlipPreview(null);
    setUploadedUpiSlip(null);
    setOcrData(null);
    setVerifiedAmount("");
    setVerifiedUtr("");
    setVerifiedUpiId("");
    setVerifiedPayerName("");
    setUpiCreatedRequest(null);
    setErrorMessage(null);
    if (upiFileInputRef.current) upiFileInputRef.current.value = "";
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // POS SETTLEMENT HANDLERS (EXISTING FLOW)
  // ══════════════════════════════════════════════════════════════════════════════

  const handlePosFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Invalid format. Please upload JPG, PNG, or WEBP image.");
      return;
    }

    setPosSlipFile(file);
    setPosSlipPreview(URL.createObjectURL(file));
    setErrorMessage(null);

    try {
      setUploadingPosSlip(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/api/v1/topup/upload-slip", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (uploadRes.data?.data) {
        setUploadedPosSlipData(uploadRes.data.data);
      }
    } catch (err: any) {
      console.error("POS slip upload error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to upload payment slip.";
      setErrorMessage(detail);
      setUploadedPosSlipData(null);
    } finally {
      setUploadingPosSlip(false);
    }
  };

  const handlePosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const amt = parseFloat(requestedAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid requested amount greater than ₹0.");
      return;
    }

    if (!paymentReference.trim()) {
      setErrorMessage("Please provide the Bank Reference / UTR Number from your payment receipt.");
      return;
    }

    if (!uploadedPosSlipData && !uploadingPosSlip) {
      setErrorMessage("Please upload your payment proof / bank transfer slip image.");
      return;
    }

    try {
      setSubmittingPos(true);
      const payload = {
        requested_amount: amt,
        payment_reference: paymentReference.trim(),
        payment_method: paymentMethod,
        payment_mode: paymentMethod,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        slip_id: uploadedPosSlipData?.slip_id,
        slip_url: uploadedPosSlipData?.slip_url,
        slip_original_filename: uploadedPosSlipData?.original_filename,
        slip_file_size_bytes: uploadedPosSlipData?.file_size,
        slip_checksum: uploadedPosSlipData?.checksum,
        retailer_remarks: retailerRemarks.trim() || undefined,
        mdr_charge: mdrBreakdown?.mdr,
        gst_amount: mdrBreakdown?.gst,
        charges: mdrBreakdown?.charges,
        received_amount: mdrBreakdown?.received_amount,
        mdr_config_id: mdrBreakdown?.mdr_config_id
      };

      let userRefId: any = null;
      let userTypeRefId: any = 2;
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            userTypeRefId = u.user_type_ref_id || 2;
          }
        } catch {}
      }
      const qParams = new URLSearchParams();
      qParams.set("user_type_ref_id", String(userTypeRefId || 2));
      if (userRefId) qParams.set("user_ref_id", String(userRefId));

      const res = await api.post(`/api/v1/topup/request?${qParams.toString()}`, payload);

      const newReqId = res.data.topup_request_id;
      setSuccessMessage(res.data.message || `Topup request ${newReqId} submitted successfully.`);

      const newClaim: TopupRequestItem = {
        id: res.data?.id || `req-${Date.now()}`,
        topup_request_id: newReqId,
        requested_amount: amt,
        approved_amount: undefined,
        payment_reference: paymentReference.trim(),
        payment_method: paymentMethod,
        payment_mode: paymentMethod,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        slip_id: uploadedPosSlipData?.slip_id,
        slip_url: uploadedPosSlipData?.slip_url,
        status: "PENDING",
        submitted_at: new Date().toISOString(),
        mdr_charge: mdrBreakdown?.mdr,
        gst_amount: mdrBreakdown?.gst,
        charges: mdrBreakdown?.charges,
        received_amount: mdrBreakdown?.received_amount
      };
      setMyRequests((prev) => [newClaim, ...prev.filter(r => r.topup_request_id !== newReqId)]);

      setRequestedAmount("");
      setPaymentReference("");
      setRetailerRemarks("");
      setPosSlipFile(null);
      setPosSlipPreview(null);
      setUploadedPosSlipData(null);
      setMdrBreakdown(null);
      if (posFileInputRef.current) posFileInputRef.current.value = "";

      fetchMyTopups();
      refreshWallet();
      triggerWalletSync();
    } catch (err: any) {
      console.error("Submit POS request error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to submit topup request.";
      setErrorMessage(detail);
    } finally {
      setSubmittingPos(false);
    }
  };

  // Format timer MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 font-sans">
      {/* ── Page Header & Wallet Balance Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-5 lg:pb-0 lg:pr-5">
          <div>
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  Retailer Wallet Top-Up
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold tracking-wide flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Instant UPI
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Generate dynamic UPI QR codes, upload payment screenshots with automated AI OCR verification, and receive immediate wallet credits.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 backdrop-blur">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Authenticated Identity:</strong> Funds will be credited strictly to Retailer Wallet <span className="font-mono text-amber-400 font-semibold">({retailerInfo?.code || "Retailer"})</span> with automated WhatsApp receipts.
            </span>
          </div>
        </div>

        {/* Live Wallet Balance Indicator */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Wallet className="h-4 w-4" />
              Current Wallet Balance
            </div>
            <button
              onClick={() => {
                fetchMyTopups();
                refreshWallet();
                triggerWalletSync();
              }}
              disabled={loadingRequests}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Refresh Balance"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>

          <div className="my-2.5">
            <div className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>{retailerInfo?.name || "Retailer Account"}</span>
              <span className="font-mono text-amber-400 font-semibold">{retailerInfo?.code}</span>
            </div>
          </div>

          <div className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Double-Entry Ledger Verified
          </div>
        </div>
      </div>

      {/* ── Mode Switcher Tabs ── */}
      <div className="flex items-center gap-3 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur max-w-xl">
        <button
          type="button"
          onClick={() => {
            setTopupMode("UPI");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            topupMode === "UPI"
              ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>UPI Top-Up (Dynamic QR)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
            topupMode === "UPI" ? "bg-slate-950/20 text-slate-950" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}>
            0% Fee
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTopupMode("POS");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            topupMode === "POS"
              ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Store className={`h-4 w-4 ${topupMode === "POS" ? "text-slate-950" : "text-amber-400"}`} />
          <span>POS Settlement Top-Up</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
            topupMode === "POS" ? "bg-slate-950/20 text-slate-950" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}>
            Terminal
          </span>
        </button>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 backdrop-blur">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 backdrop-blur">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* ── Main Layout: Flow Cards + Requests List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Active Flow Component (5 cols) ── */}
        <div className="lg:col-span-5">
          {topupMode === "UPI" ? (
            /* ══════════════════════════════════════════════════════════════════════
               UPI TOP-UP MULTI-STEP FLOW (Glassmorphism + Gold-Yellow Gradient)
               ══════════════════════════════════════════════════════════════════════ */
            <div className="bg-slate-900/80 border border-amber-500/20 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-2xl space-y-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    UPI Top-Up Service
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-amber-400/90 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {upiStep === "AMOUNT" && "Step 1: Enter Amount"}
                  {upiStep === "QR_DISPLAY" && "Step 2: Scan & Pay"}
                  {upiStep === "UPLOAD" && "Step 3: Upload Proof"}
                  {upiStep === "VERIFY" && "Step 4: Verify OCR"}
                  {upiStep === "CONFIRM" && "Step 5: Confirmation"}
                  {upiStep === "SUCCESS" && "Completed"}
                </span>
              </div>

              {/* ── SUB-STEP 1: AMOUNT SELECTION ── */}
              {upiStep === "AMOUNT" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-white">How much do you want to add?</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter the top-up amount to generate an instant dynamic UPI QR code.
                    </p>
                  </div>

                  {/* Amount Input with Gold Accent */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Top-Up Amount (₹) <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-amber-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="100"
                        max="200000"
                        placeholder="0.00"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 rounded-2xl text-2xl font-black text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Min: ₹100.00</span>
                      <span>Max: ₹2,00,000.00</span>
                    </div>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Quick Select Amount:</label>
                    <div className="flex flex-wrap gap-2">
                      {amountPresets.map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setUpiAmount(amt.toString())}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                            upiAmount === amt.toString()
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                              : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800"
                          }`}
                        >
                          ₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Features Banner */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      <span>Zero Processing Fees (0% MDR)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Instant verification with any UPI app including Google Pay, PhonePe, Paytm, BHIM, CRED and Amazon Pay.
                    </p>
                  </div>

                  {/* Generate QR Button */}
                  <button
                    type="button"
                    onClick={handleGenerateUpiQr}
                    disabled={generatingQr || !upiAmount || parseFloat(upiAmount) < 100}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingQr ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                        Generating Dynamic QR...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 text-slate-950" />
                        Generate Dynamic UPI QR Code
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── SUB-STEP 2: DYNAMIC QR CODE DISPLAY SCREEN ── */}
              {upiStep === "QR_DISPLAY" && upiQrData && (
                <div className="space-y-4">
                  {/* Company Branding & Amount Card */}
                  <div className="rounded-3xl border border-amber-500/30 bg-slate-950/90 p-5 text-center shadow-inner space-y-3 relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-amber-500/20 mb-1">
                        P2P
                      </div>
                      <h4 className="text-base font-black tracking-wider text-white">
                        Pay2Pay
                      </h4>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400/90">
                        {upiQrData.company_name}
                      </p>
                    </div>

                    {/* Amount in Gold-Yellow Gradient */}
                    <div className="py-2 border-y border-slate-800/80">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                        Amount to Pay
                      </span>
                      <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                        ₹{upiQrData.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center pt-1 pb-2">
                      <div className="p-3.5 bg-white rounded-3xl shadow-2xl shadow-amber-500/15 border-2 border-amber-400/60 relative">
                        <img
                          src={upiQrData.qr_data_url}
                          alt="Dynamic UPI QR Code"
                          className="w-52 h-52 object-contain rounded-xl"
                        />
                      </div>
                      <p className="text-xs font-semibold text-slate-300 mt-3 flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-amber-400" />
                        Scan using GPay / PhonePe / Paytm / BHIM
                      </p>
                    </div>

                    {/* Countdown Expiry Timer */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className={`h-3.5 w-3.5 ${isQrExpired ? "text-rose-400" : "text-amber-400"}`} />
                        Payment Request Expires In:
                      </span>
                      <span className={`font-mono font-extrabold text-sm ${
                        isQrExpired ? "text-rose-400" : qrSecondsLeft < 120 ? "text-rose-400 animate-pulse" : "text-amber-300"
                      }`}>
                        {isQrExpired ? "EXPIRED" : formatTimer(qrSecondsLeft)}
                      </span>
                    </div>

                    {/* Request Reference ID */}
                    <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
                      <span>Request ID:</span>
                      <span className="text-slate-200 font-semibold">{upiQrData.request_id}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiQrData.request_id, "req_id")}
                        className="text-slate-500 hover:text-white p-0.5"
                        title="Copy Request ID"
                      >
                        {copiedId === "req_id" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Copy & Download Actions */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiQrData.upi_id, "upi_id")}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all flex flex-col items-center gap-1 text-center"
                    >
                      {copiedId === "upi_id" ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-amber-400" />
                      )}
                      <span className="text-[10px] font-bold">Copy UPI ID</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiQrData.amount.toFixed(2), "amt")}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all flex flex-col items-center gap-1 text-center"
                    >
                      {copiedId === "amt" ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-amber-400" />
                      )}
                      <span className="text-[10px] font-bold">Copy Amount</span>
                    </button>

                    <a
                      href={upiQrData.qr_data_url}
                      download={`pay2pay-qr-${upiQrData.request_id}.png`}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all flex flex-col items-center gap-1 text-center"
                    >
                      <Download className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] font-bold">Download QR</span>
                    </a>
                  </div>

                  {/* Next Step Button */}
                  <button
                    type="button"
                    disabled={isQrExpired}
                    onClick={() => setUpiStep("UPLOAD")}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Payment Completed ➔ Upload Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetUpiFlow}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
                  >
                    ← Cancel / Change Amount
                  </button>
                </div>
              )}

              {/* ── SUB-STEP 3: PAYMENT SCREENSHOT UPLOAD ── */}
              {upiStep === "UPLOAD" && (
                <div className="space-y-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setUpiStep("QR_DISPLAY")}
                      className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 mb-2"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to QR Code
                    </button>
                    <h3 className="text-lg font-bold text-white">Upload Payment Screenshot</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload the successful GPay/PhonePe/UPI payment screenshot so our AI engine can automatically verify your transaction.
                    </p>
                  </div>

                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={upiFileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleUpiScreenshotChange}
                    className="hidden"
                    id="upi-proof-file"
                  />

                  {uploadingAndScanning ? (
                    <div className="p-8 rounded-3xl border-2 border-amber-500/40 bg-slate-950/90 flex flex-col items-center justify-center space-y-4 text-center relative overflow-hidden">
                      {/* Radar scan line effect */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse top-1/2" />
                      <div className="relative">
                        <ScanLine className="h-12 w-12 text-amber-400 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">{scanStatusMessage}</p>
                        <p className="text-[11px] text-slate-400">
                          Extracting Amount, 12-digit UTR, Payment App, and UPI ID...
                        </p>
                      </div>
                    </div>
                  ) : upiSlipPreview ? (
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={upiSlipPreview}
                          alt="Screenshot Proof"
                          className="h-20 w-20 object-cover rounded-xl border border-slate-800 cursor-pointer"
                          onClick={() => setLightboxImage(upiSlipPreview)}
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-semibold text-slate-200 truncate">{upiSlipFile?.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {upiSlipFile ? `${Math.round(upiSlipFile.size / 1024)} KB` : ""}
                          </p>
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1.5">
                            <Check className="h-3 w-3" />
                            Screenshot uploaded to B2 Cloud
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => upiFileInputRef.current?.click()}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUpiSlipFile(null);
                            setUpiSlipPreview(null);
                            setUploadedUpiSlip(null);
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label
                        htmlFor="upi-proof-file"
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-500/30 hover:border-amber-400/70 rounded-3xl bg-slate-950/60 cursor-pointer transition-all group"
                      >
                        <UploadCloud className="h-10 w-10 text-slate-500 group-hover:text-amber-400 transition-colors mb-2" />
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                          Click to select payment screenshot
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 text-center max-w-xs">
                          Supports PNG, JPG, JPEG, or WEBP from GPay, PhonePe, Paytm, or BHIM.
                        </p>
                      </label>

                      {/* Mobile Camera Direct Button */}
                      <button
                        type="button"
                        onClick={() => upiFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                      >
                        <Camera className="h-4 w-4 text-amber-400" />
                        Take Photo / Choose From Gallery
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── SUB-STEP 4: EDITABLE OCR VERIFICATION ── */}
              {upiStep === "VERIFY" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Please verify the detected payment details before submitting.</strong>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        Our AI engine auto-read the details below. You can correct any value before final submission.
                      </p>
                    </div>
                  </div>

                  {/* Critical Amount Mismatch Warning */}
                  {upiQrData && parseFloat(verifiedAmount || "0") !== upiQrData.amount && (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-rose-200">
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                        Payment Amount Mismatch
                      </div>
                      <p className="text-[11px]">
                        Requested Amount: <strong className="text-white">₹{upiQrData.amount.toFixed(2)}</strong> | Detected Amount: <strong className="text-white">₹{parseFloat(verifiedAmount || "0").toFixed(2)}</strong>
                      </p>
                      <p className="text-[10px] text-rose-300/80">
                        Please ensure the payment amount matches the requested QR amount.
                      </p>
                    </div>
                  )}

                  {/* Editable Fields Form */}
                  <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                    {/* Amount */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Payment Amount (₹) <span className="text-amber-400">*</span></span>
                        <Edit3 className="h-3 w-3 text-amber-400" />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={verifiedAmount}
                        onChange={(e) => setVerifiedAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Transaction ID / UTR */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Transaction ID / 12-Digit UTR <span className="text-amber-400">*</span></span>
                        <Edit3 className="h-3 w-3 text-amber-400" />
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 425812345678"
                        value={verifiedUtr}
                        onChange={(e) => setVerifiedUtr(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Payment App */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Payment Application</span>
                        <Edit3 className="h-3 w-3 text-amber-400" />
                      </label>
                      <select
                        value={verifiedPaymentApp}
                        onChange={(e) => setVerifiedPaymentApp(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Google Pay">Google Pay</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="Paytm">Paytm</option>
                        <option value="BHIM">BHIM</option>
                        <option value="CRED">CRED</option>
                        <option value="Amazon Pay">Amazon Pay</option>
                        <option value="Other UPI App">Other UPI App</option>
                      </select>
                    </div>

                    {/* Payer UPI ID */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Payer UPI ID (VPA)</span>
                        <Edit3 className="h-3 w-3 text-amber-400" />
                      </label>
                      <input
                        type="text"
                        placeholder="retailer@okhdfcbank"
                        value={verifiedUpiId}
                        onChange={(e) => setVerifiedUpiId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Payer Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Payer Name</span>
                        <Edit3 className="h-3 w-3 text-amber-400" />
                      </label>
                      <input
                        type="text"
                        placeholder="Retailer Account Name"
                        value={verifiedPayerName}
                        onChange={(e) => setVerifiedPayerName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setUpiStep("UPLOAD")}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      Re-Upload
                    </button>
                    <button
                      type="button"
                      disabled={!verifiedUtr.trim() || !verifiedAmount || parseFloat(verifiedAmount) <= 0}
                      onClick={() => setUpiStep("CONFIRM")}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Review & Confirm Request ➔</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── SUB-STEP 5: FINAL CONFIRMATION ── */}
              {upiStep === "CONFIRM" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Confirm UPI Top-Up Request</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify your top-up details before dispatching for administrative approval.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Requested Amount:</span>
                      <span className="font-bold text-white">
                        ₹{upiQrData ? upiQrData.amount.toFixed(2) : parseFloat(verifiedAmount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Payment Amount:</span>
                      <span className="font-bold text-emerald-400">
                        ₹{parseFloat(verifiedAmount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Payment App:</span>
                      <span className="font-semibold text-slate-200">{verifiedPaymentApp}</span>
                    </div>

                    {verifiedUpiId && (
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">UPI ID:</span>
                        <span className="font-mono text-slate-200">{verifiedUpiId}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Transaction ID / UTR:</span>
                      <span className="font-mono font-bold text-amber-300">{verifiedUtr}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Payment Status:</span>
                      <span className="font-bold text-emerald-400">✓ Successful</span>
                    </div>

                    <div className="flex justify-between py-1 items-center">
                      <span className="text-slate-400">Payment Screenshot:</span>
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Stored in B2 Cloud
                      </span>
                    </div>
                  </div>

                  {/* Optional Remarks */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Remarks (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Daily UPI working capital credit"
                      value={retailerRemarks}
                      onChange={(e) => setRetailerRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setUpiStep("VERIFY")}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                    >
                      ✎ Edit Details
                    </button>
                    <button
                      type="button"
                      disabled={submittingUpi}
                      onClick={handleSubmitUpiTopup}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingUpi ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 text-slate-950" />
                          Confirm & Submit Request
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SUB-STEP 6: SUCCESS MODAL ── */}
              {upiStep === "SUCCESS" && upiCreatedRequest && (
                <div className="p-6 rounded-3xl bg-slate-950/90 border border-emerald-500/30 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white">Top-Up Request Submitted!</h3>
                    <p className="text-xs text-slate-400">
                      Your request has been successfully created and forwarded for immediate administrative verification.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-left space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Request ID:</span>
                      <span className="font-mono font-bold text-amber-300">{upiCreatedRequest.request_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-emerald-400">₹{upiCreatedRequest.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transaction UTR:</span>
                      <span className="font-mono text-slate-200">{upiCreatedRequest.utr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-amber-400 font-semibold">Pending Approval</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    📲 <strong>WhatsApp Alert Dispatched:</strong> Admin has been alerted. Upon approval, your wallet will be credited automatically and you will receive a WhatsApp receipt.
                  </div>

                  <button
                    type="button"
                    onClick={handleResetUpiFlow}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-900/30 transition-all"
                  >
                    Submit Another Top-Up Request
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════
               POS SETTLEMENT TOP-UP (Glassmorphism + Gold-Yellow Gradient Flow)
               ══════════════════════════════════════════════════════════════════════ */
            <div className="bg-slate-900/80 border border-amber-500/20 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-2xl space-y-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    POS Settlement Top-Up
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-amber-400/90 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Swipe Terminal Claim
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">POS Working Capital Request</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter amount from your swipe terminal slip for instant verification and ledger credit.
                </p>
              </div>

              <form onSubmit={handlePosSubmit} className="space-y-5">
                {/* Amount Field + Quick Presets with Gold Accent */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex justify-between">
                    <span>Transaction Amount (₹) <span className="text-amber-400">*</span></span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-amber-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="100"
                      placeholder="0.00"
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 rounded-2xl text-2xl font-black text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      required
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-medium text-slate-400">Quick Select Amount:</label>
                    <div className="flex flex-wrap gap-2">
                      {amountPresets.map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setRequestedAmount(amt.toString())}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                            requestedAmount === amt.toString()
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                              : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800"
                          }`}
                        >
                          ₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mode Selector & Date */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Settlement Mode <span className="text-amber-400">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Choose Instant or T+1</span>
                    </label>

                    {/* Both Instant & T+1 Settlement Selector Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {paymentModes.length === 0 ? (
                         <div className="col-span-2 p-3 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                          No settlement modes active
                        </div>
                      ) : (
                        paymentModes.map((mode) => {
                          const isInstant = mode.code.toLowerCase().includes("instant");
                          const isSelected = paymentMethod === mode.code;
                          return (
                            <button
                              type="button"
                              key={mode.code}
                              onClick={() => setPaymentMethod(mode.code)}
                              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                isSelected
                                  ? "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40"
                                  : "bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{isInstant ? "⚡" : "📅"}</span>
                                  <span className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-white"}`}>
                                    {isInstant ? "POS - Instant" : "POS+T1"}
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    isSelected
                                      ? "bg-amber-400 text-slate-950 shadow-sm"
                                      : "bg-slate-800 text-slate-400 border border-slate-700"
                                  }`}
                                >
                                  {isInstant ? "1.65% Total" : "1.70% Total"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-tight">
                                {isInstant
                                  ? "Instant wallet credit upon verification"
                                  : "T+1 Next business day wallet credit"}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                  </div>
                </div>

                {/* MDR Breakdown Card with Amber Glow */}
                {parseFloat(requestedAmount || "0") > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-slate-950/90 p-4.5 space-y-3.5 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-amber-400" />
                        Live Fee & Settlement Breakdown
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono font-bold uppercase tracking-wider">
                        {paymentMethod.toLowerCase().includes("instant") ? "Instant (1.65% Total)" : "POS+T1 (1.70% Total)"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <span className="text-slate-400">Payment Mode</span>
                      <span className="text-right font-semibold text-white">
                        {paymentMethod.toLowerCase().includes("instant") ? "POS - Instant (1.65%)" : "POS+T1 (1.70%)"}
                      </span>

                      <span className="text-slate-400">Transaction Amount</span>
                      <span className="text-right font-black text-amber-400">
                        ₹{parseFloat(requestedAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>

                      <span className="text-slate-400">MDR</span>
                      <span className="text-right font-semibold text-amber-300">
                        {mdrBreakdown ? `₹${mdrBreakdown.mdr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : (calculatingMdr ? "..." : "₹0.00")}
                      </span>

                      <span className="text-slate-400">GST (18%)</span>
                      <span className="text-right font-semibold text-amber-300/90">
                        {mdrBreakdown ? `₹${mdrBreakdown.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : (calculatingMdr ? "..." : "₹0.00")}
                      </span>

                      <span className="text-slate-400">Charges</span>
                      <span className="text-right font-semibold text-slate-300">
                        {mdrBreakdown ? `₹${mdrBreakdown.charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : (calculatingMdr ? "..." : "₹0.00")}
                      </span>

                      <div className="col-span-2 pt-3 mt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Received Amount</span>
                          <span className="text-[10px] text-emerald-400/80">Credited to Retailer Wallet</span>
                        </div>
                        <span className="text-xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                          {mdrBreakdown
                            ? `₹${mdrBreakdown.received_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : (calculatingMdr ? "..." : `₹${parseFloat(requestedAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}`)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Reference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Bank Reference / UTR Number <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR123456789 or Terminal Txn Ref"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs font-mono font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    required
                  />
                </div>

                {/* Payment Slip Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex justify-between">
                    <span>Upload Payment Slip / Receipt <span className="text-amber-400">*</span></span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (Max 10MB)</span>
                  </label>

                  <input
                    type="file"
                    ref={posFileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePosFileChange}
                    className="hidden"
                    id="pos-slip-upload-input"
                  />

                  {posSlipPreview ? (
                    <div className="relative border border-amber-500/30 rounded-2xl p-3.5 bg-slate-950/90 flex items-center gap-3.5">
                      <img
                        src={posSlipPreview}
                        alt="Slip Preview"
                        className="h-16 w-16 object-cover rounded-xl border border-amber-500/20 cursor-pointer"
                        onClick={() => setLightboxImage(posSlipPreview)}
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-slate-200 truncate">{posSlipFile?.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {posSlipFile ? `${Math.round(posSlipFile.size / 1024)} KB` : ""}
                        </p>
                        {uploadingPosSlip ? (
                          <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mt-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Uploading to secure storage...
                          </span>
                        ) : uploadedPosSlipData ? (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" />
                            Receipt attached and ready
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPosSlipFile(null);
                          setPosSlipPreview(null);
                          setUploadedPosSlipData(null);
                          if (posFileInputRef.current) posFileInputRef.current.value = "";
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="pos-slip-upload-input"
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700/80 hover:border-amber-400/80 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 cursor-pointer transition-all group"
                    >
                      <UploadCloud className="h-8 w-8 text-amber-400/70 group-hover:text-amber-400 transition-colors mb-2 group-hover:scale-110 transform duration-200" />
                      <p className="text-xs font-bold text-slate-300 group-hover:text-white">
                        Click or drag & drop payment receipt
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Bank transfer slips & POS terminal receipts
                      </p>
                    </label>
                  )}
                </div>

                {/* Remarks */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Remarks / Note (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Daily POS working capital top-up"
                    value={retailerRemarks}
                    onChange={(e) => setRetailerRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                {/* Submit Button with Yellow Gradient */}
                <button
                  type="submit"
                  disabled={submittingPos || uploadingPosSlip || paymentModes.length === 0 || !paymentMethod}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingPos ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                      Submitting POS Topup Request...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 text-slate-950" />
                      Submit POS Topup Request
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right Column: My Topup Requests History (7 cols) ── */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-400" />
                My Top-up History & Claims
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Live status of your submitted UPI & POS requests</p>
            </div>
            <button
              onClick={fetchMyTopups}
              disabled={loadingRequests}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loadingRequests ? "animate-spin text-amber-400" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Net Credit</th>
                  <th className="py-3 px-3">Ref / UTR</th>
                  <th className="py-3 px-3 text-center">Proof</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                      Loading history...
                    </td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Info className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                      No topup requests submitted yet. Use the form on the left to request your first wallet top-up.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Request ID */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-200">
                        <div className="flex items-center gap-1">
                          <span>{item.topup_request_id}</span>
                          <button
                            onClick={() => copyToClipboard(item.topup_request_id, item.id)}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-3 font-medium text-slate-300">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                          (item.payment_mode || item.payment_method || "").toUpperCase().includes("UPI")
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold"
                        }`}>
                          {item.payment_mode || item.payment_method}
                        </span>
                      </td>

                      {/* Requested Amount */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-100">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Received / Approved Amount */}
                      <td className="py-3 px-3 text-right font-semibold">
                        {item.received_amount !== undefined && item.received_amount !== null ? (
                          <span className="text-emerald-400 font-bold">
                            ₹{item.received_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : item.approved_amount !== undefined && item.approved_amount !== null ? (
                          <span className="text-emerald-400 font-bold">
                            ₹{item.approved_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Mode / Ref */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-200 truncate max-w-[120px]" title={item.payment_reference}>
                          {item.payment_reference}
                        </div>
                      </td>

                      {/* Proof */}
                      <td className="py-3 px-3 text-center">
                        {item.slip_url ? (
                          <button
                            onClick={() => setLightboxImage(item.slip_url || null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] inline-flex items-center gap-1 border border-slate-700"
                          >
                            <FileImage className="h-3 w-3 text-amber-400" />
                            Proof
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : item.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : item.status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-slate-700 text-slate-300"
                        }`}>
                          {item.status === "PENDING" && <Clock className="h-2.5 w-2.5 animate-pulse" />}
                          {item.status === "APPROVED" && <Check className="h-2.5 w-2.5" />}
                          {item.status === "REJECTED" && <X className="h-2.5 w-2.5" />}
                          {item.status}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="py-3 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                        {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Image Lightbox Modal ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Payment Slip Proof"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
