"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subtext?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Search options…",
  required = false,
  disabled = false,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Filter options based on search query
  const filteredOptions = search.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.subtext && o.subtext.toLowerCase().includes(search.toLowerCase())) ||
          o.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const showSearch = options.length >= 3;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch("");
          }
        }}
        className={`w-full flex items-center justify-between rounded-xl border bg-white p-3 text-xs font-bold text-left transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? "border-[#2563EB] ring-2 ring-[#2563EB]/15"
            : "border-[#D1D5DB] hover:border-[#9CA3AF]"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-[#F9FAFB]" : ""}`}
      >
        <span className={selectedOption ? "text-[#111827]" : "text-[#9CA3AF] font-normal"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#6B7280] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-[#2563EB]" : ""
          }`}
        />
      </button>

      {/* Hidden native input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-[#E5E7EB] bg-white shadow-xl max-h-72 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box (Shown if options > 10 or whenever active) */}
          {(showSearch || search) && (
            <div className="p-2 border-b border-[#F3F4F6] bg-[#F9FAFB] sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#D1D5DB] rounded-lg text-xs font-medium text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-1 px-1 flex items-center justify-between text-[10px] font-semibold text-[#6B7280]">
                <span>Showing {filteredOptions.length} of {options.length} options</span>
                {search && <span>Filtered</span>}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-60 py-1 divide-y divide-[#F3F4F6]/50">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6B7280]">
                No options match &quot;{search}&quot;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#EFF6FF] text-[#1E40AF]"
                        : "hover:bg-[#F9FAFB] text-[#374151]"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-[#111827] truncate">{opt.label}</div>
                      {opt.subtext && (
                        <div className="text-[10px] text-[#6B7280] font-normal truncate">
                          {opt.subtext}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#2563EB] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
