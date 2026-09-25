"use client";

import React, { useState } from "react";
import { Store, ArrowRight, ArrowLeft, Loader2, AlertCircle, Building, Users, Calendar } from "lucide-react";

interface Step9Props {
  registrationId: string;
  initialShop?: any;
  onSuccess: (shopData: any) => void;
  onBack?: () => void;
}

export const Step9Shop: React.FC<Step9Props> = ({
  registrationId,
  initialShop = {},
  onSuccess,
  onBack
}) => {
  const [shopName, setShopName] = useState(initialShop?.shop_name || "");
  const [category, setCategory] = useState(initialShop?.category || "Recharge & FinTech");
  const [yearsInBusiness, setYearsInBusiness] = useState(
    initialShop?.years_in_business ? String(initialShop.years_in_business) : "5"
  );
  const [employees, setEmployees] = useState(
    initialShop?.employees ? String(initialShop.employees) : "3"
  );
  const [annualTurnover, setAnnualTurnover] = useState(
    initialShop?.annual_turnover || "₹50 Lakhs - ₹1 Crore"
  );
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
      shop_name: shopName.trim(),
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
    <div className="space-y-5 select-none font-sans">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Shop & Merchant Profile
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Provide shop information for commercial audit & terminal assignment.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Shop / Business Name <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Enter shop or business name"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Business Category <span className="text-[#DC2626]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
          >
            <option value="Recharge & FinTech">Recharge & FinTech Services</option>
            <option value="Telecom & Mobile Accessories">Telecom & Mobile Accessories</option>
            <option value="Grocery & Kirana Store">Grocery & Kirana Store</option>
            <option value="Pharmacy & Medicals">Pharmacy & Medicals</option>
            <option value="Stationery & Cyber Cafe">Stationery & Cyber Cafe</option>
            <option value="Other Retail Business">Other Retail Business</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Years in Operation
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="number"
                min="0"
                max="60"
                value={yearsInBusiness}
                onChange={(e) => setYearsInBusiness(e.target.value)}
                placeholder="e.g. 5"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Store Staff / Employees
            </label>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="number"
                min="1"
                max="50"
                value={employees}
                onChange={(e) => setEmployees(e.target.value)}
                placeholder="e.g. 3"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Estimated Annual Turnover
          </label>
          <select
            value={annualTurnover}
            onChange={(e) => setAnnualTurnover(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
          >
            <option value="Below ₹10 Lakhs">Below ₹10 Lakhs</option>
            <option value="₹10 Lakhs - ₹25 Lakhs">₹10 Lakhs - ₹25 Lakhs</option>
            <option value="₹25 Lakhs - ₹50 Lakhs">₹25 Lakhs - ₹50 Lakhs</option>
            <option value="₹50 Lakhs - ₹1 Crore">₹50 Lakhs - ₹1 Crore</option>
            <option value="Above ₹1 Crore">Above ₹1 Crore</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !shopName}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>Save & Continue to Address</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
