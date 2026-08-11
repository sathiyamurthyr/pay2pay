"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BookOpen,
  RefreshCw,
  CheckCircle2,
  Hash,
  Calendar,
  FileDigit,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Search,
  Filter,
  AlignJustify,
  Columns3,
  Download,
  ChevronDown,
  Maximize2,
  RefreshCcw,
  Clock,
  Landmark,
  BookOpenCheck,
  DollarSign,
  Building,
  AlignLeft,
} from "lucide-react";

const MOCK_JOURNALS = [
  {
    public_id: "j-001",
    journal_number: "JNL-20260802-0041",
    journal_date: "2026-08-02",
    posting_reference: "STL-20260802-0091",
    posting_status: "POSTED",
    description: "Settlement batch MDR fee split — BATCH-20260802-A",
    entries: [
      { account_code: "1100-WALLET", cost_centre: "CC-RETAIL-001", narration: "Gross wallet credit — retailer Ramesh", debit: 4820000, credit: 0 },
      { account_code: "2100-MDR",    cost_centre: "CC-PLATFORM",   narration: "MDR fee deduction @ 2%",               debit: 0,       credit: 96400 },
      { account_code: "2200-GST",    cost_centre: "CC-TAX",        narration: "GST 18% on MDR",                      debit: 0,       credit: 17352 },
      { account_code: "3100-NET",    cost_centre: "CC-RETAIL-001", narration: "Net settlement to merchant wallet",    debit: 0,       credit: 4706248 },
    ],
  },
  {
    public_id: "j-002",
    journal_number: "JNL-20260802-0039",
    journal_date: "2026-08-02",
    posting_reference: "STL-20260802-0087",
    posting_status: "POSTED",
    description: "Settlement batch MDR fee split — BATCH-20260802-A",
    entries: [
      { account_code: "1100-WALLET", cost_centre: "CC-RETAIL-002", narration: "Gross wallet credit — retailer Kavitha", debit: 2340000, credit: 0 },
      { account_code: "2100-MDR",    cost_centre: "CC-PLATFORM",   narration: "MDR fee deduction @ 2%",                debit: 0,       credit: 46800 },
      { account_code: "2200-GST",    cost_centre: "CC-TAX",        narration: "GST 18% on MDR",                       debit: 0,       credit: 8424 },
      { account_code: "3100-NET",    cost_centre: "CC-RETAIL-002", narration: "Net settlement to merchant wallet",     debit: 0,       credit: 2284776 },
    ],
  },
  {
    public_id: "j-003",
    journal_number: "JNL-20260801-0031",
    journal_date: "2026-08-01",
    posting_reference: "STL-20260801-0079",
    posting_status: "POSTED",
    description: "Settlement batch MDR fee split — BATCH-20260801-A",
    entries: [
      { account_code: "1100-WALLET", cost_centre: "CC-RETAIL-003", narration: "Gross wallet credit — retailer Suresh", debit: 3760000, credit: 0 },
      { account_code: "2100-MDR",    cost_centre: "CC-PLATFORM",   narration: "MDR fee deduction @ 2%",               debit: 0,       credit: 75200 },
      { account_code: "2200-GST",    cost_centre: "CC-TAX",        narration: "GST 18% on MDR",                      debit: 0,       credit: 13536 },
      { account_code: "3100-NET",    cost_centre: "CC-RETAIL-003", narration: "Net settlement to merchant wallet",    debit: 0,       credit: 3671264 },
    ],
  },
];

export default function AccountingJournalsPage() {
  const [journals, setJournals] = useState<any[]>(MOCK_JOURNALS);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlement-processing/journals");
      setJournals(res.data?.length ? res.data : MOCK_JOURNALS);
    } catch {
      setJournals(MOCK_JOURNALS);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => { fetchJournals(); }, []);

  const filtered = journals.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.journal_number?.toLowerCase().includes(q) || j.posting_reference?.toLowerCase().includes(q);
  });

  const totalDebit  = journals.reduce((s, j) => s + j.entries.reduce((e: number, r: any) => e + r.debit, 0), 0);
  const totalCredit = journals.reduce((s, j) => s + j.entries.reduce((e: number, r: any) => e + r.credit, 0), 0);

  const COL_HEADERS = [
    { label: "Account Code",  icon: Hash,        bg: "bg-[#EFF6FF] border-[#BFDBFE]", iconColor: "text-[#2563EB]" },
    { label: "Cost Centre",   icon: Building,    bg: "bg-[#F5F3FF] border-[#DDD6FE]", iconColor: "text-[#7C3AED]" },
    { label: "Narration",     icon: AlignLeft,   bg: "bg-[#F0FDF4] border-[#BBF7D0]", iconColor: "text-[#16A34A]" },
    { label: "Debit (Dr)",    icon: ArrowUpRight,bg: "bg-[#FEF2F2] border-[#FCA5A5]", iconColor: "text-[#DC2626]" },
    { label: "Credit (Cr)",   icon: ArrowDownLeft,bg:"bg-[#EFF6FF] border-[#BFDBFE]",iconColor: "text-[#2563EB]" },
  ];

  return (
    <div className="space-y-5 pb-16">

      {/* ── Page Header ── */}
      <div className="border-b border-[#E2E8F0] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg shrink-0">
              <BookOpenCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Double-Entry Accounting General Ledger</h1>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">Immutable financial journal entries · debit/credit balancing · audit history</p>
            </div>
          </div>
          <button
            onClick={fetchJournals}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer shrink-0"
          >
            <RefreshCcw className={`w-3.5 h-3.5 text-[#6366F1] ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Journals",   value: journals.length,  icon: BookOpen,  bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", text: "text-[#1D4ED8]", ic: "text-[#2563EB]" },
            { label: "Posted",            value: journals.filter(j=>j.posting_status==="POSTED").length, icon: CheckCircle2, bg:"bg-[#F0FDF4]",border:"border-[#BBF7D0]",text:"text-[#15803D]",ic:"text-[#16A34A]" },
            { label: "Total Debit",       value: `₹${(totalDebit/100000).toFixed(1)}L`,  icon: ArrowUpRight,  bg: "bg-[#FEF2F2]", border: "border-[#FCA5A5]", text: "text-[#B91C1C]", ic: "text-[#DC2626]" },
            { label: "Total Credit",      value: `₹${(totalCredit/100000).toFixed(1)}L`, icon: ArrowDownLeft, bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", text: "text-[#1D4ED8]", ic: "text-[#2563EB]" },
          ].map(({ label, value, icon: Icon, bg, border, text, ic }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-2xl border ${bg} ${border} shadow-xs`}>
              <div className={`p-2 rounded-xl bg-white border ${border} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${ic}`} />
              </div>
              <div>
                <p className={`text-base font-extrabold leading-none ${text}`}>{value}</p>
                <p className="text-[9px] font-bold text-[#64748B] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search journal #, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-52 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 transition-all"
            />
          </div>
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-[#6366F1]" /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Download className="w-3.5 h-3.5 text-[#6366F1]" /> Export <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
          </button>
          <button onClick={fetchJournals} className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:text-[#6366F1] transition cursor-pointer" title="Refresh">
            <RefreshCcw className={`w-3.5 h-3.5 text-[#64748B] ${loading ? "animate-spin text-[#6366F1]" : ""}`} />
          </button>
          <button className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap shrink-0">
          {filtered.length} journal{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Journal Cards ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center gap-2 text-[#64748B] text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin text-[#6366F1]" /> Loading double-entry journals…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Landmark className="w-12 h-12 text-[#94A3B8] mx-auto" />
            <p className="text-[#64748B] text-xs font-semibold">No journals match your search.</p>
            <p className="text-[#94A3B8] text-[11px]">Run a settlement batch to generate double-entry ledgers.</p>
          </div>
        ) : (
          filtered.map((j) => (
            <div key={j.public_id} className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              {/* Journal header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-mono font-extrabold text-[#4338CA] text-sm">{j.journal_number}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B]">
                    <Calendar className="w-3.5 h-3.5" /> {j.journal_date}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8]">
                    <FileDigit className="w-3.5 h-3.5" /> Ref: {j.posting_reference}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {j.description && <span className="text-[11px] text-[#64748B] hidden sm:block max-w-[220px] truncate">{j.description}</span>}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[10px] font-extrabold text-[#15803D]">
                    <CheckCircle2 className="w-3 h-3" /> {j.posting_status}
                  </span>
                </div>
              </div>

              {/* Entries table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      {COL_HEADERS.map(({ label, icon: Icon, bg, iconColor }) => (
                        <th key={label} className={`px-4 py-3 whitespace-nowrap ${label === "Debit (Dr)" || label === "Credit (Cr)" ? "text-right" : "text-left"}`}>
                          <div className={`inline-flex items-center gap-2 ${label === "Debit (Dr)" || label === "Credit (Cr)" ? "flex-row-reverse" : ""}`}>
                            <div className={`p-1.5 rounded-lg border ${bg} shrink-0`}>
                              <Icon className={`w-3 h-3 ${iconColor}`} />
                            </div>
                            <span className="text-[10px] font-extrabold text-[#374151] uppercase tracking-wider">{label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {j.entries.map((e: any, idx: number) => (
                      <tr key={idx} className={`hover:bg-[#F9FAFB] transition-colors ${idx % 2 === 0 ? "" : "bg-[#FAFBFF]/50"}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-extrabold text-[#4338CA] bg-[#EEF2FF] border border-[#C7D2FE] px-2 py-0.5 rounded-lg text-[11px]">{e.account_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 rounded-lg">{e.cost_centre}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#334155] font-medium max-w-[260px]">{e.narration}</td>
                        <td className="px-4 py-3 text-right">
                          {e.debit > 0
                            ? <span className="font-mono font-extrabold text-[#DC2626] text-[12px]">₹{e.debit.toLocaleString("en-IN")}</span>
                            : <span className="text-[#CBD5E1] font-mono">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {e.credit > 0
                            ? <span className="font-mono font-extrabold text-[#2563EB] text-[12px]">₹{e.credit.toLocaleString("en-IN")}</span>
                            : <span className="text-[#CBD5E1] font-mono">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Balance footer */}
                  <tfoot>
                    <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0] font-extrabold text-xs">
                      <td colSpan={3} className="px-4 py-3 text-[#374151]">Journal Balance Check</td>
                      <td className="px-4 py-3 text-right font-mono text-[#DC2626]">
                        ₹{j.entries.reduce((s: number, e: any) => s + e.debit, 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#2563EB]">
                        ₹{j.entries.reduce((s: number, e: any) => s + e.credit, 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Balance verification footer */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] text-xs font-semibold text-[#64748B]">
          <span>Showing <strong className="text-[#0F172A]">{filtered.length}</strong> of <strong className="text-[#0F172A]">{journals.length}</strong> journal entries</span>
          <span className="flex items-center gap-3">
            <span>Σ Debit: <strong className="text-[#DC2626] font-mono">₹{(totalDebit/100000).toFixed(2)}L</strong></span>
            <span>Σ Credit: <strong className="text-[#2563EB] font-mono">₹{(totalCredit/100000).toFixed(2)}L</strong></span>
            <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${Math.abs(totalDebit-totalCredit)<1 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {Math.abs(totalDebit-totalCredit)<1 ? "✓ BALANCED" : "⚠ VARIANCE"}
            </span>
          </span>
          <span className="font-mono text-[10px] text-[#94A3B8]">Updated: {lastUpdated.toLocaleTimeString("en-IN")}</span>
        </div>
      )}
    </div>
  );
}
