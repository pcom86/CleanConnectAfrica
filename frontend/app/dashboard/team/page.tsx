"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyBusinessProfile, getProviderTeam, registerStaff, updateStaff } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { TeamMember, BusinessProfile } from "@/lib/types";

const EMPLOYMENT_TYPES = ["InternalStaff", "Contractor", "ProviderStaff"];
const STAFF_ROLES = [
  { value: "Cleaner",    label: "🧹 Cleaner",    color: "green" },
  { value: "Washer",     label: "🫧 Washer",     color: "blue" },
  { value: "Driver",     label: "🚗 Driver",     color: "orange" },
  { value: "Supervisor", label: "👷 Supervisor", color: "purple" },
] as const;
const DEFAULT_PASSWORD = "Password@123";

type ActiveTab = "team" | "add" | "edit";

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  employmentType: string;
  staffRole: string;
  skills: string;
  serviceZones: string;
  status: string;
}

const emptyForm: MemberForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  employmentType: "InternalStaff",
  staffRole: "Cleaner",
  skills: "",
  serviceZones: "",
  status: "Active",
};

export default function TeamPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<BusinessProfile | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tab, setTab] = useState<ActiveTab>("team");
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getSession();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "ProviderOwner") { router.push("/dashboard"); return; }

    getMyBusinessProfile(u.id).then(async (r) => {
      if (r.succeeded && r.data) {
        setProvider(r.data);
        const t = await getProviderTeam(r.data.id);
        if (t.succeeded && t.data) setTeam(t.data);
      }
    }).finally(() => setLoading(false));
  }, [router]);

  function startEdit(member: TeamMember) {
    setForm({
      firstName: member.name.split(" ")[0] ?? "",
      lastName: member.name.split(" ").slice(1).join(" ") ?? "",
      email: member.email,
      phoneNumber: member.phoneNumber,
      employmentType: member.employmentType,
      staffRole: member.memberRole,
      skills: member.skills,
      serviceZones: member.serviceZones,
      status: member.status,
    });
    setEditingUserId(member.userId);
    setTab("edit");
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let res;
    if (editingUserId) {
      res = await updateStaff(editingUserId, {
        ...form,
        providerId: provider.id,
        status: form.status ?? "Active",
      });
    } else {
      res = await registerStaff({
        ...form,
        passwordHash: DEFAULT_PASSWORD,
        providerId: provider.id,
      });
    }

    if (res.succeeded && res.data) {
      const action = editingUserId ? "updated" : "added";
      setSuccess(`${form.staffRole} ${res.data.firstName} ${res.data.lastName} ${action} successfully.`);
      setForm(emptyForm);
      setEditingUserId(null);
      const t = await getProviderTeam(provider.id);
      if (t.succeeded && t.data) setTeam(t.data);
      setTab("team");
    } else {
      setError(res.error ?? `Failed to ${editingUserId ? "update" : "add"} staff member.`);
    }
    setSubmitting(false);
  }

  const byRole = STAFF_ROLES.map(r => ({
    ...r,
    members: team.filter(m => m.memberRole === r.value),
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{provider?.companyName} · {team.length} staff member{team.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => {
            if (tab === "team") { setTab("add"); setError(null); setSuccess(null); setForm(emptyForm); setEditingUserId(null); }
            else { setTab("team"); setError(null); setSuccess(null); setForm(emptyForm); setEditingUserId(null); }
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "team"
              ? "bg-brand-green text-white hover:bg-brand-green-dark"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          }`}
        >
          {tab === "team" ? "+ Add Staff Member" : "← Back to staff"}
        </button>
      </div>

      {/* Feedback */}
      {success && <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Add/Edit Form */}
      {(tab === "add" || tab === "edit") && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingUserId ? "Edit Staff Member" : "New Staff Member"}</h2>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Staff Role <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {STAFF_ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, staffRole: r.value }))}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition ${
                    form.staffRole === r.value
                      ? "bg-brand-green text-white border-brand-green"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand-green"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { label: "First Name", key: "firstName", type: "text" },
              { label: "Last Name", key: "lastName", type: "text" },
              { label: "Email", key: "email", type: "email" },
              { label: "Phone Number", key: "phoneNumber", type: "tel" },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                <input required type={type}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employment Type</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}>
                {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Service Zones</label>
              <input required placeholder="e.g. Cape Town, Stellenbosch"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                value={form.serviceZones} onChange={e => setForm(f => ({ ...f, serviceZones: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Skills</label>
              <input required placeholder={form.staffRole === "Supervisor" ? "e.g. Team leadership, Scheduling" : "e.g. Deep cleaning, Window cleaning"}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            {!editingUserId && <p className="text-xs text-gray-400">Default password: <span className="font-mono font-medium">{DEFAULT_PASSWORD}</span></p>}
            <button type="submit" disabled={submitting}
              className="bg-brand-green text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-50 transition">
              {submitting ? "Saving…" : (editingUserId ? `Update ${form.staffRole}` : `Add ${form.staffRole}`)}
            </button>
          </div>
        </form>
      )}

      {/* Staff List */}
      {tab === "team" && (
        <div className="space-y-6">
          {team.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 text-sm">
              No staff members yet — click <strong>+ Add Staff Member</strong> to get started.
            </div>
          )}
          {byRole.filter(r => r.members.length > 0).map(r => (
            <section key={r.value}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {r.label} ({r.members.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {r.members.map(m => (
                  <MemberCard key={m.profileId} member={m}
                    accent={r.color as "green" | "blue" | "orange" | "purple"}
                    onEdit={() => startEdit(m)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, accent, onEdit }: { member: TeamMember; accent: "green" | "blue" | "orange" | "purple"; onEdit: () => void }) {
  const colors: Record<string, string> = {
    green:  "border-l-brand-green bg-green-50 dark:bg-green-900/10",
    blue:   "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10",
    orange: "border-l-orange-400 bg-orange-50 dark:bg-orange-900/10",
    purple: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/10",
  };
  return (
    <div className={`border border-gray-200 dark:border-gray-700 border-l-4 rounded-xl p-4 ${colors[accent]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{member.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{member.employmentType} · {member.serviceZones}</p>
        </div>
        <div className="flex items-center gap-2">
          {member.rating > 0 && (
            <span className="text-xs text-yellow-500 font-semibold whitespace-nowrap">★ {member.rating.toFixed(1)}</span>
          )}
          <button onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{member.skills}</p>
    </div>
  );
}
