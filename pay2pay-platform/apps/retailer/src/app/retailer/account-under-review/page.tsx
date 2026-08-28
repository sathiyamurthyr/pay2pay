"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthoritativeRetailerStatus } from "@/lib/retailer-destination-resolver";
import { VerificationPendingDashboard } from "@/components/dashboard/VerificationPendingDashboard";
import { RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function RetailerAccountUnderReviewPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Your retailer verification is currently under review.");
  const [retailerInfo, setRetailerInfo] = useState<{
    name: string;
    mobile: string;
    ref: string;
    status: string;
  }>({
    name: "Retailer Partner",
    mobile: "",
    ref: "P2P-REG-2026",
    status: "PENDING",
  });

  const checkStatus = async (showLoading = true) => {
    if (showLoading) setChecking(true);
    try {
      const data = await fetchAuthoritativeRetailerStatus(true);
      if (data) {
        setRetailerInfo({
          name: data.retailer_name || data.store_name || "Retailer Partner",
          mobile: data.registered_mobile || "",
          ref: data.application_reference || "P2P-REG-2026",
          status: data.verification_status || data.approval_status || "PENDING",
        });

        let dynamicMsg = data.status_message || "";
        if (!dynamicMsg) {
          if (data.approve_status && data.active_status) {
            dynamicMsg = "Your account is approved and active.";
          } else if (!data.approve_status && data.active_status) {
            dynamicMsg = "Your account approval is currently pending. Please wait for admin approval.";
          } else if (data.approve_status && !data.active_status) {
            dynamicMsg = "Your account is approved but currently inactive. Please wait until your account is activated.";
          } else {
            dynamicMsg = "Your account approval and activation are currently pending. Please wait for admin approval and activation.";
          }
        }
        setStatusMessage(dynamicMsg);

        if (data.approve_status === true && data.active_status === true) {
          document.cookie = `p2p_destination=DASHBOARD; path=/; max-age=2592000; SameSite=Lax`;
          document.cookie = `p2p_account_access=ALLOWED; path=/; max-age=2592000; SameSite=Lax`;
          router.replace("/retailer/dashboard");
        } else if (data.destination === "APPLICATION_REJECTED" || data.approval_status === "REJECTED") {
          router.replace("/application-rejected");
        } else if (data.destination === "ACCOUNT_RESTRICTED") {
          router.replace("/retailer/account-restricted");
        }
      }
    } catch (err) {
      console.warn("Status check notice:", err);
    } finally {
      if (showLoading) setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus(false);
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      document.cookie = "p2p_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "pay2pay_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "p2p_destination=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    logout();
    router.replace("/retailer/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-amber-500/20">
            P2P
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              Pay2Pay Retailer Portal
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Application Review
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Merchant: <strong className="text-slate-200">{retailerInfo.name}</strong> {retailerInfo.mobile ? `(${retailerInfo.mobile})` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => checkStatus(true)}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm hover:border-amber-500/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${checking ? "animate-spin" : ""}`} />
            <span>{checking ? "Checking..." : "Check Status"}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto flex-1">
        <VerificationPendingDashboard
          verificationStatus="UNDER_REVIEW"
          applicationRef={retailerInfo.ref}
          statusMessage={statusMessage}
          adminRemarks="Your merchant onboarding application has been submitted and is currently queued for enterprise admin verification. Once approved, all financial transaction services will immediately unlock."
        />
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 Pay2Pay Financial Technologies Pvt Ltd. All rights reserved.</p>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Support: support@pay2pay.in</span>
          <span>·</span>
          <span>Helpdesk: 1800-889-021</span>
        </div>
      </footer>
    </div>
  );
}
