"use client";

import React, { useState } from "react";
import { Store, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface Step9Props {
  registrationId: string;
  onSuccess: (shopData: any) => void;
}

export const Step9Shop: React.FC<Step9Props> = ({ registrationId, onSuccess }) => {
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("Recharge & FinTech");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [employees, setEmployees] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("₹50 Lakhs - ₹1 Crore");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !category) {
      setErrorMsg("Please enter shop name and select category.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    const payload = {
      registration_id: registrationId,
      shop_name: shopName,
      category,
      years_in_business: parseInt(yearsInBusiness) || 5,
      employees: parseInt(employees) || 3,
      annual_turnover: annualTurnover
    };

    try {
      const res = await fetch("/api/v1/onboarding/shop-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(payload);
      } else {
        setErrorMsg(data.detail || "Failed to save shop details.");
      }
    } catch {
      setLoading(false);
      onSuccess(payload);
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Shop & Retailer Profile
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Provide shop information for commercial audit & terminal assignment.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Shop / Business Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Enter shop / business name"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              <option value="Recharge & FinTech">Recharge & FinTech</option>
              <option value="General Store / Kirana">General Store / Kirana</option>
              <option value="Mobile & Electronics">Mobile & Electronics</option>
              <option value="Medical & Pharmacy">Medical & Pharmacy</option>
              <option value="Other Commercial">Other Commercial</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Years in Business
            </label>
            <input
              type="number"
              value={yearsInBusiness}
              onChange={(e) => setYearsInBusiness(e.target.value)}
              placeholder="5"
              className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Estimated Annual Turnover
          </label>
          <select
            value={annualTurnover}
            onChange={(e) => setAnnualTurnover(e.target.value)}
            className="w-full px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          >
            <option value="Below ₹10 Lakhs">Below ₹10 Lakhs</option>
            <option value="₹10 Lakhs - ₹50 Lakhs">₹10 Lakhs - ₹50 Lakhs</option>
            <option value="₹50 Lakhs - ₹1 Crore">₹50 Lakhs - ₹1 Crore</option>
            <option value="Above ₹1 Crore">Above ₹1 Crore</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !shopName}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Shop Details...</span>
            </>
          ) : (
            <>
              <span>Save & Proceed to Address</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
