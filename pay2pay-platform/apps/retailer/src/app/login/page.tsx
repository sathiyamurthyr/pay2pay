"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GenericLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/retailer/login");
  }, [router]);

  return null;
}
