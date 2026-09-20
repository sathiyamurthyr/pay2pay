import React from "react";
import AuthPanel from "@/components/auth/AuthPanel";

export default function SuperDistributorLoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <AuthPanel portalRole="SD" />
      </div>
    </div>
  );
}
