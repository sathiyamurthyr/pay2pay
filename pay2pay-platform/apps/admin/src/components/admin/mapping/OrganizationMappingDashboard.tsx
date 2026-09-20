"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Network,
  Building2,
  Users,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Store,
  Clock,
  History,
  Info,
  Edit,
  Unlink,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  adminOrgMappingApi,
  OrgSummary,
  OrgTreeNode,
  UnmappedItem,
  AuditHistoryItem,
} from "@/services/admin-org-mapping-api";
import { EntityDetailsDrawer } from "./EntityDetailsDrawer";
import { AssignMappingModal } from "./AssignMappingModal";
import { ConfirmUnmapModal } from "./ConfirmUnmapModal";

export const OrganizationMappingDashboard: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"TREE" | "UNMAPPED" | "HISTORY">("TREE");

  // Summary Metrics
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);

  // Hierarchy Tree State
  const [treeRoots, setTreeRoots] = useState<OrgTreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");
  const [mappedOnlyFilter, setMappedOnlyFilter] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Unmapped Records State
  const [unmappedItems, setUnmappedItems] = useState<UnmappedItem[]>([]);
  const [unmappedTypeFilter, setUnmappedTypeFilter] = useState<string>("ALL");
  const [loadingUnmapped, setLoadingUnmapped] = useState<boolean>(false);
  const [unmappedSearch, setUnmappedSearch] = useState<string>("");

  // Audit History State
  const [historyItems, setHistoryItems] = useState<AuditHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Modal / Drawer states
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [detailEntityType, setDetailEntityType] = useState<string | null>(null);
  const [detailEntityId, setDetailEntityId] = useState<string | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [assignInitialType, setAssignInitialType] = useState<"DISTRIBUTOR" | "RETAILER" | null>(null);
  const [assignInitialId, setAssignInitialId] = useState<string | null>(null);
  const [assignInitialName, setAssignInitialName] = useState<string | null>(null);

  const [unmapModalOpen, setUnmapModalOpen] = useState<boolean>(false);
  const [unmapType, setUnmapType] = useState<string | null>(null);
  const [unmapId, setUnmapId] = useState<string | null>(null);
  const [unmapName, setUnmapName] = useState<string | null>(null);

  // Initial load
  const loadDashboardData = async () => {
    setLoadingSummary(true);
    try {
      const s = await adminOrgMappingApi.getSummary();
      setSummary(s);
    } catch (e) {
      console.error("Failed to load summary", e);
    } finally {
      setLoadingSummary(false);
    }

    loadTree();
    loadUnmapped();
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadTree = async () => {
    setLoadingTree(true);
    try {
      const data = await adminOrgMappingApi.getTree({
        search: searchQuery || undefined,
        tenant_id: selectedTenantFilter || undefined,
        company_id: selectedCompanyFilter || undefined,
        status: selectedStatusFilter || undefined,
        mapped_only: mappedOnlyFilter || undefined,
      });
      setTreeRoots(data);

      // Default expand top 2 levels
      const initialExpanded: Record<string, boolean> = {};
      data.forEach((root) => {
        initialExpanded[root.id] = true;
        root.children?.forEach((c) => {
          initialExpanded[c.id] = true;
        });
      });
      setExpandedNodes((prev) => ({ ...initialExpanded, ...prev }));
    } catch (e) {
      console.error("Failed to load hierarchy tree", e);
    } finally {
      setLoadingTree(false);
    }
  };

  const loadUnmapped = async () => {
    setLoadingUnmapped(true);
    try {
      const params = unmappedTypeFilter !== "ALL" ? { entity_type: unmappedTypeFilter } : {};
      const data = await adminOrgMappingApi.getUnmapped(params);
      setUnmappedItems(data.items || []);
    } catch (e) {
      console.error("Failed to load unmapped records", e);
    } finally {
      setLoadingUnmapped(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await adminOrgMappingApi.getHistory({ limit: 50 });
      setHistoryItems(data.items || []);
    } catch (e) {
      console.error("Failed to load mapping history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "TREE") {
      loadTree();
    } else if (activeTab === "UNMAPPED") {
      loadUnmapped();
    } else if (activeTab === "HISTORY") {
      loadHistory();
    }
  }, [activeTab, unmappedTypeFilter, selectedTenantFilter, selectedCompanyFilter, selectedStatusFilter, mappedOnlyFilter]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (nodes: OrgTreeNode[]) => {
      nodes.forEach((n) => {
        allIds[n.id] = true;
        if (n.children) traverse(n.children);
      });
    };
    traverse(treeRoots);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  // Open entity details
  const handleOpenDetails = (type: string, id: string) => {
    setDetailEntityType(type);
    setDetailEntityId(id);
    setDetailDrawerOpen(true);
  };

  // Open assign modal
  const handleOpenAssign = (
    type: "DISTRIBUTOR" | "RETAILER" | null = null,
    id: string | null = null,
    name: string | null = null
  ) => {
    setAssignInitialType(type);
    setAssignInitialId(id);
    setAssignInitialName(name);
    setAssignModalOpen(true);
  };

  // Open unmap modal
  const handleOpenUnmap = (type: string, id: string, name: string) => {
    setUnmapType(type);
    setUnmapId(id);
    setUnmapName(name);
    setUnmapModalOpen(true);
  };

  const handleMutationSuccess = () => {
    loadDashboardData();
    if (activeTab === "HISTORY") loadHistory();
  };

  // Filtered Unmapped records for client search
  const filteredUnmapped = useMemo(() => {
    if (!unmappedSearch.trim()) return unmappedItems;
    const q = unmappedSearch.toLowerCase();
    return unmappedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
    );
  }, [unmappedItems, unmappedSearch]);

  // Authorization Check
  if (!authLoading && !isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied (HTTP 403)</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          You do not have administrative privileges to access the Organization Mapping console.
          Only Platform and Operations Administrators can view and modify organizational scope.
        </p>
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "TENANT":
        return { label: "TENANT", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "COMPANY_MASTER":
        return { label: "COMPANY MASTER", bg: "bg-sky-50 text-sky-700 border-sky-200" };
      case "MASTER_DISTRIBUTOR":
        return { label: "MASTER DISTRIBUTOR", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "DISTRIBUTOR":
        return { label: "DISTRIBUTOR", bg: "bg-amber-50 text-amber-700 border-amber-200" };
      case "RETAILER":
        return { label: "RETAILER", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: type, bg: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  // Recursive Tree Node Item
  const renderTreeNode = (node: OrgTreeNode, depth: number = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const badge = getTypeBadge(node.type);

    return (
      <div key={node.id} className="relative">
        <div
          className={`group flex items-center justify-between py-2 px-3 my-1 rounded-xl border transition-all text-xs ${
            isExpanded ? "bg-slate-50/80 border-slate-300 shadow-2xs" : "bg-white border-slate-200 hover:border-indigo-300"
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Left: Node expander, icon, title */}
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 inline-block" />
            )}

            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${badge.bg}`}>
              {badge.label}
            </span>

            <span className="font-bold text-slate-900 truncate">{node.name}</span>
            <span className="text-[11px] text-slate-400 font-mono">({node.code})</span>

            {node.status === "ACTIVE" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {node.status}
              </span>
            )}

            {hasChildren && (
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {node.children!.length} {node.children!.length === 1 ? "child" : "children"}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
            <button
              onClick={() => handleOpenDetails(node.type, node.id)}
              className="p-1.5 rounded-md hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors"
              title="View Node Details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {(node.type === "DISTRIBUTOR" || node.type === "RETAILER") && (
              <>
                <button
                  onClick={() => handleOpenAssign(node.type as any, node.id, node.name)}
                  className="p-1.5 rounded-md hover:bg-amber-50 hover:text-amber-700 text-slate-400 transition-colors"
                  title="Reassign Parent"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleOpenUnmap(node.type, node.id, node.name)}
                  className="p-1.5 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                  title="Unmap Entity"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-200 ml-4 pl-1">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Organization Mapping
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage Tenant, Company Master, Master Distributor, Distributor and Retailer relationships.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            disabled={loadingSummary || loadingTree}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingSummary || loadingTree ? "animate-spin text-indigo-600" : ""}`}
            />
            Refresh
          </button>

          <button
            onClick={() => handleOpenAssign()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Mapping
          </button>
        </div>
      </div>

      {/* Summary Cards Grid (Section 35) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Tenants */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tenants</p>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">
            {loadingSummary ? "..." : summary?.total_tenants ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Top-level roots</p>
        </div>

        {/* Companies */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Companies</p>
          <p className="text-xl font-extrabold text-sky-600 mt-1">
            {loadingSummary ? "..." : summary?.total_companies ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Company Masters</p>
        </div>

        {/* Master Distributors */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Master Dist.</p>
          <p className="text-xl font-extrabold text-purple-600 mt-1">
            {loadingSummary ? "..." : summary?.total_master_distributors ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tier-3 Entities</p>
        </div>

        {/* Distributors */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Distributors</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            {loadingSummary ? "..." : summary?.total_distributors ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {summary?.unmapped_distributors ? `${summary.unmapped_distributors} unmapped` : "All mapped"}
          </p>
        </div>

        {/* Retailers */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Retailers</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            {loadingSummary ? "..." : summary?.total_retailers ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {summary?.unmapped_retailers ? `${summary.unmapped_retailers} unmapped` : "All mapped"}
          </p>
        </div>

        {/* Mapped Records */}
        <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Mapped</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">
            {loadingSummary ? "..." : summary?.mapped_records ?? 0}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Scoped records</p>
        </div>

        {/* Unmapped Records */}
        <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Unmapped</p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">
            {loadingSummary ? "..." : summary?.unmapped_records ?? 0}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Action required</p>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 px-5 flex items-center justify-between bg-slate-50/50">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("TREE")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "TREE"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Network className="w-4 h-4" />
              Hierarchy Tree
            </button>

            <button
              onClick={() => setActiveTab("UNMAPPED")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "UNMAPPED"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Unmapped Records
              {summary && summary.unmapped_records > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                  {summary.unmapped_records}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "HISTORY"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <History className="w-4 h-4" />
              Mapping History (Audit)
            </button>
          </div>
        </div>

        {/* TAB 1: HIERARCHY TREE */}
        {activeTab === "TREE" && (
          <div className="p-5 space-y-4">
            {/* Tree Controls & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadTree()}
                  placeholder="Search hierarchy by entity name, code or status..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Status: All</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>

              {/* Mapped Only Checkbox & Actions */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mappedOnlyFilter}
                    onChange={(e) => setMappedOnlyFilter(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Mapped Only
                </label>

                <div className="flex items-center gap-1">
                  <button
                    onClick={expandAll}
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    Collapse
                  </button>
                </div>
              </div>
            </div>

            {/* Tree View */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 min-h-[400px]">
              {loadingTree ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                  <Clock className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs font-semibold">Building organization hierarchy tree...</p>
                </div>
              ) : treeRoots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <Network className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">No hierarchy records match criteria</p>
                  <p className="text-xs text-slate-400">Try adjusting search query or filters.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {treeRoots.map((root) => renderTreeNode(root, 0))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: UNMAPPED RECORDS */}
        {activeTab === "UNMAPPED" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setUnmappedTypeFilter("ALL")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    unmappedTypeFilter === "ALL"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  All Unmapped ({unmappedItems.length})
                </button>
                <button
                  onClick={() => setUnmappedTypeFilter("DISTRIBUTOR")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    unmappedTypeFilter === "DISTRIBUTOR"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Distributors without MD
                </button>
                <button
                  onClick={() => setUnmappedTypeFilter("RETAILER")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    unmappedTypeFilter === "RETAILER"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Retailers without Distributor
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={unmappedSearch}
                  onChange={(e) => setUnmappedSearch(e.target.value)}
                  placeholder="Filter unmapped table..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Unmapped Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Entity Type</th>
                      <th className="py-3 px-4">Name & Code</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Missing Relationship</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {loadingUnmapped ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Clock className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                          Loading unmapped entities...
                        </td>
                      </tr>
                    ) : filteredUnmapped.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-bold text-slate-700">No unmapped records found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            All entities in this category have valid parent mappings.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredUnmapped.map((item) => (
                        <tr key={item.entity_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                getTypeBadge(item.entity_type).bg
                              }`}
                            >
                              {item.entity_type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">Code: {item.code}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                item.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              {item.reason}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() =>
                                handleOpenAssign(
                                  item.entity_type as any,
                                  item.entity_id,
                                  item.name
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Assign Parent
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY */}
        {activeTab === "HISTORY" && (
          <div className="p-5 space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity Type</th>
                      <th className="py-3 px-4">Admin Actor</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Clock className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                          Loading audit records...
                        </td>
                      </tr>
                    ) : historyItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700">No mapping audit history found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            All future organizational mapping assignments and transfers will appear here.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                h.action.includes("UNMAP")
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {h.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{h.entity_type}</p>
                            <p className="text-[11px] text-slate-400 font-mono break-all">{h.entity_id}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {h.actor_email || "System Admin"}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                            {h.details?.reason || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {h.timestamp ? new Date(h.timestamp).toLocaleString() : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Entity Details */}
      <EntityDetailsDrawer
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        entityType={detailEntityType}
        entityId={detailEntityId}
        onAssignClick={(t, id, name) => handleOpenAssign(t as any, id, name)}
        onUnmapClick={(t, id, name) => handleOpenUnmap(t, id, name)}
      />

      {/* Assign / Reassign Mapping Modal */}
      <AssignMappingModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={handleMutationSuccess}
        initialEntityType={assignInitialType}
        initialEntityId={assignInitialId}
        initialEntityName={assignInitialName}
        unmappedList={unmappedItems}
      />

      {/* Confirm Unmap Modal */}
      <ConfirmUnmapModal
        isOpen={unmapModalOpen}
        onClose={() => setUnmapModalOpen(false)}
        onSuccess={handleMutationSuccess}
        entityType={unmapType}
        entityId={unmapId}
        entityName={unmapName}
      />
    </div>
  );
};
