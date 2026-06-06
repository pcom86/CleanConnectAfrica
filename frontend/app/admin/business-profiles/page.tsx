"use client";

import { useEffect, useState } from "react";
import { listBusinessProfiles, approveBusinessProfile, rejectBusinessProfile, updateBusinessProfile } from "@/lib/api";
import type { BusinessProfile, PagedResult, ServiceCategory } from "@/lib/types";

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
  const [editingProfile, setEditingProfile] = useState<BusinessProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    companyName: "",
    registrationNumber: "",
    taxNumber: "",
    serviceCategories: [] as ServiceCategory[],
    baseLocation: "",
    streetAddress: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    serviceAreas: "" as string,
    serviceRadiusKm: "",
    joiningFeeAmount: "",
    commissionRate: "",
    isEligibleForBookings: false,
  });

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

  function openEdit(profile: BusinessProfile) {
    setEditingProfile(profile);
    setEditForm({
      companyName: profile.companyName,
      registrationNumber: profile.registrationNumber,
      taxNumber: profile.taxNumber ?? "",
      serviceCategories: profile.serviceCategories as ServiceCategory[],
      baseLocation: profile.baseLocation ?? "",
      streetAddress: profile.streetAddress ?? "",
      suburb: profile.suburb ?? "",
      city: profile.city ?? "",
      province: profile.province ?? "",
      postalCode: profile.postalCode ?? "",
      serviceAreas: profile.serviceAreas.join(", "),
      serviceRadiusKm: String(profile.serviceRadiusKm),
      joiningFeeAmount: String(profile.joiningFeeAmount),
      commissionRate: String(profile.commissionRate),
      isEligibleForBookings: profile.isEligibleForBookings,
    });
    setEditFormError(null);
    setShowEditModal(true);
  }

  function toggleServiceCategory(cat: ServiceCategory) {
    setEditForm((prev) => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(cat)
        ? prev.serviceCategories.filter((c) => c !== cat)
        : [...prev.serviceCategories, cat],
    }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProfile) return;
    setEditFormError(null);

    if (!editForm.companyName.trim() || !editForm.registrationNumber.trim()) {
      setEditFormError("Company name and registration number are required.");
      return;
    }
    if (editForm.serviceCategories.length === 0) {
      setEditFormError("Select at least one service category.");
      return;
    }
    const serviceRadius = parseFloat(editForm.serviceRadiusKm);
    const joiningFee = parseFloat(editForm.joiningFeeAmount);
    const commission = parseFloat(editForm.commissionRate);
    if (isNaN(serviceRadius) || serviceRadius <= 0) {
      setEditFormError("Service radius must be greater than 0.");
      return;
    }
    if (isNaN(joiningFee) || joiningFee < 0) {
      setEditFormError("Joining fee must be a valid non-negative number.");
      return;
    }
    if (isNaN(commission) || commission < 0 || commission > 1) {
      setEditFormError("Commission rate must be between 0 and 1.");
      return;
    }

    setEditFormLoading(true);
    try {
      const result = await updateBusinessProfile(editingProfile.id, {
        companyName: editForm.companyName.trim(),
        registrationNumber: editForm.registrationNumber.trim(),
        taxNumber: editForm.taxNumber.trim() || null,
        serviceCategories: editForm.serviceCategories,
        baseLocation: editForm.baseLocation.trim(),
        streetAddress: editForm.streetAddress.trim() || null,
        suburb: editForm.suburb.trim() || null,
        city: editForm.city.trim() || null,
        province: editForm.province.trim() || null,
        postalCode: editForm.postalCode.trim() || null,
        serviceAreas: editForm.serviceAreas.split(",").map((s) => s.trim()).filter(Boolean),
        serviceRadiusKm: serviceRadius,
        joiningFeeAmount: joiningFee,
        commissionRate: commission,
        isEligibleForBookings: editForm.isEligibleForBookings,
      });
      if (result.succeeded) {
        setShowEditModal(false);
        await load(1);
      } else {
        setEditFormError(result.error ?? "Failed to update profile.");
      }
    } catch {
      setEditFormError("Server error while saving.");
    } finally {
      setEditFormLoading(false);
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
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => openEdit(p)}
                          disabled={actionLoading === p.id}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                        >
                          Edit
                        </button>
                        {(p.status === "UnderReview" || p.status === "PendingJoiningFee") && (
                          <>
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
                          </>
                        )}
                      </div>
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

      {/* Edit Modal */}
      {showEditModal && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit Business Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{editFormError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  required
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    required
                    value={editForm.registrationNumber}
                    onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Number</label>
                  <input
                    value={editForm.taxNumber}
                    onChange={(e) => setEditForm({ ...editForm, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Categories</label>
                <div className="flex flex-wrap gap-2">
                  {(["Cleaning", "Laundry", "CarWash"] as ServiceCategory[]).map((cat) => {
                    const isSelected = editForm.serviceCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleServiceCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isSelected
                            ? "bg-brand-green-light text-brand-green border-brand-green"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {cat === "CarWash" ? "Car Wash" : cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Location</label>
                <input
                  required
                  value={editForm.baseLocation}
                  onChange={(e) => setEditForm({ ...editForm, baseLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  value={editForm.streetAddress}
                  onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
                  <input
                    value={editForm.suburb}
                    onChange={(e) => setEditForm({ ...editForm, suburb: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <select
                    value={editForm.province}
                    onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 bg-white"
                  >
                    <option value="">Select province</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="Northern Cape">Northern Cape</option>
                    <option value="North West">North West</option>
                    <option value="Western Cape">Western Cape</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Areas <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <input
                  value={editForm.serviceAreas}
                  onChange={(e) => setEditForm({ ...editForm, serviceAreas: e.target.value })}
                  placeholder="e.g. Sandton, Randburg, Fourways"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    step={0.1}
                    value={editForm.serviceRadiusKm}
                    onChange={(e) => setEditForm({ ...editForm, serviceRadiusKm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Fee (ZAR)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.joiningFeeAmount}
                    onChange={(e) => setEditForm({ ...editForm, joiningFeeAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={editForm.commissionRate}
                    onChange={(e) => setEditForm({ ...editForm, commissionRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. 0.10 = 10%</p>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="isEligible"
                    type="checkbox"
                    checked={editForm.isEligibleForBookings}
                    onChange={(e) => setEditForm({ ...editForm, isEligibleForBookings: e.target.checked })}
                    className="w-4 h-4 accent-brand-green"
                  />
                  <label htmlFor="isEligible" className="text-sm text-gray-700">Eligible for bookings</label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex-1 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
                >
                  {editFormLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
