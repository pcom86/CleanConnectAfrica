"use client";

import { useEffect, useState } from "react";
import { listBusinessProfiles, approveBusinessProfile, rejectBusinessProfile } from "@/lib/api";
import type { BusinessProfile, PagedResult } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "UnderReview", label: "Under Review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "PendingJoiningFee", label: "Pending Fee" },
];

export default function AdminBusinessProfilesPage() {
  const [profiles, setProfiles] = useState<PagedResult<BusinessProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load(page = 1) {
    setLoading(true);
    setError(null);
    try {
      const result = await listBusinessProfiles({
        status: statusFilter || undefined,
        page,
        pageSize: 10,
      });
      if (result.succeeded && result.data) {
        setProfiles(result.data);
      } else {
        setError(result.error ?? "Failed to load profiles.");
      }
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [statusFilter]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      const result = await approveBusinessProfile(id);
      if (result.succeeded) {
        await load(1);
      } else {
        setError(result.error ?? "Approve failed.");
      }
    } catch {
      setError("Server error during approve.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      const result = await rejectBusinessProfile(id);
      if (result.succeeded) {
        await load(1);
      } else {
        setError(result.error ?? "Reject failed.");
      }
    } catch {
      setError("Server error during reject.");
    } finally {
      setActionLoading(null);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      UnderReview: "bg-amber-50 text-amber-700 border-amber-200",
      Approved: "bg-green-50 text-green-700 border-green-200",
      Rejected: "bg-red-50 text-red-700 border-red-200",
      PendingJoiningFee: "bg-blue-50 text-blue-700 border-blue-200",
      ApplicationStarted: "bg-gray-50 text-gray-600 border-gray-200",
      Submitted: "bg-gray-50 text-gray-600 border-gray-200",
      JoiningFeePaid: "bg-green-50 text-green-700 border-green-200",
      Suspended: "bg-red-50 text-red-700 border-red-200",
      Inactive: "bg-gray-50 text-gray-400 border-gray-200",
    };
    return map[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Business Profiles</h1>
      <p className="text-gray-500 text-sm mb-6">Review, approve and manage provider applications.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Reg. Number</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Base Location</th>
                <th className="px-4 py-3">Areas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20 animate-pulse"></div></td>
                    ))}
                  </tr>
                ))
              ) : profiles && profiles.items.length > 0 ? (
                profiles.items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.companyName}</p>
                      <p className="text-xs text-gray-400">{p.taxNumber ?? "No tax number"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.registrationNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.serviceCategories.map((cat) => (
                          <span key={cat} className="px-2 py-0.5 bg-brand-green-light text-brand-green text-xs rounded-full font-medium">
                            {cat === "CarWash" ? "Car Wash" : cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.baseLocation ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {p.serviceAreas.slice(0, 3).map((a) => (
                          <span key={a} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{a}</span>
                        ))}
                        {p.serviceAreas.length > 3 && (
                          <span className="text-xs text-gray-400">+{p.serviceAreas.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(p.status)}`}>
                        {p.status === "CarWash" ? "Car Wash" : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "UnderReview" || p.status === "PendingJoiningFee" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={actionLoading === p.id}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === p.id ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            disabled={actionLoading === p.id}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No business profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {profiles && profiles.totalCount > profiles.pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <p className="text-gray-500">
              Showing {((profiles.page - 1) * profiles.pageSize) + 1}–
              {Math.min(profiles.page * profiles.pageSize, profiles.totalCount)} of {profiles.totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(profiles.page - 1)}
                disabled={profiles.page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => load(profiles.page + 1)}
                disabled={profiles.page * profiles.pageSize >= profiles.totalCount}
                className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
