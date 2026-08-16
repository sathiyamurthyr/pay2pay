"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /retailer/dashboard → /retailer
 * The admin platform uses /retailer as the root retailer workstation.
 */
export default function RetailerDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/retailer");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-sm text-gray-400">
      Redirecting to Retailer Workstation…
    </div>
  );
}
