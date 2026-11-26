"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, ReceiptIndianRupee, Shield } from "lucide-react";
import {
  DemoProduct,
  fetchProducts,
  formatINR,
  getDemoToken,
  resolveDemoPath,
} from "@/lib/inspel-demo-api";
import { ProductIcon } from "@/components/inspel-demo/DemoShell";

export default function ProductCatalogueGrid({
  title = "Enterprise Payment Products",
  subtitle = "All eight INSPEL TECHNOLOGIES SOLUTIONS payment modules are available for individual purchase with transparent INR pricing and 18% GST.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<DemoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<DemoProduct | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((res) => setProducts(res.products || []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load products from backend.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleBuyNow = (product: DemoProduct) => {
    const checkoutPath = resolveDemoPath(`/checkout?product=${encodeURIComponent(product.product_id)}`);
    if (!getDemoToken()) {
      router.push(resolveDemoPath(`/login?next=${encodeURIComponent(checkoutPath)}`));
      return;
    }
    router.push(checkoutPath);
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1A56DB] mb-3">
            <ReceiptIndianRupee className="w-3.5 h-3.5" />
            Direct Single-Product Purchase • 18% GST Auto-Calculated
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#040E2B] tracking-tight">{title}</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">{subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-100 shadow-xs text-xs text-slate-600">
          <Shield className="w-4 h-4 text-[#10B981]" />
          <span>Trusted Backend Pricing • Instant BankMe Checkout</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin text-[#1A56DB]" />
          <span className="text-sm font-medium">Loading live catalogue &amp; GST pricing...</span>
        </div>
      )}

      {error && (
        <div className="p-5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.product_id}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-[#1A56DB]/50 shadow-xs hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-200 flex flex-col overflow-hidden"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] group-hover:bg-[#1A56DB] text-[#1A56DB] group-hover:text-white flex items-center justify-center transition-colors">
                    <ProductIcon name={product.icon} className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F0F4FF] text-[#1A56DB] border border-blue-100">
                    {product.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#040E2B] mb-1.5">{product.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed min-h-[42px]">
                  {product.description}
                </p>

                <ul className="mt-4 space-y-1.5 text-xs text-slate-500 flex-1">
                  {product.highlights.slice(0, 2).map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Base Price</span>
                    <span className="font-semibold text-slate-800">{formatINR(product.base_price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>GST ({product.gst_percent}%)</span>
                    <span className="font-medium text-slate-700">{formatINR(product.gst_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200">
                    <span className="font-semibold text-[#040E2B]">Total Payable</span>
                    <span className="text-base font-extrabold text-[#1A56DB]">
                      {formatINR(product.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-5 pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBuyNow(product)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Buy Now
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetails(product)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Specs
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-[#040E2B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#1A56DB] flex items-center justify-center">
                  <ProductIcon name={selectedDetails.icon} className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#1A56DB] uppercase">
                    {selectedDetails.code} • SAC {selectedDetails.hsn_sac}
                  </span>
                  <h3 className="text-xl font-bold text-[#040E2B]">{selectedDetails.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold px-2 py-1"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-relaxed">{selectedDetails.details}</p>

            <div className="mt-4 space-y-2">
              {selectedDetails.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-[#F8FAFF] border border-blue-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base Product Price</span>
                <span className="font-semibold">{formatINR(selectedDetails.base_price)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({selectedDetails.gst_percent}%)</span>
                <span className="font-semibold">{formatINR(selectedDetails.gst_amount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-100 font-bold text-[#040E2B] text-base">
                <span>Total Payable (incl. GST)</span>
                <span className="text-[#1A56DB]">{formatINR(selectedDetails.total_amount)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedDetails;
                  setSelectedDetails(null);
                  handleBuyNow(target);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] text-white text-sm font-semibold cursor-pointer"
              >
                Buy {selectedDetails.name}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
