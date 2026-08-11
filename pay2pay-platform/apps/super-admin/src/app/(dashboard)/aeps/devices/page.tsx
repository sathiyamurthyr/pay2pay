"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Cpu, Plus, RefreshCw, CheckCircle2, ShieldCheck, X 
} from "lucide-react";
import apiClient from "@/lib/api";

interface Device {
  public_id: string;
  device_serial_number: string;
  vendor_name: string;
  model_name: string;
  rd_service_version: string;
  firmware_version: string;
  device_status: string;
}

export default function AepsDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // Device Registration Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    device_serial_number: "",
    vendor_name: "MANTRA",
    model_name: "MFS100",
    rd_service_version: "1.0.4",
    firmware_version: "2.0.1",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/aeps/devices");
      setDevices(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch AEPS devices", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post("/aeps/devices", form);
      setShowModal(false);
      setForm({ device_serial_number: "", vendor_name: "MANTRA", model_name: "MFS100", rd_service_version: "1.0.4", firmware_version: "2.0.1" });
      fetchDevices();
    } catch (err) {
      console.error("Device registration failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-7 h-7 text-purple-400" /> Biometric Device Centre
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Registered Mantra, Morpho, Startek, and Cogent RD Service scanners
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-purple-600/20"
        >
          <Plus className="w-4 h-4" /> Register New Biometric Scanner
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#111827] text-xs uppercase font-extrabold tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-4">Serial Number</th>
                <th className="px-6 py-4">Vendor &amp; Model</th>
                <th className="px-6 py-4">RD Service Ver</th>
                <th className="px-6 py-4">Firmware Ver</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">
                    Loading biometric devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">
                    No biometric scanners registered.
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.public_id} className="hover:bg-[#EFF6FF] transition-colors">
                    <td className="px-6 py-4 font-mono text-[#111827] font-bold">{d.device_serial_number}</td>
                    <td className="px-6 py-4">
                      <p className="text-[#111827] font-bold">{d.vendor_name}</p>
                      <p className="text-xs text-[#6B7280]">{d.model_name}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#2563EB] font-bold">v{d.rd_service_version}</td>
                    <td className="px-6 py-4 font-mono text-xs text-[#374151]">v{d.firmware_version}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                        {d.device_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl text-[#111827]">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" /> Register Scanner Device
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Device Serial Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MANTRA-MFS100-9988"
                  value={form.device_serial_number}
                  onChange={(e) => setForm({ ...form, device_serial_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Vendor Name</label>
                  <select
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="MANTRA">MANTRA</option>
                    <option value="MORPHO">MORPHO</option>
                    <option value="STARTEK">STARTEK</option>
                    <option value="COGENT">COGENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={form.model_name}
                    onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-sm transition-all"
                >
                  {submitting ? "Registering..." : "Register Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
