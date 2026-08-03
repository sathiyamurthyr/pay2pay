import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={cn("relative w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-[#E2E8F0] bg-white text-[#0F172A]", className)}>
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 mb-4">
          <h3 className="text-lg font-extrabold tracking-tight text-[#0F172A]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
