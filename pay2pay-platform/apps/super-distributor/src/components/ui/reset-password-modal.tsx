"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { KeyRound, Eye, EyeOff, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetCodeOrEmail: string;
  onSubmit: (newPassword: string) => Promise<void>;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  targetName,
  targetCodeOrEmail,
  onSubmit,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await onSubmit(newPassword);
      setSuccessMsg(`Password successfully updated for ${targetName}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        setNewPassword("");
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Account Password">
      <div className="space-y-4 text-xs">
        {/* Info Banner */}
        <div className="p-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold text-[#1E40AF]">{targetName}</div>
            <div className="font-mono text-[11px] text-[#3B82F6]">{targetCodeOrEmail}</div>
          </div>
          <KeyRound className="w-6 h-6 text-[#2563EB]" />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[#475569] uppercase tracking-wider text-[11px] font-extrabold block">
                New Password *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] font-extrabold text-[#2563EB] hover:underline cursor-pointer"
              >
                ⚡ Generate Password
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-[#0F172A] font-mono text-sm font-extrabold pr-10 focus:bg-white focus:border-[#2563EB] focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-[#64748B] hover:text-[#0F172A]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] font-extrabold hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
