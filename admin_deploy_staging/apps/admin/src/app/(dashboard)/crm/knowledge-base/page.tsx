"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BookOpen,
  Megaphone,
  RefreshCw,
  Eye,
  Tag
} from "lucide-react";

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kRes, aRes] = await Promise.all([
        api.get("/api/v1/crm/knowledge-base"),
        api.get("/api/v1/crm/announcements")
      ]);
      setArticles(kRes.data);
      setAnnouncements(aRes.data);
    } catch (err) {
      console.error("Failed to fetch knowledge base", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-emerald-400" />
            Knowledge Base & Announcement Broadcast Center
          </h1>
          <p className="mt-1 text-slate-400">
            Internal troubleshooting SOP guides & merchant-wide broadcast notifications
          </p>
        </div>
      </div>

      {/* Broadcast Announcements */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-amber-400" /> Active Platform Broadcast Announcements
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((a) => (
            <div key={a.public_id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400">{a.announcement_code}</span>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  {a.audience}
                </span>
              </div>
              <h4 className="font-bold text-slate-100 text-base">{a.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{a.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Base Articles */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" /> Standard Operating Procedure (SOP) Knowledge Base
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading ? (
            <div className="col-span-3 p-12 text-center text-slate-400">Loading Knowledge Articles...</div>
          ) : (
            articles.map((art) => (
              <div key={art.public_id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <Tag className="h-3 w-3" /> {art.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {art.view_count} views
                  </span>
                </div>
                <h4 className="font-bold text-slate-200 text-sm leading-snug">{art.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{art.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
