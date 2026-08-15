"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authentication check
  useEffect(() => {
    if (DEV_BYPASS || !mounted) return;
    if (!authLoading && !user) {
      router.replace("/retailer/login");
    }
  }, [user, authLoading, router, mounted]);

  return <RetailerLayout>{children}</RetailerLayout>;
}
