"use client";

import React, { useState } from "react";
import {
  Laptop,
  Smartphone,
  Globe,
  MapPin,
  Clock,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  X,
  Monitor,
  Check,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Compass,
} from "lucide-react";

export interface DeviceSession {
  id: string;
  isCurrentDevice: boolean;
  deviceName: string;
  deviceType: "DESKTOP" | "MOBILE" | "TABLET";
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  coordinates: { lat: number; lng: number };
  lastActive: string;
  loginTime: string;
  isp: string;
}

const DEFAULT_SESSIONS: DeviceSession[] = [
  {
    id: "sess-curr",
    isCurrentDevice: true,
    deviceName: "Windows 11 Workstation (Dell XPS 15)",
    deviceType: "DESKTOP",
    browser: "Chrome v126.0 (64-bit)",
    os: "Windows 11 Enterprise",
    ipAddress: "49.207.182.91",
    location: "Chennai, Tamil Nadu, India",
    coordinates: { lat: 13.0827, lng: 80.2707 },
    lastActive: "Just Now (Active)",
    loginTime: "Today at 10:15 AM",
    isp: "Airtel Broadband Fiber",
  },
  {
    id: "sess-remote-1",
    isCurrentDevice: false,
    deviceName: "Apple MacBook Pro M3 Max",
    deviceType: "DESKTOP",
    browser: "Safari v17.4",
    os: "macOS Sonoma 14.4",
    ipAddress: "103.115.192.45",
    location: "Bengaluru, Karnataka, India",
    coordinates: { lat: 12.9716, lng: 77.5946 },
    lastActive: "14 minutes ago",
    loginTime: "Yesterday at 04:30 PM",
    isp: "ACT Fibernet Corporate",
  },
  {
    id: "sess-remote-2",
    isCurrentDevice: false,
    deviceName: "iPhone 15 Pro Max",
    deviceType: "MOBILE",
    browser: "Mobile Safari (iOS)",
    os: "iOS 17.5.1",
    ipAddress: "157.48.91.102",
    location: "Mumbai, Maharashtra, India",
    coordinates: { lat: 19.076, lng: 72.8777 },
    lastActive: "2 hours ago",
    loginTime: "01 Aug 2026 at 09:20 PM",
    isp: "Jio 5G Network",
  },
];

interface MultiDeviceSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  userEmail?: string;
}

export const MultiDeviceSessionModal: React.FC<MultiDeviceSessionModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  userEmail = "admin@pay2pay.com",
}) => {
  const [sessions, setSessions] = useState<DeviceSession[]>(DEFAULT_SESSIONS);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRevokeSingleDevice = (sessionId: string, deviceName: string) => {
    setRevokingId(sessionId);
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setRevokingId(null);
      setSuccessNotice(`Successfully logged out device: "${deviceName}"`);
      setTimeout(() => setSuccessNotice(null), 3000);
    }, 600);
  };

  const handleRevokeAllOtherDevices = () => {
    setRevokingId("ALL_OTHER");
    setTimeout(() => {
      setSessions((prev) => prev.filter((s) => s.isCurrentDevice));
      setRevokingId(null);
      setSuccessNotice("Successfully logged out all remote sessions! Only your current device remains active.");
      setTimeout(() => setSuccessNotice(null), 4000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-[#BFDBFE] bg-white p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] shadow-xs">
              <ShieldAlert className="w-6 h-6 text-[#DC2626]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
                Multi-Device Concurrent Login Detected
              </h2>
              <p className="text-xs text-[#64748B] font-semibold mt-0.5">
                Account: <strong className="text-[#2563EB] font-mono">{userEmail}</strong> • Select which device to log out
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-2.5 text-xs text-[#166534] font-bold shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Session Count & Revoke All Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]">
          <div className="flex items-center gap-2 text-xs text-[#1E40AF]">
            <Monitor className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="font-extrabold">
              Active Sessions: <span className="underline">{sessions.length} Authorized Devices</span>
            </span>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeAllOtherDevices}
              disabled={revokingId === "ALL_OTHER"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#DC2626] text-white font-extrabold text-xs hover:bg-[#B91C1C] transition cursor-pointer shadow-xs shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{revokingId === "ALL_OTHER" ? "Logging out others..." : "Logout All Other Devices"}</span>
            </button>
          )}
        </div>

        {/* Active Devices List */}
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {sessions.map((sess) => {
            const isCurr = sess.isCurrentDevice;
            const Icon = sess.deviceType === "MOBILE" ? Smartphone : Laptop;

            return (
              <div
                key={sess.id}
                className={`rounded-2xl border p-4 shadow-sm transition-all space-y-3 ${
                  isCurr
                    ? "border-[#BBF7D0] bg-gradient-to-r from-[#F0FDF4] via-white to-[#F0FDF4]"
                    : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        isCurr ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]" : "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-[#0F172A]">{sess.deviceName}</h3>
                        {isCurr ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] font-mono text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> THIS DEVICE (ACTIVE)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] border border-[#E9D5FF] font-mono text-[10px] font-extrabold">
                            REMOTE SESSION
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] font-semibold mt-0.5">
                        {sess.browser} • {sess.os}
                      </p>
                    </div>
                  </div>

                  {!isCurr && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingleDevice(sess.id, sess.deviceName)}
                      disabled={revokingId === sess.id}
                      className="px-3.5 py-1.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] font-extrabold text-xs hover:bg-[#FEE2E2] transition cursor-pointer shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>{revokingId === sess.id ? "Logging out..." : "Logout This Device"}</span>
                    </button>
                  )}
                </div>

                {/* Details Grid (IP, Location Map, Timestamp) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold text-[#475569]">
                  {/* IP Address & Network */}
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block">Network IP &amp; ISP</span>
                    <div className="font-mono text-xs font-bold text-[#2563EB] flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#2563EB]" /> {sess.ipAddress}
                    </div>
                    <p className="text-[10px] text-[#94A3B8] font-medium truncate">{sess.isp}</p>
                  </div>

                  {/* Location & Coordinates */}
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block">Geo Location &amp; Map</span>
                    <div className="font-bold text-[#0F172A] flex items-center gap-1 truncate text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#DC2626] shrink-0" /> {sess.location}
                    </div>
                    <p className="text-[10px] text-[#94A3B8] font-mono">
                      GPS: {sess.coordinates.lat}° N, {sess.coordinates.lng}° E
                    </p>
                  </div>

                  {/* Last Active Time */}
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block">Last Active Timestamp</span>
                    <div className="font-bold text-[#15803D] flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-[#16A34A]" /> {sess.lastActive}
                    </div>
                    <p className="text-[10px] text-[#94A3B8] font-medium">Login: {sess.loginTime}</p>
                  </div>
                </div>

                {/* Mini Location Map Card Preview */}
                <div className="rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#334155]">
                    <Compass className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span>Map Coordinate Verified: {sess.location}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] font-mono text-[10px] font-extrabold text-[#2563EB] shadow-2xs">
                    📍 Live GPS Marker
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#64748B] font-medium text-center sm:text-left">
            Total active sessions remaining: <strong>{sessions.length}</strong>
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onProceed}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs hover:bg-[#1D4ED8] transition cursor-pointer shadow-md"
            >
              <Zap className="w-4 h-4" />
              <span>Proceed with Selected Devices</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
