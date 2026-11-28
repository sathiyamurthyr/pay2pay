"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import DemoShell from "@/components/inspel-demo/DemoShell";
import {
  DemoOrder,
  DemoPayment,
  downloadReceiptFile,
  formatINR,
  getDemoToken,
  openPrintableReceipt,
  resolveDemoPath,
  verifyPayment,
} from "@/lib/inspel-demo-api";

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceId =
    searchParams.get("reference_id") ||
    searchParams.get("referenceId") ||
    searchParams.get("ref") ||
    "";

  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [payment, setPayment] = useState<DemoPayment | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(
    async (silent = false) => {
      if (!referenceId) {
        setError("Missing payment reference ID.");
        setLoading(false);
        return;
      }
      if (!silent) setRefreshing(true);
      try {
        const res = await verifyPayment(referenceId);
        setOrder(res.order);
        setPayment(res.payment);
        setReceipt(res.receipt);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to verify payment status.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [referenceId]
  );

  useEffect(() => {
    if (!getDemoToken()) {
      const target = resolveDemoPath(`/payment-result?reference_id=${encodeURIComponent(referenceId)}`);
      router.replace(resolveDemoPath(`/login?next=${encodeURIComponent(target)}`));
      return;
    }
    checkStatus(false);
  }, [checkStatus, referenceId, router]);

  useEffect(() => {
    if (!payment || payment.status !== "PENDING") return;
    const timer = setInterval(() => {
      checkStatus(true);
    }, 6000);
    return () => clearInterval(timer);
  }, [payment, checkStatus]);

  const statusUpper = (payment?.status || "PENDING").toUpperCase();
  const isSuccess = statusUpper === "SUCCESS";
  const isFailed = statusUpper === "FAILED";

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A56DB] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">
            Verifying live transaction status with BankMe Pay-in API...
          </p>
        </div>
      ) : error && !payment ? (
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Unable to Verify Payment</h1>
          <p className="text-sm text-red-700">{error}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href={resolveDemoPath("/dashboard")}
              className="px-5 py-2.5 rounded-xl bg-[#1A56DB] text-white text-sm font-semibold"
            >
              Open Vendor Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-blue-900/5 overflow-hidden">
          <div
            className={`px-7 py-7 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isSuccess
                ? "bg-gradient-to-r from-emerald-700 to-emerald-500"
                : isFailed
                ? "bg-gradient-to-r from-red-700 to-rose-500"
                : "bg-gradient-to-r from-amber-600 to-amber-500"
            }`}
          >
            <div className="flex items-start gap-3.5">
              {isSuccess ? (
                <CheckCircle2 className="w-9 h-9 shrink-0" />
              ) : isFailed ? (
                <AlertTriangle className="w-9 h-9 shrink-0" />
              ) : (
                <Clock className="w-9 h-9 shrink-0" />
              )}
              <div>
                <div className="text-xs uppercase font-bold tracking-wider opacity-90">
                  BankMe Pay-in Verification
                </div>
                <h1 className="text-2xl font-extrabold mt-0.5">
                  {isSuccess
                    ? "Payment Successful"
                    : isFailed
                    ? "Payment Failed"
                    : "Payment Pending Confirmation"}
                </h1>
                <p className="text-xs opacity-90 mt-1">
                  {isSuccess
                    ? "Your payment has been verified and your GST tax receipt is ready."
                    : isFailed
                    ? payment?.failure_reason || "Transaction was declined, cancelled, or expired."
                    : "Awaiting final settlement callback or gateway completion from BankMe."}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-85">Amount</div>
              <div className="text-2xl font-extrabold">{formatINR(payment?.amount)}</div>
            </div>
          </div>

          <div className="p-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100">
                <div className="text-[11px] text-slate-500">Product</div>
                <div className="font-bold text-[#040E2B] mt-0.5">{order?.product_name}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100">
                <div className="text-[11px] text-slate-500">Order ID</div>
                <div className="font-mono font-semibold text-[#040E2B] mt-0.5">{order?.order_code}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100">
                <div className="text-[11px] text-slate-500">BankMe Reference ID</div>
                <div className="font-mono font-semibold text-[#040E2B] mt-0.5 break-all">{payment?.reference_id}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100">
                <div className="text-[11px] text-slate-500">Gateway Order ID / UTR</div>
                <div className="font-mono font-semibold text-[#040E2B] mt-0.5">
                  {payment?.bankme_order_id || "Pending"} {payment?.utr ? `• ${payment.utr}` : ""}
                </div>
              </div>
            </div>

            {order && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base Price</span>
                  <span>{formatINR(order.base_price)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST ({order.gst_percent}%)</span>
                  <span>{formatINR(order.gst_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-[#040E2B]">
                  <span>Total (incl. GST)</span>
                  <span className="text-[#1A56DB]">{formatINR(order.total_amount)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {isSuccess && payment?.reference_id && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadReceiptFile(payment.reference_id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-sm font-semibold cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => openPrintableReceipt(payment.reference_id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt {receipt?.receipt_code ? `(${String(receipt.receipt_code)})` : ""}
                  </button>
                </>
              )}

              {!isSuccess && (
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => checkStatus(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] text-white text-sm font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  Check Status
                </button>
              )}

              {!isSuccess && payment?.payment_url && statusUpper === "PENDING" && (
                <a
                  href={payment.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50 text-sm font-semibold"
                >
                  Open BankMe Checkout <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {isFailed && order?.product_id && (
                <Link
                  href={resolveDemoPath(`/checkout?product=${encodeURIComponent(order.product_id)}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] text-white text-sm font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Payment
                </Link>
              )}

              <Link
                href={resolveDemoPath("/dashboard")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold ml-auto"
              >
                Vendor Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InspelDemoPaymentResultPage() {
  return (
    <DemoShell>
      <Suspense fallback={<div className="p-16 text-center text-sm text-slate-500">Loading payment status...</div>}>
        <PaymentResultContent />
      </Suspense>
    </DemoShell>
  );
}
