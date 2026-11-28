"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import DemoShell, { ProductIcon } from "@/components/inspel-demo/DemoShell";
import {
  DemoContactInfo,
  DemoOrder,
  DemoPayment,
  DemoVendor,
  downloadReceiptFile,
  fetchDashboard,
  formatINR,
  getDemoToken,
  openPrintableReceipt,
  resolveDemoPath,
} from "@/lib/inspel-demo-api";

export default function InspelDemoDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<DemoVendor | null>(null);
  const [summary, setSummary] = useState<{
    total_orders: number;
    paid_orders: number;
    pending_orders: number;
    failed_orders: number;
    purchased_products_count: number;
    total_spent_inr: number;
    total_gst_paid_inr: number;
    receipts_count: number;
  } | null>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [payments, setPayments] = useState<DemoPayment[]>([]);
  const [receipts, setReceipts] = useState<Array<Record<string, unknown>>>([]);
  const [contact, setContact] = useState<DemoContactInfo | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    fetchDashboard()
      .then((res) => {
        setVendor(res.vendor);
        setSummary(res.summary);
        setPurchasedProducts(res.purchased_products || []);
        setOrders(res.orders || []);
        setPayments(res.payments || []);
        setReceipts(res.receipts || []);
        setContact(res.contact || null);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!getDemoToken()) {
      router.replace(resolveDemoPath(`/login?next=${encodeURIComponent(resolveDemoPath("/dashboard"))}`));
      return;
    }
    loadData();
  }, [loadData, router]);

  const statusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PAID" || s === "SUCCESS" || s === "ISSUED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> {s}
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3" /> FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> {s || "PENDING"}
      </span>
    );
  };

  return (
    <DemoShell>
      <div className="bg-gradient-to-r from-[#040E2B] to-[#0F1E5C] text-white py-9 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              Isolated Vendor Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
              {vendor ? `${vendor.name} — Order & Receipt Dashboard` : "Vendor Dashboard"}
            </h1>
            {vendor && (
              <p className="text-xs sm:text-sm text-blue-200/90 mt-1">
                {vendor.company_name} • {vendor.email} • {vendor.mobile}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#040E2B] text-xs font-bold shadow-sm border border-white/80 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#1A56DB]" /> Refresh
            </button>
            <Link
              href={resolveDemoPath("/catalogue")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-bold text-white shadow-md ring-1 ring-white/25 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Buy More Products
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {loading && (
          <div className="py-16 flex items-center justify-center gap-3 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin text-[#1A56DB]" />
            <span className="text-sm font-medium">Loading vendor orders &amp; receipts...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && summary && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Purchased Products</div>
                <div className="text-2xl font-extrabold text-[#040E2B] mt-1">
                  {summary.purchased_products_count}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1">{summary.paid_orders} Paid Orders</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Total Spent (incl. GST)</div>
                <div className="text-2xl font-extrabold text-[#1A56DB] mt-1">
                  {formatINR(summary.total_spent_inr)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Includes {formatINR(summary.total_gst_paid_inr)} GST (18%)
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">All Orders</div>
                <div className="text-2xl font-extrabold text-[#040E2B] mt-1">
                  {summary.total_orders}
                </div>
                <div className="text-[11px] text-amber-600 mt-1">
                  {summary.pending_orders} Pending • {summary.failed_orders} Failed
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Issued GST Receipts</div>
                <div className="text-2xl font-extrabold text-[#10B981] mt-1">
                  {summary.receipts_count}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Downloadable anytime</div>
              </div>
            </div>

            {/* Purchased Products */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <PackageCheck className="w-5 h-5 text-[#1A56DB]" />
                <h2 className="text-lg font-bold text-[#040E2B]">Purchased Products</h2>
              </div>
              {purchasedProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No completed product purchases yet.{" "}
                  <Link href={resolveDemoPath("/catalogue")} className="text-[#1A56DB] font-semibold hover:underline">
                    Browse the 8 products
                  </Link>{" "}
                  to complete your first purchase.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {purchasedProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#F8FAFF] border border-blue-100 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#1A56DB] text-white flex items-center justify-center">
                          <ProductIcon name={String(p.product_icon || "CreditCard")} className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#040E2B]">{String(p.product_name || "")}</div>
                          <div className="text-[11px] text-emerald-700 font-semibold">Active License</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600">{String(p.product_description || "")}</div>
                      <div className="text-xs font-mono text-slate-500 pt-1 border-t border-blue-100">
                        {String(p.order_code || "")} • {formatINR(Number(p.total_amount || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order & Payment History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#040E2B]">
                  Order History, GST Breakdown &amp; BankMe Transactions
                </h2>
                <span className="text-xs text-slate-500">{payments.length} transactions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8FAFF] text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Order &amp; Product</th>
                      <th className="px-5 py-3">Reference IDs</th>
                      <th className="px-5 py-3">Base + GST (18%)</th>
                      <th className="px-5 py-3">Total (INR)</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                          No orders placed yet under this vendor account.
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => {
                        const matchedPay = payments.find((p) => p.order_ref_id === ord.order_ref_id);
                        const refId = ord.reference_id || matchedPay?.reference_id || "";
                        const payStatus = matchedPay?.status || ord.status;
                        return (
                          <tr key={ord.order_ref_id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-4">
                              <div className="font-bold text-[#040E2B]">{ord.product_name}</div>
                              <div className="font-mono text-[11px] text-slate-500">{ord.order_code}</div>
                            </td>
                            <td className="px-5 py-4 font-mono text-[11px] text-slate-600">
                              <div>Ref: {refId || "—"}</div>
                              {ord.bankme_order_id && <div>GW: {ord.bankme_order_id}</div>}
                              {matchedPay?.utr && <div className="text-emerald-700">UTR: {matchedPay.utr}</div>}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600">
                              <div>{formatINR(ord.base_price)}</div>
                              <div>+ {formatINR(ord.gst_amount)} GST</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-[#040E2B]">
                              {formatINR(ord.total_amount)}
                            </td>
                            <td className="px-5 py-4">{statusBadge(payStatus)}</td>
                            <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                              {refId && (
                                <Link
                                  href={resolveDemoPath(`/payment-result?reference_id=${encodeURIComponent(refId)}`)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-[#040E2B] transition-colors"
                                >
                                  Details <ExternalLink className="w-3 h-3 text-[#1A56DB]" />
                                </Link>
                              )}
                              {payStatus === "SUCCESS" && refId && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => downloadReceiptFile(refId)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" /> Receipt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPrintableReceipt(refId)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 text-[#1A56DB] text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3" /> Print
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receipts & Support */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck2 className="w-5 h-5 text-[#10B981]" />
                  <h2 className="text-lg font-bold text-[#040E2B]">Downloadable Tax Receipts</h2>
                </div>
                {receipts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    GST receipts appear here automatically upon successful BankMe payment completion.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((rcp, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-mono font-bold text-xs text-[#1A56DB]">
                            {String(rcp.receipt_code || "")}
                          </div>
                          <div className="text-sm font-semibold text-[#040E2B]">
                            {String(rcp.product_name || "")} • {formatINR(Number(rcp.total_amount || 0))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadReceiptFile(String(rcp.reference_id || ""))}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1A56DB] hover:bg-[#1648C8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download HTML Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {contact && (
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2 text-sm">
                  <h2 className="text-lg font-bold text-[#040E2B] mb-2">INSPEL Support Contact</h2>
                  <p className="font-semibold text-slate-800">{contact.company_name}</p>
                  <p className="text-xs text-slate-600">{contact.address}</p>
                  <p className="text-xs text-slate-600">Email: {contact.email}</p>
                  <p className="text-xs text-slate-600">Phone: {contact.phone}</p>
                  <p className="text-xs text-slate-500">CIN: {contact.cin}</p>
                  <div className="pt-2">
                    <Link
                      href={resolveDemoPath("/contact")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56DB] hover:underline"
                    >
                      Open Contact Us &amp; Enquiry Form <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DemoShell>
  );
}
