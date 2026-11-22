"use client";

import React, { useState } from "react";
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, Copy, Check } from "lucide-react";
import { EncryptedEnvelope, retailerCryptoService } from "@/services/retailerCryptoService";

interface EncryptedDataFieldProps {
  label?: string;
  value?: string | number | Record<string, any>;
  envelope?: EncryptedEnvelope;
  resourceType?: string;
  resourceId?: string;
  className?: string;
  maskPattern?: string; // e.g. "••••••••" or "default"
  autoDecrypt?: boolean;
}

export const EncryptedDataField: React.FC<EncryptedDataFieldProps> = ({
  label,
  value,
  envelope,
  resourceType = "PRIVATE_NOTE",
  resourceId,
  className = "",
  maskPattern = "••••••••••••",
  autoDecrypt = false,
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(autoDecrypt);
  const [decryptedValue, setDecryptedValue] = useState<any>(value || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }

    if (decryptedValue !== null && decryptedValue !== undefined) {
      setIsRevealed(true);
      return;
    }

    if (!envelope) {
      setIsRevealed(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await retailerCryptoService.decrypt(
        resourceType,
        envelope,
        resourceId
      );
      setDecryptedValue(data);
      setIsRevealed(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Decryption failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = typeof decryptedValue === "object"
      ? JSON.stringify(decryptedValue, null, 2)
      : String(decryptedValue ?? "");
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayString = () => {
    if (!isRevealed) {
      return maskPattern;
    }
    if (decryptedValue === null || decryptedValue === undefined) {
      return "—";
    }
    if (typeof decryptedValue === "object") {
      return JSON.stringify(decryptedValue);
    }
    return String(decryptedValue);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
          <span>{label}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Encrypted at Rest (AES-256-GCM)</span>
          </span>
        </div>
      )}

      <div className="relative flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 shadow-inner">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {isRevealed ? (
            <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-amber-400/80 shrink-0" />
          )}

          <span
            className={`truncate font-mono text-xs ${
              isRevealed ? "text-neutral-100" : "text-neutral-500 tracking-wider"
            }`}
          >
            {isLoading ? "Decrypting securely..." : displayString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isRevealed && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title="Copy decrypted value"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleReveal}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
          >
            {isRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="text-[11px]">Mask</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[11px]">Unmask</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <span className="text-[11px] text-rose-400 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
