"use client";

export const dynamic = "force-dynamic";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/operations/topup-requests${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function AdminTopupRequestsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectComponent />
    </Suspense>
  );
}
