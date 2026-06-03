"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminStats } from "@/lib/api";
import type { AdminStats } from "@/lib/types";

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center text-lg`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getAdminStats();
        if (result.succeeded && result.data) {
          setStats(result.data);
        } else {
          setError(result.error ?? "Failed to load stats.");
        }
      } catch {
        setError("Unable to reach the server.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Overview of platform activity.</p>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Users" value={stats.totalUsers} icon="👥" color="bg-blue-50" />
            <StatCard label="Total Providers" value={stats.totalProviders} icon="🏢" color="bg-purple-50" />
            <StatCard label="Pending Review" value={stats.pendingProviders} icon="⏳" color="bg-amber-50" />
            <StatCard label="Approved" value={stats.approvedProviders} icon="✅" color="bg-green-50" />
            <StatCard label="Rejected" value={stats.rejectedProviders} icon="🚫" color="bg-red-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/admin/business-profiles"
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <p className="font-medium text-gray-900">Business Profiles</p>
                      <p className="text-sm text-gray-500">Review and approve provider applications</p>
                    </div>
                  </div>
                  <span className="text-brand-green font-medium">→</span>
                </Link>
                <Link
                  href="/admin/users"
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👥</span>
                    <div>
                      <p className="font-medium text-gray-900">Users</p>
                      <p className="text-sm text-gray-500">Manage accounts and statuses</p>
                    </div>
                  </div>
                  <span className="text-brand-green font-medium">→</span>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Pending Reviews</h2>
              {stats.pendingProviders > 0 ? (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-medium text-amber-800">
                      {stats.pendingProviders} business profile{stats.pendingProviders > 1 ? "s" : ""} awaiting review
                    </p>
                    <Link href="/admin/business-profiles" className="text-sm text-brand-green font-medium hover:underline">
                      Go to business profiles →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No pending reviews. All caught up!</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
