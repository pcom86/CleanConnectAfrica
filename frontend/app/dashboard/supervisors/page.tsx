"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyBusinessProfile, getProviderSupervisors, registerSupervisor } from "@/lib/api";
import type { SupervisorProfile, BusinessProfile } from "@/lib/types";

const EMPLOYMENT_TYPES = ["FullTime", "PartTime", "Contract", "Freelance"];
const DEFAULT_PASSWORD = "Password@123";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  employmentType: string;
  skills: string;
  serviceZones: string;
}

const empty: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  employmentType: "FullTime",
  skills: "",
  serviceZones: "",
};

export default function SupervisorsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<BusinessProfile | null>(null);
  const [supervisors, setSupervisors] = useState<SupervisorProfile[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "ProviderOwner") { router.push("/dashboard"); return; }
    setUserId(u.id);
    getMyBusinessProfile(u.id).then((r) => {
      if (r.succeeded && r.data) {
        setProvider(r.data);
        return getProviderSupervisors(r.data.id);
      }
    }).then((r) => {
      if (r?.succeeded && r.data) setSupervisors(r.data);
    }).finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const res = await registerSupervisor({
      ...form,
      passwordHash: DEFAULT_PASSWORD,
      providerId: provider.id,
    });
    if (res.succeeded && res.data) {
      setSuccess(`Supervisor ${res.data.firstName} ${res.data.lastName} onboarded successfully.`);
      setForm(empty);
      setShowForm(false);
      const updated = await getProviderSupervisors(provider.id);
      if (updated.succeeded && updated.data) setSupervisors(updated.data);
    } else {
      setError(res.error ?? "Failed to register supervisor.");
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supervisors for {provider?.companyName}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          {showForm ? "Cancel" : "+ Add Supervisor"}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">New Supervisor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input required type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}>
                {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Service Zones</label>
              <input required placeholder="e.g. Cape Town, Stellenbosch" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.serviceZones} onChange={e => setForm(f => ({ ...f, serviceZones: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Skills</label>
              <input required placeholder="e.g. Deep cleaning, Team leadership, Quality control" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Default password <span className="font-mono font-medium">{DEFAULT_PASSWORD}</span> — supervisor should change on first login.</p>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {submitting ? "Saving…" : "Add Supervisor"}
            </button>
          </div>
        </form>
      )}

      {supervisors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👷</p>
          <p className="font-medium">No supervisors yet</p>
          <p className="text-sm mt-1">Add your first supervisor to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Skills</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Zones</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supervisors.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{s.employmentType}</td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{s.skills}</td>
                  <td className="px-4 py-3 text-gray-600">{s.serviceZones}</td>
                  <td className="px-4 py-3 text-yellow-600 font-medium">
                    {s.rating > 0 ? `★ ${s.rating.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                    }`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
