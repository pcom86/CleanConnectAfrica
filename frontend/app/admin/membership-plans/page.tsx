"use client";

import { useState, useEffect } from "react";
import { listAdminMembershipPlans, createMembershipPlan, updateMembershipPlan, deleteMembershipPlan } from "@/lib/api";
import type { MembershipPlan } from "@/lib/types";

const BILLING_CYCLES = ["None", "Monthly"];

export default function AdminMembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    joiningFeeAmount: "",
    recurringFeeAmount: "",
    billingCycle: "None",
    defaultCommissionRate: "0.10",
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminMembershipPlans();
      if (result.succeeded && result.data) {
        setPlans(result.data);
      } else {
        setError(result.error ?? "Failed to load plans.");
      }
    } catch {
      setError("Server error while loading plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingPlan(null);
    setForm({
      name: "",
      description: "",
      joiningFeeAmount: "",
      recurringFeeAmount: "",
      billingCycle: "None",
      defaultCommissionRate: "0.10",
      isActive: true,
    });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(plan: MembershipPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      joiningFeeAmount: String(plan.joiningFeeAmount),
      recurringFeeAmount: String(plan.recurringFeeAmount),
      billingCycle: plan.billingCycle,
      defaultCommissionRate: String(plan.defaultCommissionRate),
      isActive: plan.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const joiningFee = parseFloat(form.joiningFeeAmount);
    const recurringFee = parseFloat(form.recurringFeeAmount);
    const commissionRate = parseFloat(form.defaultCommissionRate);

    if (!form.name.trim() || !form.description.trim()) {
      setFormError("Name and description are required.");
      return;
    }
    if (isNaN(joiningFee) || joiningFee < 0) {
      setFormError("Joining fee must be a valid non-negative number.");
      return;
    }
    if (isNaN(recurringFee) || recurringFee < 0) {
      setFormError("Recurring fee must be a valid non-negative number.");
      return;
    }
    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
      setFormError("Commission rate must be between 0 and 1 (e.g., 0.10 for 10%).");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        joiningFeeAmount: joiningFee,
        recurringFeeAmount: recurringFee,
        billingCycle: form.billingCycle,
        defaultCommissionRate: commissionRate,
        isActive: form.isActive,
      };

      if (editingPlan) {
        const result = await updateMembershipPlan(editingPlan.id, payload);
        if (result.succeeded) {
          setShowForm(false);
          await load();
        } else {
          setFormError(result.error ?? "Failed to update plan.");
        }
      } else {
        const result = await createMembershipPlan(payload);
        if (result.succeeded) {
          setShowForm(false);
          await load();
        } else {
          setFormError(result.error ?? "Failed to create plan.");
        }
      }
    } catch {
      setFormError("Server error.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(plan: MembershipPlan) {
    if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) return;
    setActionLoading(plan.id);
    try {
      const result = await deleteMembershipPlan(plan.id);
      if (result.succeeded) {
        await load();
      } else {
        setError(result.error ?? "Failed to delete plan.");
      }
    } catch {
      setError("Server error during deletion.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
          <p className="text-sm text-gray-500">Manage joining fees, recurring fees, and commission rates.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors"
        >
          + Create Plan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading plans…</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No membership plans found.</p>
          <button onClick={openCreate} className="mt-3 text-brand-green text-sm font-medium hover:underline">
            Create your first plan
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Joining Fee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recurring Fee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Billing</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Commission</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{plan.name}</div>
                    <div className="text-xs text-gray-500">{plan.description}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">R{plan.joiningFeeAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {plan.recurringFeeAmount > 0 ? `R${plan.recurringFeeAmount.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{plan.billingCycle}</td>
                  <td className="px-4 py-3 text-gray-900">{(plan.defaultCommissionRate * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        disabled={actionLoading === plan.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === plan.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPlan ? "Edit Plan" : "Create Plan"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Starter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the plan"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Fee (ZAR)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.joiningFeeAmount}
                    onChange={(e) => setForm({ ...form, joiningFeeAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recurring Fee (ZAR)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.recurringFeeAmount}
                    onChange={(e) => setForm({ ...form, recurringFeeAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  >
                    {BILLING_CYCLES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.defaultCommissionRate}
                    onChange={(e) => setForm({ ...form, defaultCommissionRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. 0.10 = 10%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-brand-green"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Plan is active and available for selection</label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
                >
                  {formLoading ? "Saving…" : editingPlan ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
