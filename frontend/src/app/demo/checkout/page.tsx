"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import DemoShell, { ProductIcon } from "@/components/inspel-demo/DemoShell";
import {
  DemoProduct,
  DemoVendor,
  fetchMe,
  fetchProductById,
  formatINR,
  getDemoToken,
  getStoredVendor,
  initiatePayment,
  resolveDemoPath,
} from "@/lib/inspel-demo-api";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product") || "payments";

  const [product, setProduct] = useState<DemoProduct | null>(null);
  const [vendor, setVendor] = useState<DemoVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  useEffect(() => {
    const token = getDemoToken();
    if (!token) {
      const nextCheckout = resolveDemoPath(`/checkout?product=${encodeURIComponent(productId)}`);
      router.replace(resolveDemoPath(`/login?next=${encodeURIComponent(nextCheckout)}`));
      return;
    }
    const cachedVendor = getStoredVendor();
    if (cachedVendor) setVendor(cachedVendor);

    Promise.all([fetchProductById(productId), fetchMe()])
      .then(([prodRes, meRes]) => {
        setProduct(prodRes.product);
        setVendor(meRes.vendor);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load checkout details.");
      })
      .finally(() => setLoading(false));
  }, [productId, router]);

  const handleConfirmAndPay = async () => {
    if (!confirmed || !product) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await initiatePayment({
        product_id: product.product_id,
        confirmed_amount: true,
        idempotency_key: idempotencyKey,
      });
      if (res.payment_url) {
        setPaymentRedirectUrl(res.payment_url);
        window.location.href = res.payment_url;
      } else {
        router.push(resolveDemoPath(`/payment-result?reference_id=${encodeURIComponent(res.reference_id)}`));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment initiation failed.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-6 h-6 animate-spin text-[#1A56DB]" />
        <span className="text-sm font-medium">Loading secure checkout summary...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href={resolveDemoPath("/catalogue")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1A56DB] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Product Catalogue
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#040E2B]">
          Checkout &amp; Cost Confirmation
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Verify your selected INSPEL product, vendor billing profile, and 18% GST calculation before initiating BankMe Pay-in.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {paymentRedirectUrl && (
        <div className="mb-6 p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm">BankMe Payment Session Ready</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Redirecting to official BankMe hosted checkout. If it did not open automatically, click the button.
            </p>
          </div>
          <a
            href={paymentRedirectUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-sm font-semibold shrink-0"
          >
            Continue to BankMe <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {product && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {/* Selected Product Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                1. Selected Product
              </div>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#1A56DB] flex items-center justify-center shrink-0">
                  <ProductIcon name={product.icon} className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-[#040E2B]">{product.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0F4FF] text-[#1A56DB] border border-blue-100">
                      {product.code}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{product.description}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{product.details}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor Details Card */}
            {vendor && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  2. Vendor &amp; Billing Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100/80">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#1A56DB]" /> Vendor Name
                    </div>
                    <div className="font-semibold text-[#040E2B] mt-1">{vendor.name}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100/80">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#1A56DB]" /> Company Name
                    </div>
                    <div className="font-semibold text-[#040E2B] mt-1">{vendor.company_name}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100/80">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#1A56DB]" /> Email Address
                    </div>
                    <div className="font-semibold text-[#040E2B] mt-1 break-all">{vendor.email}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-blue-100/80">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#1A56DB]" /> Mobile Number
                    </div>
                    <div className="font-semibold text-[#040E2B] mt-1 font-mono">{vendor.mobile}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transparent Cost Breakdown & Payment CTA */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border-2 border-[#1A56DB]/20 shadow-xl shadow-blue-900/5 overflow-hidden sticky top-24">
              <div className="bg-[#040E2B] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">
                    Order Summary
                  </div>
                  <div className="text-base font-bold">Transparent GST Breakdown</div>
                </div>
                <ShieldCheck className="w-6 h-6 text-[#10B981]" />
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Price ({product.name})</span>
                    <span className="font-semibold text-slate-900">{formatINR(product.base_price)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Additional Applicable Charges</span>
                    <span className="font-medium text-slate-700">{formatINR(product.additional_charges)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value</span>
                    <span className="font-semibold text-slate-900">{formatINR(product.taxable_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({product.gst_percent}%)</span>
                    <span className="font-semibold text-slate-900">{formatINR(product.gst_amount)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-slate-100 flex justify-between items-baseline">
                    <span className="text-base font-bold text-[#040E2B]">Final Payable Amount</span>
                    <span className="text-2xl font-extrabold text-[#1A56DB]">
                      {formatINR(product.total_amount)}
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-[#F0F4FF] border border-blue-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#1A56DB] rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I confirm the selected product <strong>{product.name}</strong> and authorize payment of{" "}
                    <strong className="text-[#040E2B]">{formatINR(product.total_amount)}</strong> (inclusive of{" "}
                    {product.gst_percent}% GST) through the official BankMe Pay-in API.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!confirmed || submitting}
                  onClick={handleConfirmAndPay}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating BankMe Order...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Confirm and Pay {formatINR(product.total_amount)}
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  Final payable amount is calculated &amp; verified by backend configuration using official BankMe Pay-in credentials.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InspelDemoCheckoutPage() {
  return (
    <DemoShell>
      <Suspense fallback={<div className="p-16 text-center text-sm text-slate-500">Loading checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </DemoShell>
  );
}
