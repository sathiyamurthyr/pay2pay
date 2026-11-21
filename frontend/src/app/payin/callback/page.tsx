"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resolveReceiptDomain } from "@/lib/receipt-security";
import { RefreshCw } from "lucide-react";

function PublicPayInCallbackRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    const ref =
      searchParams.get("referenceId") ||
      searchParams.get("reference_id") ||
      searchParams.get("tid") ||
      searchParams.get("orderId") ||
      "";

    // 1. If encrypted token or short code is present directly, redirect to receipt.<domain>/r/{token}
    if (token) {
      const receiptBase = resolveReceiptDomain();
      window.location.replace(`${receiptBase}/r/${encodeURIComponent(token)}`);
      return;
    }

    // 2. If plaintext reference is present, securely exchange for short URL via backend
    if (ref) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      fetch(`${apiBase}/api/v1/payin/receipt-token?reference_id=${encodeURIComponent(ref)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to resolve receipt");
          return res.json();
        })
        .then((data) => {
          if (data && (data.receipt_url || data.short_url || data.receipt_token)) {
            const targetUrl =
              data.receipt_url ||
              data.short_url ||
              `${resolveReceiptDomain(undefined, data.company_code)}/r/${encodeURIComponent(data.receipt_token)}`;
            window.location.replace(targetUrl);
          } else {
            router.replace("/login");
          }
        })
        .catch(() => {
          router.replace("/login");
        });
      return;
    }

    router.replace("/login");
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-8 text-slate-700">
      <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-sm font-semibold tracking-wide">
        Redirecting to Official Verified Receipt...
      </p>
    </div>
  );
}

export default function PublicPayInCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-8 text-slate-700">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide">
            Verifying Transaction...
          </p>
        </div>
      }
    >
      <PublicPayInCallbackRedirect />
    </Suspense>
  );
}
