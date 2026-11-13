import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-[#292329] mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg bg-[#FAF8F9]/80 border border-[#E8E2E5]/80 px-3.5 py-2 text-sm text-[#292329] placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200",
          error && "border-rose-500 focus:ring-rose-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
