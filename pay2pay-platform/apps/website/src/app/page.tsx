import React from "react";

export default function WebsiteHomePage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-8">
      <header className="flex justify-between items-center max-w-7xl mx-auto w-full py-4">
        <div className="text-2xl font-black text-indigo-400 tracking-wider">PAY2PAY</div>
        <div className="flex gap-4">
          <a href="https://ret.pay2pay.in/login" className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all">
            Retailer Login
          </a>
          <a href="https://admin.pay2pay.in/login" className="px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-all">
            Admin Portal
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto text-center my-auto py-16">
        <span className="px-3 py-1 text-xs rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest font-semibold">
          Enterprise FinTech Platform
        </span>
        <h1 className="text-5xl font-black text-white mt-6 tracking-tight leading-tight">
          Next-Generation Domestic Money Transfer & Banking Infrastructure
        </h1>
        <p className="text-lg text-slate-400 mt-6 leading-relaxed">
          Powering high-volume financial transactions, instant payouts, AEPS, and progressive onboarding for retail networks across India.
        </p>
      </main>

      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-900">
        © 2026 Pay2Pay Financial Technologies Pvt. Ltd. All rights reserved.
      </footer>
    </div>
  );
}
