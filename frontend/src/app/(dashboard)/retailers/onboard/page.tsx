"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RetailerOnboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/register");
  }, [router]);

  return (
    <div className="py-12 text-center text-white">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs font-bold text-slate-400">Redirecting to Enterprise Registration Portal...</p>
    </div>
  );
}
