import React from "react";
import { cn } from "@/lib/utils";

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-2xs text-[#111827]", className)}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("mb-4 flex items-center justify-between", className)}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn("text-[18px] font-bold tracking-tight text-[#111827]", className)}>{children}</h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn("text-xs text-[#6B7280] font-medium mt-1", className)}>{children}</p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("", className)}>{children}</div>
);
