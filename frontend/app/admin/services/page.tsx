"use client";

import { useState, useEffect } from "react";
import { listAllServices, updateService } from "@/lib/api";
import type { Service } from "@/lib/types";
import { Tag, Pencil, Check, X, Loader2, DollarSign, Clock, Users, Search } from "lucide-react";

const CATEGORY_OPTIONS = ["Cleaning", "Laundry", "CarWash", "PestControl", "Garden", "Landscaping"];

function formatCategoryLabel(cat: string) {
  if (cat === "CarWash") return "Car Wash";
  if (cat === "PestControl") return "Pest Control";
  return cat;
}

function categoryColor(cat: string) {
  switch (cat) {
    case "Cleaning": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Laundry": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "CarWash": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "PestControl": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "Garden": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Landscaping": return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  }
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllServices();
      if (result.succeeded && result.data) {
        setServices(result.data);
      } else {
        setError(result.error ?? "Failed to load services.");
      }
    } catch {
      setError("Server error while loading services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function startEdit(s: Service) {
    setEditingId(s.id);
    setEditForm({ ...s });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setEditError(null);
  }

  async function handleSave() {
    if (!editingId || !editForm) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const result = await updateService(editingId, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        basePrice: editForm.basePrice,
        estimatedDurationMinutes: editForm.estimatedDurationMinutes,
        requiredCleaners: editForm.requiredCleaners,
        isActive: editForm.isActive,
      });
      if (result.succeeded && result.data) {
        setServices((prev) =>
          prev.map((s) => (s.id === editingId ? result.data! : s))
        );
        setEditingId(null);
        setEditForm({});
      } else {
        setEditError(result.error ?? "Failed to update service.");
      }
    } catch {
      setEditError("Server error while updating service.");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Services</h1>
          <p className="text-gray-500 text-sm">Manage service pricing, duration and availability.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{formatCategoryLabel(c)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No services found.</p>
            </div>
          )}
          {filtered.map((s) => {
            const isEditing = editingId === s.id;
            return (
              <div
                key={s.id}
                className={`rounded-xl border bg-white dark:bg-gray-900 overflow-hidden transition-all ${
                  s.isActive === false
                    ? "border-gray-200 dark:border-gray-700 opacity-70"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(s.category)}`}>
                          {formatCategoryLabel(s.category)}
                        </span>
                        {s.isActive === false && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{s.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(s)}
                          className="p-2 text-gray-400 hover:text-brand-green hover:bg-brand-green-light dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Edit service"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Read-only metrics */}
                  {!isEditing && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <Metric label="Base Price" value={`R${s.basePrice.toFixed(2)}`} icon={<DollarSign className="w-3.5 h-3.5" />} />
                      <Metric label="Duration" value={`${s.estimatedDurationMinutes} min`} icon={<Clock className="w-3.5 h-3.5" />} />
                      <Metric label="Cleaners" value={`${s.requiredCleaners}`} icon={<Users className="w-3.5 h-3.5" />} />
                    </div>
                  )}

                  {/* Edit Form */}
                  {isEditing && (
                    <div className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      {editError && (
                        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{editError}</div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={editForm.name ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                          <select
                            value={editForm.category ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c} value={c}>{formatCategoryLabel(c)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                        <textarea
                          value={editForm.description ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Base Price (ZAR)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editForm.basePrice ?? 0}
                            onChange={(e) => setEditForm((f) => ({ ...f, basePrice: parseFloat(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.estimatedDurationMinutes ?? 0}
                            onChange={(e) => setEditForm((f) => ({ ...f, estimatedDurationMinutes: parseInt(e.target.value, 10) }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Required Cleaners</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.requiredCleaners ?? 1}
                            onChange={(e) => setEditForm((f) => ({ ...f, requiredCleaners: parseInt(e.target.value, 10) }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`active-${s.id}`}
                          checked={editForm.isActive !== false}
                          onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                          className="w-4 h-4 text-brand-green border-gray-300 rounded focus:ring-brand-green"
                        />
                        <label htmlFor={`active-${s.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                          Active
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleSave}
                          disabled={editLoading}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                        >
                          {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      <div>
        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}
