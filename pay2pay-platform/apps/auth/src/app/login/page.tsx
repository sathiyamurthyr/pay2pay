import React from "react";
import AuthPanel from "@/components/auth/AuthPanel";

export default function AuthPortalLoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center items-center p-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-amber-400 tracking-tight">PAY2PAY IDENTITY & SSO</h1>
        <p className="text-sm text-slate-400 mt-1">Centralized Authentication Service</p>
      </div>
      <div className="w-full max-w-md">
        <AuthPanel />
      </div>
    </div>
  );
}
