"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAuthoritativeRetailerStatus,
  getCanonicalDestinationRoute,
} from "@/lib/retailer-destination-resolver";

export default function GenericDashboardRedirect() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    (async () => {
      const status = await fetchAuthoritativeRetailerStatus(false);
      if (status) {
        const target = getCanonicalDestinationRoute(status.destination);
        router.replace(target);
      } else {
        router.replace("/retailer/dashboard");
      }
    })();
  }, [router]);

  return null;
}
