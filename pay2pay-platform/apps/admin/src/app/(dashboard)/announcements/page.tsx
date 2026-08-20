"use client";

import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import {
  Bell, Plus, Trash2, RefreshCw, Eye, EyeOff,
  ImagePlus, AlertCircle, CheckCircle2, Upload, Megaphone,
} from "lucide-react";
import Image from "next/image";

interface Announcement {
  id: string;
  header: string;
  body: string;
  image_url?: string | null;
  audience: string;
  priority: string;
  is_active: boolean;
  created_at: string;
}

const AUDIENCES = ["ALL", "RETAILER", "DISTRIBUTOR", "SUPER_DISTRIBUTOR", "ADMIN"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  NORMAL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    header: "",
    body: "",
    audience: "RETAILER",
    priority: "NORMAL",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      let rawList: any[] = [];
      try {
        const res = await api.get("/api/v1/announcements/admin/list");
        rawList = res.data?.data || res.data || [];
      } catch {
        const res2 = await api.get("/api/v1/announcements/active");
        rawList = res2.data?.data || res2.data || [];
      }

      const normalized: Announcement[] = (Array.isArray(rawList) ? rawList : []).map((raw: any) => {
        const img =
          raw.image_url ||
          (raw.images && raw.images.length > 0 ? raw.images[0].image_url : null);
        return {
          id: String(raw.id || raw.public_id || raw.announcement_code || Math.random()),
          header: raw.header || raw.title || "Announcement",
          body: raw.body || raw.message || raw.content || "",
          image_url: img || null,
          audience: raw.audience || "ALL",
          priority:
            typeof raw.priority === "number"
              ? raw.priority >= 20
                ? "CRITICAL"
                : raw.priority >= 10
                ? "HIGH"
                : "NORMAL"
              : raw.priority || "NORMAL",
          is_active: raw.is_active !== undefined ? raw.is_active : true,
          created_at: raw.created_at || raw.created_date || new Date().toISOString(),
        };
      });

      setAnnouncements(normalized);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image must be under 5 MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "announcements");
      // Use local fast storage endpoint /api/v1/upload/image
      const res = await api.post("/api/v1/upload/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.url || res.data?.path || null;
    } catch {
      try {
        // Fallback to media/upload
        const fd2 = new FormData();
        fd2.append("file", file);
        fd2.append("folder", "announcements");
        const res2 = await api.post("/api/v1/media/upload", fd2, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res2.data?.url || res2.data?.path || null;
      } catch {
        return null;
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.header.trim()) {
      showToast("error", "Header is required");
      return;
    }
    setSaving(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
        if (!image_url && imagePreview) {
          image_url = imagePreview;
        }
      }

      const priorityNum =
        form.priority === "CRITICAL"
          ? 25
          : form.priority === "HIGH"
          ? 15
          : form.priority === "LOW"
          ? 5
          : 10;

      const payload = {
        title: form.header,
        header: form.header,
        message: form.body,
        body: form.body,
        audience: form.audience === "ALL" ? "ALL_RETAILERS" : form.audience,
        priority: priorityNum,
        display_type: "MODAL",
        is_active: form.is_active,
        status: form.is_active ? "ACTIVE" : "DRAFT",
        image_url: image_url || null,
        links: [],
      };

      try {
        await api.post("/api/v1/announcements/admin/create", payload);
      } catch {
        await api.post("/api/v1/announcements", payload);
      }

      showToast("success", "Announcement created and broadcasted successfully!");
      setShowCreate(false);
      resetForm();
      fetchAnnouncements();
    } catch {
      showToast("error", "Failed to save announcement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await api.patch(`/api/v1/announcements/admin/${id}`, {
        is_active: !current,
        status: !current ? "ACTIVE" : "INACTIVE",
      });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a))
      );
      showToast("success", current ? "Announcement deactivated" : "Announcement activated");
    } catch {
      showToast("error", "Failed to update status");
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement permanently?")) return;
    try {
      await api.delete(`/api/v1/announcements/admin/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("success", "Announcement deleted");
    } catch {
      showToast("error", "Failed to delete announcement");
    }
  };

  const resetForm = () => {
    setForm({ header: "", body: "", audience: "RETAILER", priority: "NORMAL", is_active: true });
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-500/20 border-green-500/40 text-green-300"
              : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}
          style={{ animation: "fadeSlideUp 0.3s ease-out" }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            Announcements
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Broadcast notifications shown on retailer &amp; distributor dashboards on login
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            id="create-announcement-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </button>
        </div>
      </div>

      {/* Announcement list */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Bell className="h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No announcements yet</p>
          <p className="text-slate-600 text-sm mt-1">
            Create one to display messages on retailer dashboards
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all"
          >
            Create First Announcement
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                a.is_active
                  ? "bg-slate-900/60 border-slate-700"
                  : "bg-slate-900/30 border-slate-800 opacity-60"
              }`}
            >
              {/* Image thumbnail */}
              {a.image_url ? (
                <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={a.image_url}
                    alt={a.header}
                    fill
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-24 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <ImagePlus className="h-6 w-6 text-slate-600" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">{a.header}</p>
                    <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{a.body}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.NORMAL
                      }`}
                    >
                      {a.priority}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-medium">
                      {a.audience}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString("en-IN")}
                  </span>
                  <button
                    onClick={() => toggleActive(a.id, a.is_active)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      a.is_active
                        ? "text-green-400 hover:text-green-300"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {a.is_active ? (
                      <><Eye className="h-3 w-3" /> Active</>
                    ) : (
                      <><EyeOff className="h-3 w-3" /> Inactive</>
                    )}
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(a.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f1623] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-violet-400" />
                New Announcement
              </h2>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Image upload */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Banner Image (optional)</label>
                  <div
                    className="relative w-full h-36 rounded-xl border-2 border-dashed border-slate-700 overflow-hidden cursor-pointer hover:border-violet-500 transition-colors group"
                    onClick={() => fileRef.current?.click()}
                  >
                    {imagePreview ? (
                      <>
                        <Image
                          src={imagePreview}
                          alt="preview"
                          fill
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="h-6 w-6 text-white" />
                          <span className="text-white text-sm ml-2">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-sm">Click to upload image</span>
                        <span className="text-xs">PNG, JPG up to 5 MB</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>

                {/* Header */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Header / Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="announcement-header"
                    value={form.header}
                    onChange={(e) => setForm({ ...form, header: e.target.value })}
                    placeholder="e.g. System Maintenance on 25 Aug"
                    maxLength={120}
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-500"
                  />
                  <p className="text-xs text-slate-600 mt-0.5 text-right">{form.header.length}/120</p>
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Message Body</label>
                  <textarea
                    id="announcement-body"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    rows={3}
                    maxLength={500}
                    placeholder="Full announcement message shown to users..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-500 resize-none"
                  />
                  <p className="text-xs text-slate-600 mt-0.5 text-right">{form.body.length}/500</p>
                </div>

                {/* Audience + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Audience</label>
                    <select
                      value={form.audience}
                      onChange={(e) => setForm({ ...form, audience: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                    >
                      {AUDIENCES.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.is_active ? "bg-violet-600" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        form.is_active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-sm text-slate-300">
                    {form.is_active ? "Active immediately" : "Save as draft"}
                  </span>
                </label>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); resetForm(); }}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    id="save-announcement-btn"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving || uploading ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> {uploading ? "Uploading..." : "Saving..."}</>
                    ) : (
                      <><Megaphone className="h-4 w-4" /> Broadcast Announcement</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
