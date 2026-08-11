"use client";

import React, { useState } from "react";
import {
  Search, Download, FileText, Share2, ChevronLeft, ChevronRight, Check, X, Printer, Mail, MessageSquare, ChevronDown
} from "lucide-react";

interface GridToolbarPaginationProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  exportData?: any[];
  exportFilename?: string;
  title?: string;
}

export const GridToolbarPagination: React.FC<GridToolbarPaginationProps> = ({
  searchQuery,
  onSearchChange,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  exportData = [],
  exportFilename = "export_data",
  title = "Data Grid"
}) => {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // 📥 Export CSV Handler
  const handleExportCSV = () => {
    if (!exportData || exportData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = Object.keys(exportData[0]);
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of exportData) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ("" + (val ?? "")).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exportFilename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 📄 Export PDF / Print Handler
  const handlePrintPDF = () => {
    window.print();
  };

  // 💬 Share to WhatsApp
  const handleShareWhatsApp = () => {
    setShowShareMenu(false);
    const text = `📊 Pay2Pay Report: ${title}\n📍 Page Link: ${window.location.href}\n🔢 Total Records: ${totalItems}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // 📧 Share via Email
  const handleShareEmail = () => {
    setShowShareMenu(false);
    const subject = encodeURIComponent(`Pay2Pay Data Report - ${title}`);
    const body = encodeURIComponent(`Hello,\n\nPlease find the Pay2Pay data report summary below:\n\nTitle: ${title}\nTotal Records: ${totalItems}\nDirect Link: ${window.location.href}\n\nRegards,\nPay2Pay Enterprise Portal`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  // 🔗 Share / Copy Link Handler
  const handleShareLink = () => {
    setShowShareMenu(false);
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 my-2 select-none">
      {/* Top Search & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAFBFF] p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search records, codes, titles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-[#D1D5DB] rounded-lg text-xs font-bold text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: CSV, PDF, Share */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={handleExportCSV}
            title="Download CSV Spreadsheet"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D5DB] bg-white text-xs font-extrabold text-[#374151] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#16A34A]" /> Export CSV
          </button>

          <button
            onClick={handlePrintPDF}
            title="Export as PDF / Print Document"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D5DB] bg-white text-xs font-extrabold text-[#374151] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#DC2626]" /> Export PDF
          </button>

          {/* Share Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu((p) => !p)}
              title="Share Report Options"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D5DB] bg-white text-xs font-extrabold text-[#374151] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#2563EB]" /> Share
                  <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                </>
              )}
            </button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 w-48 text-xs font-bold text-[#334155]">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F0FDF4] hover:text-[#166534] transition-all text-left"
                >
                  <MessageSquare className="w-4 h-4 text-[#25D366]" /> Share to WhatsApp
                </button>

                <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-all text-left"
                >
                  <Mail className="w-4 h-4 text-[#2563EB]" /> Share via Email
                </button>

                <button
                  onClick={handleShareLink}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F3E8FF] hover:text-[#6D28D9] transition-all text-left border-t border-[#F1F5F9]"
                >
                  <Share2 className="w-4 h-4 text-[#7C3AED]" /> Copy Direct Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Pagination Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 text-xs font-bold text-[#64748B]">
        {/* Item Counter */}
        <div>
          Showing <span className="text-[#0F172A] font-extrabold">{startItem}</span> -{" "}
          <span className="text-[#0F172A] font-extrabold">{endItem}</span> of{" "}
          <span className="text-[#0F172A] font-extrabold">{totalItems}</span> records
        </div>

        {/* Page Size & Navigation Buttons */}
        <div className="flex items-center gap-3">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#64748B]">Rows/page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-[#D1D5DB] rounded-md px-2 py-1 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 text-xs font-extrabold text-[#0F172A]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridToolbarPagination;
