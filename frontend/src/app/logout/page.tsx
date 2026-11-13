"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Purge all client-side storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    // 2. Clear all reachable cookies
    const cookieNames = [
      "p2p_token", "pay2pay_token", "p2p_access_token", "pay2pay_access_token", "pay2pay_auth_token",
      "p2p_sales_token", "pay2pay_sales_token", "p2p_retailer_token", "p2p_dist_token", "p2p_sd_token", "p2p_admin_token",
      "p2p_user_role", "pay2pay_user_role", "p2p_user_type_ref_id", "pay2pay_user_type_ref_id",
      "p2p_active_role", "p2p_active_destination", "p2p_destination", "p2p_account_access",
      "p2p_active_retailer_id", "p2p_retailer_code", "p2p_retailer_approval_status",
      "p2p_active_distributor_id", "p2p_distributor_code", "p2p_distributor_ref_id",
      "p2p_active_super_distributor_id", "p2p_super_distributor_code", "p2p_super_distributor_ref_id",
      "p2p_session_locked", "p2p_session_locked_at", "p2p_session_last_active", "p2p_session_start_time", "p2p_session_id",
      "token", "access_token"
    ];

    cookieNames.forEach((name) => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
    });

    // 3. Call backend logout with keepalive
    try {
      fetch("/api/v1/auth/enterprise/logout", {
        method: "POST",
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    } catch {}

    // 4. Redirect to login with logout parameter
    window.location.replace("/login?logout=true");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[#625B60]">Signing out securely...</p>
      </div>
    </div>
  );
}

