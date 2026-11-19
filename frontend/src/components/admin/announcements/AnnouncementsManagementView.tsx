"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import {
  Bell,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
  Upload,
  Megaphone,
  Search,
  Calendar,
  X,
  Radio,
  Flame,
  Users,
  Layers,
  Sparkles,
  Edit3,
  ShieldAlert,
  Building2,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

export interface AnnouncementImage {
  id?: string;
  image_url: string;
  original_filename?: string;
  file_size?: number;
}

export interface AnnouncementLink {
  label: string;
  url: string;
  icon?: string;
}

export interface Announcement {
  id: string;
  header: string;
  body: string;
  image_url?: string | null;
  images?: AnnouncementImage[];
  links?: AnnouncementLink[];
  audience: string;
  priority: string;
  is_active: boolean;
  status?: string;
  created_at: string;
  company_ref_id?: number | null;
}

const AUDIENCES = [
  { value: "ALL", label: "All Users" },
  { value: "RETAILER", label: "Retailers" },
  { value: "DISTRIBUTOR", label: "Distributors" },
  { value: "SUPER_DISTRIBUTOR", label: "Super Distributors" },
  { value: "ADMIN", label: "Admins" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-500" },
  { value: "NORMAL", label: "Normal", color: "bg-blue-500" },
  { value: "HIGH", label: "High", color: "bg-amber-500" },
  { value: "CRITICAL", label: "Critical", color: "bg-rose-500" },
];

const PRIORITY_BADGES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  LOW: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  NORMAL: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  HIGH: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  CRITICAL: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

function AnnouncementThumbnail({
  imageUrl,
  title,
  themeColor = "violet",
}: {
  imageUrl?: string | null;
  title: string;
  themeColor?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div className="relative w-28 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-2xs">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="112px"
          style={{ objectFit: "cover" }}
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-28 h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/60 border border-slate-200 flex flex-col items-center justify-center gap-1 shrink-0 text-slate-600 shadow-2xs">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
        <Megaphone className="h-4 w-4 text-slate-700" />
      </div>
      <span className="text-[10px] font-bold text-slate-600 tracking-wide uppercase">Broadcast</span>
    </div>
  );
}

export function AnnouncementsManagementView({ currentRoute = "/announcements" }: { currentRoute?: string }) {
  const { user } = useAuth();
  const branding = useCompanyBranding();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  // Dynamic branding variables
  const companyName = branding?.company_name || branding?.display_name || "Enterprise";
  const isSmsPay = branding?.isSmsPay;
  const isNear4You = branding?.isNear4You;

  // Theme gradient mapping
  const primaryGradient = useMemo(() => {
    if (isSmsPay) return "from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-600/25";
    if (isNear4You) return "from-[#A20A3A] to-[#780022] hover:from-[#8C0028] hover:to-[#600018] shadow-rose-900/25";
    return "from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/25";
  }, [isSmsPay, isNear4You]);

  const accentBadgeBg = useMemo(() => {
    if (isSmsPay) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (isNear4You) return "bg-rose-50 text-[#A20A3A] border-rose-200";
    return "bg-violet-50 text-violet-800 border-violet-200";
  }, [isSmsPay, isNear4You]);

  const activeAudienceTabBg = useMemo(() => {
    if (isSmsPay) return "bg-emerald-600 text-white shadow-xs";
    if (isNear4You) return "bg-[#A20A3A] text-white shadow-xs";
    return "bg-violet-600 text-white shadow-xs";
  }, [isSmsPay, isNear4You]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      let rawList: any[] = [];
      try {
        const res = await api.get("/api/v1/announcements/admin/list");
        rawList = res.data?.data || res.data || [];
      } catch {
        try {
          const res2 = await api.get("/api/v1/announcements/active");
          rawList = res2.data?.data || res2.data || [];
        } catch {
          const res3 = await api.get("/api/v1/announcements");
          rawList = res3.data?.data || res3.data || [];
        }
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
          images: Array.isArray(raw.images) ? raw.images : [],
          links: Array.isArray(raw.links) ? raw.links : [],
          audience: raw.audience || "ALL",
          priority:
            typeof raw.priority === "number"
              ? raw.priority >= 20
                ? "CRITICAL"
                : raw.priority >= 10
                ? "HIGH"
                : "NORMAL"
              : raw.priority || "NORMAL",
          is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
          status: raw.status || (raw.is_active ? "ACTIVE" : "INACTIVE"),
          created_at: raw.created_at || raw.created_date || new Date().toISOString(),
          company_ref_id: raw.company_ref_id || null,
        };
      });

      setAnnouncements(normalized);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load announcements");
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
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Image must be under 10 MB");
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
      const res = await api.post("/api/v1/upload/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.url || res.data?.path || null;
    } catch {
      try {
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

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      header: "",
      body: "",
      audience: "RETAILER",
      priority: "NORMAL",
      is_active: true,
    });
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setShowModal(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingItem(item);
    setForm({
      header: item.header,
      body: item.body,
      audience: item.audience === "ALL_RETAILERS" ? "RETAILER" : item.audience,
      priority: item.priority,
      is_active: item.is_active,
    });
    setImageFile(null);
    setImagePreview(item.image_url || null);
    if (fileRef.current) fileRef.current.value = "";
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.header.trim()) {
      showToast("error", "Headline / Title is required");
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl: string | null = imagePreview;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (uploaded) finalImageUrl = uploaded;
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
        status: form.is_active ? "ACTIVE" : "INACTIVE",
        image_url: finalImageUrl || null,
        links: editingItem?.links || [],
      };

      if (editingItem) {
        // Update existing announcement
        try {
          await api.put(`/api/v1/announcements/admin/${editingItem.id}`, payload);
        } catch {
          await api.patch(`/api/v1/announcements/admin/${editingItem.id}`, payload);
        }
        showToast("success", "Announcement updated successfully!");
      } else {
        // Create new announcement
        try {
          await api.post("/api/v1/announcements/admin/create", payload);
        } catch {
          await api.post("/api/v1/announcements", payload);
        }
        showToast("success", "Announcement created and broadcasted successfully!");
      }

      setShowModal(false);
      setEditingItem(null);
      fetchAnnouncements();
    } catch (err: any) {
      showToast("error", err?.response?.data?.detail || "Failed to save announcement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      setTogglingId(id);
      let updatedStatus = !current;
      try {
        const res = await api.post(`/api/v1/announcements/admin/${id}/toggle`);
        if (res.data?.data?.is_active !== undefined) {
          updatedStatus = res.data.data.is_active;
        }
      } catch {
        try {
          await api.patch(`/api/v1/announcements/admin/${id}`, {
            is_active: !current,
            status: !current ? "ACTIVE" : "INACTIVE",
          });
        } catch {
          await api.put(`/api/v1/announcements/admin/${id}`, {
            is_active: !current,
            status: !current ? "ACTIVE" : "INACTIVE",
          });
        }
      }

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: updatedStatus } : a))
      );
      showToast(
        "success",
        updatedStatus
          ? "Announcement enabled (Active)"
          : "Announcement disabled (Inactive)"
      );
    } catch {
      showToast("error", "Failed to update announcement status. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this announcement?")) return;
    try {
      setDeletingId(id);
      await api.delete(`/api/v1/announcements/admin/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("success", "Announcement deleted permanently");
    } catch {
      showToast("error", "Failed to delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered announcements
  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.header.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAudience =
      selectedAudienceFilter === "ALL" ||
      a.audience.toUpperCase().includes(selectedAudienceFilter.toUpperCase()) ||
      (selectedAudienceFilter === "RETAILER" && a.audience === "ALL_RETAILERS");
    return matchesSearch && matchesAudience;
  });

  const totalActive = announcements.filter((a) => a.is_active).length;
  const criticalCount = announcements.filter((a) => a.priority === "CRITICAL").length;

  const isStaffOrAdmin = useMemo(() => {
    if (!user) return true;
    return Boolean(
      user.roles?.includes("SUPER_ADMIN") ||
      user.roles?.includes("PLATFORM_ADMIN") ||
      user.roles?.includes("OPERATIONS_ADMIN") ||
      user.roles?.includes("ADMIN")
    );
  }, [user]);

  if (user && !isStaffOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          The Announcements Broadcast Center is restricted to authorized Administrator accounts for {companyName}.
        </p>
        <a
          href="/dashboard"
          className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-500/10"
              : "bg-rose-50 border-rose-200 text-rose-800 shadow-rose-500/10"
          }`}
          style={{ animation: "fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header with Multi-Company Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${primaryGradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Announcements</h1>
              {/* Dynamic Company Branding Badge */}
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${accentBadgeBg}`}>
                <Building2 className="w-3.5 h-3.5" />
                <span>{companyName}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                {announcements.length} Total
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
              Broadcast system notices, updates, and maintenance alerts across {companyName} retail & partner workstations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            title="Refresh announcements"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            id="create-announcement-btn"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${primaryGradient} text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer`}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Broadcasts</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{announcements.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live & Active</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalActive}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Alerts</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{criticalCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Portals</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{AUDIENCES.length - 1}</p>
        </div>
      </div>

      {/* Search & Audience Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Audience Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setSelectedAudienceFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedAudienceFilter === "ALL"
                ? activeAudienceTabBg
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            All ({announcements.length})
          </button>
          {AUDIENCES.filter((a) => a.value !== "ALL").map((aud) => {
            const count = announcements.filter(
              (a) =>
                a.audience.toUpperCase().includes(aud.value) ||
                (aud.value === "RETAILER" && a.audience === "ALL_RETAILERS")
            ).length;
            const isSelected = selectedAudienceFilter === aud.value;
            return (
              <button
                key={aud.value}
                onClick={() => setSelectedAudienceFilter(aud.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? activeAudienceTabBg
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {aud.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200/80 shadow-2xs gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-slate-600" />
          <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">Loading announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 bg-white rounded-3xl border border-slate-200/80 shadow-2xs text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3 border border-slate-200">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No Announcements Found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">
            {searchQuery || selectedAudienceFilter !== "ALL"
              ? "No announcements match your current filter criteria."
              : `Create your first broadcast message to display on ${companyName} retailer & distributor workstations.`}
          </p>
          <button
            onClick={() => {
              if (searchQuery || selectedAudienceFilter !== "ALL") {
                setSearchQuery("");
                setSelectedAudienceFilter("ALL");
              } else {
                handleOpenCreate();
              }
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {searchQuery || selectedAudienceFilter !== "ALL" ? "Clear Filters" : "Create Announcement"}
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredAnnouncements.map((a) => {
            const pStyle = PRIORITY_BADGES[a.priority] || PRIORITY_BADGES.NORMAL;
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start shadow-2xs hover:shadow-md ${
                  a.is_active
                    ? "border-slate-200/90 hover:border-slate-300"
                    : "border-slate-200/50 bg-slate-50/50 opacity-75"
                }`}
              >
                {/* Thumbnail */}
                <AnnouncementThumbnail imageUrl={a.image_url} title={a.header} />

                {/* Content */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug tracking-tight">
                          {a.header}
                        </h2>
                      </div>
                      <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed line-clamp-2">
                        {a.body || "No message description provided."}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      {a.is_active ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          DISABLED
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                        {a.priority}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                        {a.audience.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Metadata & Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Enable / Disable Toggle Switch Button */}
                      <button
                        type="button"
                        onClick={() => toggleActive(a.id, a.is_active)}
                        disabled={togglingId === a.id}
                        className={`group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none shadow-2xs ${
                          a.is_active
                            ? "bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border-emerald-300/80"
                            : "bg-slate-100 hover:bg-slate-200/90 text-slate-600 border-slate-300"
                        } ${togglingId === a.id ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={a.is_active ? "Click to Disable announcement" : "Click to Enable announcement"}
                      >
                        {/* Interactive iOS-style Toggle Switch Track & Knob */}
                        <div
                          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                            a.is_active ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                              a.is_active ? "translate-x-3.5" : "translate-x-0.5"
                            }`}
                          />
                        </div>

                        {togglingId === a.id ? (
                          <span className="flex items-center gap-1 font-bold text-slate-500">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Updating...</span>
                          </span>
                        ) : a.is_active ? (
                          <div className="flex items-center gap-1 font-bold">
                            <span className="text-emerald-700">Enabled</span>
                            <span className="text-[10px] font-normal text-emerald-600/70 hidden sm:inline">(Active)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-bold">
                            <span className="text-slate-600">Disabled</span>
                            <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">(Inactive)</span>
                          </div>
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                        title="Edit announcement"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(a.id)}
                        disabled={deletingId === a.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border border-rose-200/70 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Delete announcement permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${primaryGradient} flex items-center justify-center text-white shadow-md`}>
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingItem ? "Edit Announcement" : "New Announcement"}
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Broadcast for {companyName} retail & partner network
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Banner Image upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Banner Image <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div
                  className="relative w-full h-36 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-100/50 overflow-hidden cursor-pointer transition-all flex flex-col items-center justify-center group"
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
                      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg">
                          <Upload className="h-4 w-4" />
                          <span>Change Image</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs group-hover:scale-105 transition-transform">
                        <ImagePlus className="h-5 w-5 text-slate-700" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Click to upload banner</span>
                      <span className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 10 MB</span>
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

              {/* Header / Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Headline / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="announcement-header"
                  value={form.header}
                  onChange={(e) => setForm({ ...form, header: e.target.value })}
                  placeholder={`e.g., Scheduled ${companyName} Banking API Maintenance Tonight`}
                  maxLength={120}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200 transition-all"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1 text-right">{form.header.length}/120</p>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message Content
                </label>
                <textarea
                  id="announcement-body"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder={`Write the full broadcast message visible in ${companyName} modals...`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200 transition-all resize-none"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1 text-right">{form.body.length}/500</p>
              </div>

              {/* Target Audience & Priority */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:bg-white focus:outline-none focus:border-slate-400 transition-all cursor-pointer"
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:bg-white focus:outline-none focus:border-slate-400 transition-all cursor-pointer"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Immediately Switch */}
              <div className="pt-1">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer select-none transition-all">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Broadcast Immediately</p>
                      <p className="text-[11px] text-slate-500">Make this announcement live upon saving</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-500 border-slate-300 cursor-pointer"
                  />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  id="save-announcement-btn"
                  className={`flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r ${primaryGradient} text-white font-bold text-xs sm:text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer`}
                >
                  {saving || uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{uploading ? "Uploading Image..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" />
                      <span>{editingItem ? "Update Broadcast" : "Broadcast Now"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
