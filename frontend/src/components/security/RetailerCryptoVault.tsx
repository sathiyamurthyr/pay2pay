"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  retailerCryptoService,
  EncryptedRecord,
  EncryptedEnvelope,
} from "@/services/retailerCryptoService";

export const RetailerCryptoVault: React.FC = () => {
  const [records, setRecords] = useState<EncryptedRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [resourceType, setResourceType] = useState<string>("CUSTOMER_DATA");
  const [resourceId, setResourceId] = useState<string>("");
  const [phone, setPhone] = useState<string>("+91 9876543210");
  const [amount, setAmount] = useState<string>("45000.50");
  const [notes, setNotes] = useState<string>("Urgent delivery requested with discounted margin.");
  const [saveToDb, setSaveToDb] = useState<boolean>(true);

  // Unmask state per record ID
  const [unmaskedMap, setUnmaskedMap] = useState<Record<string, boolean>>({});

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await retailerCryptoService.listRecords(undefined, true, 20);
      setRecords(data);
    } catch (err: any) {
      console.error("Failed to fetch encrypted records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleEncryptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setStatusMessage(null);

    try {
      const payloadData: Record<string, any> = {
        customer_phone: phone,
        settlement_amount: parseFloat(amount) || 0,
        private_notes: notes,
      };

      const result = await retailerCryptoService.encrypt(
        resourceType,
        payloadData,
        resourceId || undefined,
        saveToDb
      );

      setStatusMessage({
        type: "success",
        text: `Encrypted successfully! IV: ${result.encrypted_envelope.iv.substring(0, 8)}... Tag: ${result.encrypted_envelope.tag.substring(0, 8)}...`,
      });

      if (saveToDb) {
        await fetchRecords();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Encryption failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUnmask = (id: string) => {
    setUnmaskedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-6 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Retailer Security & Data Vault
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AES-256-GCM
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              End-to-end authenticated envelope encryption with per-retailer HKDF key isolation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRecords}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 border border-neutral-700/60 text-neutral-300 hover:text-white hover:border-neutral-600 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Vault</span>
        </button>
      </div>

      {/* Encryption Action Card */}
      <form onSubmit={handleEncryptSubmit} className="mt-6 p-4 rounded-xl border border-neutral-800/80 bg-neutral-900/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-amber-400" />
            Encrypt New Sensitive Business Record
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">
            Zero Plaintext in Logs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Resource Type
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="CUSTOMER_DATA">CUSTOMER_DATA (PII)</option>
              <option value="INVOICE">INVOICE (Financial)</option>
              <option value="ORDER_NOTE">ORDER_NOTE (Private)</option>
              <option value="PRIVATE_NOTE">PRIVATE_NOTE (Internal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Resource Identifier (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. ORD_902523 or INV_442"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Customer Phone (Sensitive PII)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Settlement Amount (₹)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Private Notes / Margin Negotiations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-neutral-800">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={saveToDb}
              onChange={(e) => setSaveToDb(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
            />
            <span>Persist Encrypted Record to Database</span>
          </label>

          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 hover:brightness-110 transition shadow-lg shadow-amber-500/20"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isCreating ? "Encrypting & Storing..." : "Encrypt & Protect"}</span>
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </form>

      {/* Records Table / Vault View */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Protected Encrypted Vault Records ({records.length})
          </h3>
          <span className="text-[11px] text-neutral-500">
            Authenticated Retailer Session Active
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-neutral-800 text-neutral-500 text-xs">
            {isLoading ? "Loading protected records..." : "No encrypted records stored yet. Create your first encrypted record above."}
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => {
              const isUnmasked = !!unmaskedMap[rec.id];
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-neutral-800/90 bg-neutral-900/60 hover:border-neutral-700/80 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {rec.resource_type}
                      </span>
                      {rec.resource_id && (
                        <span className="text-xs font-mono text-neutral-300 font-medium">
                          ID: {rec.resource_id}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        <span>AES-256-GCM Verified</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleUnmask(rec.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white transition self-start sm:self-auto"
                    >
                      {isUnmasked ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Mask</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Unmask (Decrypt)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="mt-3">
                    {isUnmasked ? (
                      <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-1">
                        {rec.decrypted_data ? (
                          <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                            {typeof rec.decrypted_data === "object"
                              ? JSON.stringify(rec.decrypted_data, null, 2)
                              : String(rec.decrypted_data)}
                          </pre>
                        ) : (
                          <span className="text-rose-400">
                            {rec.decryption_error || "Decryption failed"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex items-center gap-2 text-neutral-500">
                          <span className="text-[11px] uppercase tracking-wider text-neutral-600">IV (96-bit):</span>
                          <span className="truncate">{rec.encrypted_envelope?.iv || "••••••••••••"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-500">
                          <span className="text-[11px] uppercase tracking-wider text-neutral-600">Ciphertext:</span>
                          <span className="truncate">{rec.encrypted_envelope?.ciphertext || "••••••••••••••••••••••••••••••••"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-500">
                          <span className="text-[11px] uppercase tracking-wider text-neutral-600">Tag (128-bit):</span>
                          <span className="truncate">{rec.encrypted_envelope?.tag || "••••••••••••••••"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-[10px] text-neutral-600">
                    Created at: {rec.created_at ? new Date(rec.created_at).toLocaleString() : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
