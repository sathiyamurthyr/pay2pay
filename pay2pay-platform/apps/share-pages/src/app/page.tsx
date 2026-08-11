import React from "react";

export default function SharePagesHomePage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center items-center p-6 text-center">
      <h1 className="text-3xl font-extrabold text-indigo-400">PAY2PAY TRANSACTION SHARE PORTAL</h1>
      <p className="text-slate-400 mt-2 max-w-md">
        Secure public verification portal for Pay2Pay receipts, settlement invoices, and transaction statements.
      </p>
      <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
        Enter a valid transaction reference URL to view the digital receipt.
      </div>
    </div>
  );
}
