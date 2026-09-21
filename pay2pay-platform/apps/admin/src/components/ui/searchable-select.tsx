"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  subtext?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  minSearchCount?: number;
  alwaysShowSearch?: boolean;
  size?: "sm" | "md";
}

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Search options…",
  required = false,
  disabled = false,
  className = "",
  triggerClassName = "",
  minSearchCount = 0,
  alwaysShowSearch = true,
  size = "md",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  // Filter options based on search query with safe string coercion
  const filteredOptions = search.trim()
    ? options.filter((o) => {
        const q = search.toLowerCase();
        const labelMatch = String(o.label || "").toLowerCase().includes(q);
        const subtextMatch = o.subtext ? String(o.subtext).toLowerCase().includes(q) : false;
        const valMatch = String(o.value ?? "").toLowerCase().includes(q);
        return labelMatch || subtextMatch || valMatch;
      })
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
        setFocusedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearch("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
      e.preventDefault();
      const target = filteredOptions[focusedIndex];
      onChange(String(target.value));
      setIsOpen(false);
      setSearch("");
    }
  };

  // Show search box automatically whenever options exist or actively typing
  const showSearch = alwaysShowSearch || minSearchCount === 0 || options.length > minSearchCount;
  const isSmall = size === "sm";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
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
        className={`w-full flex items-center justify-between text-left transition-all cursor-pointer bg-white ${
          isSmall
            ? `text-xs py-1.5 px-2.5 rounded-lg border font-medium ${
                isOpen
                  ? "border-blue-600 ring-2 ring-blue-500/20"
                  : "border-slate-300 hover:border-slate-400"
              }`
            : `p-3 rounded-xl border text-xs font-bold shadow-2xs ${
                isOpen
                  ? "border-blue-600 ring-2 ring-blue-500/15"
                  : "border-slate-300 hover:border-slate-400"
              }`
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""} ${triggerClassName}`}
      >
        <span className={`truncate mr-2 ${selectedOption ? "text-slate-900" : "text-slate-500 font-normal"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Hidden native input for form validation */}
      {required && (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-xl max-h-72 min-w-[220px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box */}
          {showSearch && (
            <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setFocusedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-1 px-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>Showing {filteredOptions.length} of {options.length} options</span>
                {search && <span className="text-blue-600 font-bold">Filtered</span>}
              </div>
            </div>
          )}

          {/* Options List */}
          <div ref={listRef} className="overflow-y-auto max-h-60 py-1 divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No options match &quot;{search}&quot;
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isFocused = idx === focusedIndex;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(String(opt.value));
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-800 font-semibold"
                        : isFocused
                        ? "bg-slate-100 text-slate-900"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className={`truncate ${isSelected ? "font-bold text-blue-900" : "font-medium text-slate-800"}`}>
                        {opt.label}
                      </div>
                      {opt.subtext && (
                        <div className="text-[10px] text-slate-500 font-normal truncate">
                          {opt.subtext}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
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
