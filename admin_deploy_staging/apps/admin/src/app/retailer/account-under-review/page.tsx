"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RetailerAccountUnderReviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/retailer/dashboard");
  }, [router]);

  return null;
}
