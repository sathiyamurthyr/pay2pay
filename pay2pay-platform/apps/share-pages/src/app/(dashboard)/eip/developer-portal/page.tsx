"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Code,
  Key
} from "lucide-react";

export default function DeveloperPortalPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/eip/developer/apps");
      setApps(res.data);
    } catch (err) {
      console.error("Failed to fetch developer apps", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Code className="h-8 w-8 text-rose-400" />
            Developer Portal & API Key Management
          </h1>
          <p className="mt-1 text-slate-400">
            Manage developer application credentials, OpenAPI specifications, SDK downloads, & sandbox access
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">App Code</th>
                <th className="px-5 py-4">Application Name</th>
                <th className="px-5 py-4">API Key</th>
                <th className="px-5 py-4 font-mono text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400">Loading Developer Applications...</td></tr>
              ) : (
                apps.map((a) => (
                  <tr key={a.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 text-rose-400 font-bold">{a.app_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-semibold text-slate-200">{a.name}</td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-xs flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-amber-400" /> {a.api_key}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
