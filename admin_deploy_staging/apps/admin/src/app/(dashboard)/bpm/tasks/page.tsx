"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  CheckSquare,
  CheckCircle2
} from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/bpm/tasks");
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCompleteTask = async (id: string) => {
    try {
      await api.post(`/api/v1/bpm/tasks/${id}/complete`);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Task completion failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-purple-400" />
            Operational Task Inbox & Task Manager
          </h1>
          <p className="mt-1 text-slate-400">
            View assigned operational tasks, claim work queue items, & execute completion actions
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase text-xs font-bold text-[#111827] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Task #</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Task Title</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Priority</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Assigned To</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Status</th>
                <th className="px-5 py-4 font-mono font-extrabold text-right text-[#111827]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-[#64748B] font-medium">Loading Operational Tasks...</td></tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.public_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4 text-[#2563EB] font-extrabold">{t.task_number}</td>
                    <td className="px-5 py-4 font-sans text-xs font-bold text-[#0F172A]">{t.title}</td>
                    <td className="px-5 py-4 text-[#DC2626] font-bold">{t.priority}</td>
                    <td className="px-5 py-4 text-[#475569] font-medium">{t.assigned_to || "Unassigned"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        t.status === "COMPLETED"
                          ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                          : "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {t.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleCompleteTask(t.public_id)}
                          className="flex items-center gap-1 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1.5 text-xs font-bold text-[#15803D] hover:bg-[#DCFCE7] ml-auto transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete Task
                        </button>
                      )}
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
