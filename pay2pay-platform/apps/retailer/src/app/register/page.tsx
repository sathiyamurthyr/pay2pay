"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <div className="py-8 text-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-400">Loading Pay2Pay Enterprise Onboarding Portal...</p>
    </div>
  );
}
