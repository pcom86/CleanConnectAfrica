"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyBusinessProfile, getProviderTeam, registerStaff, updateStaff, updateVettingStatus, verifyIdentity } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { TeamMember, BusinessProfile } from "@/lib/types";

const EMPLOYMENT_TYPES = ["InternalStaff", "Contractor", "ProviderStaff"];
const SKILLS_OPTIONS = [
  "Deep Cleaning", "Window Cleaning", "Carpet Cleaning", "Office Cleaning",
  "Move-in/Move-out Cleaning", "Kitchen Cleaning", "Bathroom Sanitization",
  "Upholstery Cleaning", "Floor Buffing", "Disinfection Services",
  "Laundry Services", "Post-Construction Cleaning", "Garden Cleaning",
  "Pressure Washing", "Team Leadership", "Scheduling", "Quality Control",
  "Client Relations", "Training & Development"
];
const STAFF_ROLES = [
  { value: "Cleaner",    label: "🧹 Cleaner",    color: "green" },
  { value: "Washer",     label: "🫧 Washer",     color: "blue" },
  { value: "Driver",     label: "🚗 Driver",     color: "orange" },
  { value: "Supervisor", label: "👷 Supervisor", color: "purple" },
] as const;

const VETTING_OPTIONS = [
  { value: "NotVetted", label: "Not Vetted", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  { value: "InProgress", label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" },
  { value: "Vetted", label: "Vetted", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  { value: "Failed", label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
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
  idNumber: string;
  idDocumentUrl: string;
  profilePictureUrl: string;
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
  idNumber: "",
  idDocumentUrl: "",
  profilePictureUrl: "",
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
      idNumber: "",
      idDocumentUrl: member.idDocumentUrl ?? "",
      profilePictureUrl: member.profilePictureUrl ?? "",
    });
    setEditingUserId(member.userId);
    setTab("edit");
    setError(null);
    setSuccess(null);
  }

  function isValidSaId(id: string): boolean {
    return /^\d{13}$/.test(id.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;

    // Validate ID for new registrations
    if (!editingUserId) {
      if (!form.idNumber.trim()) {
        setError("ID Number is required.");
        return;
      }
      if (!isValidSaId(form.idNumber)) {
        setError("ID Number must be exactly 13 digits.");
        return;
      }
      if (!form.idDocumentUrl) {
        setError("ID Document photo is required.");
        return;
      }
      if (!form.skills.trim()) {
        setError("At least one skill must be selected.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let res;
    if (editingUserId) {
      const { idNumber, ...updateData } = form;
      res = await updateStaff(editingUserId, {
        ...updateData,
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

    // If registration succeeded and ID number + document provided, validate identity
    if (!editingUserId && res.succeeded && res.data && form.idNumber.trim() && form.idDocumentUrl) {
      const profileId = res.data.cleanerProfile?.id ?? res.data.supervisorProfile?.id;
      const isSupervisor = res.data.role === "Supervisor";
      if (profileId) {
        const verifyRes = await verifyIdentity(profileId, isSupervisor, form.idNumber.trim(), form.idDocumentUrl);
        if (!verifyRes.succeeded) {
          setError(`Staff added but ID verification failed: ${verifyRes.error ?? "Unknown error"}`);
          setSubmitting(false);
          const t = await getProviderTeam(provider.id);
          if (t.succeeded && t.data) setTeam(t.data);
          setTab("team");
          return;
        }
      }
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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Skills <span className="text-red-500">*</span></label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SKILLS_OPTIONS.map(skill => {
                    const selected = form.skills.split(",").map(s => s.trim()).filter(Boolean).includes(skill);
                    return (
                      <label key={skill} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition ${selected ? 'bg-brand-green/10 text-brand-green font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current = form.skills.split(",").map(s => s.trim()).filter(Boolean);
                            const next = current.includes(skill)
                              ? current.filter(s => s !== skill)
                              : [...current, skill];
                            setForm(f => ({ ...f, skills: next.join(", ") }));
                          }}
                          className="accent-brand-green"
                        />
                        <span className="truncate">{skill}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {form.skills && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selected: {form.skills}</p>
              )}
            </div>
          </div>

          {/* ID Document Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">ID Document <span className="text-red-500">*</span></span>
              <span className="text-xs text-gray-400">(required — will be verified against Identifii)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ID Number <span className="text-red-500">*</span></label>
                <input type="text" placeholder="e.g. 9201011234087" maxLength={13}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green ${form.idNumber && !isValidSaId(form.idNumber) ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                  value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value.replace(/\D/g, '').slice(0, 13) }))} />
                {form.idNumber && !isValidSaId(form.idNumber) && (
                  <p className="text-xs text-red-500 mt-1">Must be exactly 13 digits</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ID Document Photo <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setForm(f => ({ ...f, idDocumentUrl: reader.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-navy-light file:text-brand-navy hover:file:bg-brand-navy-light/80"
                />
              </div>
            </div>
            {form.idDocumentUrl && (
              <div className="relative">
                <img src={form.idDocumentUrl} alt="ID Document preview" className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-700" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, idDocumentUrl: "" }))}
                  className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded hover:bg-red-600"
                >Remove</button>
              </div>
            )}
          </div>

          {/* Profile Picture */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile Picture</span>
              <span className="text-xs text-gray-400">(optional)</span>
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setForm(f => ({ ...f, profilePictureUrl: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-navy-light file:text-brand-navy hover:file:bg-brand-navy-light/80"
              />
            </div>
            {form.profilePictureUrl && (
              <div className="relative inline-block">
                <img src={form.profilePictureUrl} alt="Profile preview" className="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, profilePictureUrl: "" }))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full hover:bg-red-600 flex items-center justify-center"
                >×</button>
              </div>
            )}
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
                    onEdit={() => startEdit(m)}
                    onUpdateVetting={async (newStatus, notes) => {
                      if (!provider) return;
                      const res = await updateVettingStatus(m.profileId, m.memberRole === "Supervisor", newStatus, notes);
                      if (res.succeeded && res.data) {
                        setTeam(prev => prev.map(tm => tm.profileId === m.profileId ? res.data! : tm));
                      } else {
                        setError(res.error ?? "Failed to update vetting status.");
                      }
                    }}
                    onVerifyId={async (idNumber, idDocumentBase64) => {
                      if (!provider) return;
                      const res = await verifyIdentity(m.profileId, m.memberRole === "Supervisor", idNumber, idDocumentBase64);
                      if (res.succeeded && res.data) {
                        setTeam(prev => prev.map(tm => tm.profileId === m.profileId ? res.data! : tm));
                      } else {
                        setError(res.error ?? "Identity verification failed.");
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function LivenessBadge({ member }: { member: TeamMember }) {
  if (member.idVerifiedAt) {
    return (
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        Liveness Required
      </span>
    );
  }
  return null;
}

function VerifyIdButton({ member, onVerifyId, vettingSaving, setVettingSaving }: {
  member: TeamMember;
  onVerifyId?: (idNumber: string, idDocumentBase64: string) => Promise<void>;
  vettingSaving: boolean;
  setVettingSaving: (v: boolean) => void;
}) {
  const [show, setShow] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [idDoc, setIdDoc] = useState(member.idDocumentUrl ?? "");

  if (!onVerifyId) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        disabled={vettingSaving}
        className="text-xs font-medium px-2 py-1 rounded-full bg-brand-navy text-white hover:bg-brand-navy-dark transition disabled:opacity-50"
      >Verify ID</button>
      {show && (
        <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Verify Identity</p>
          <input
            type="text"
            placeholder="ID Number"
            value={idNumber}
            onChange={e => setIdNumber(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          {!member.idDocumentUrl && (
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => setIdDoc(reader.result as string);
                reader.readAsDataURL(file);
              }}
              className="w-full text-xs text-gray-600 dark:text-gray-300"
            />
          )}
          {idDoc && <p className="text-xs text-green-600 dark:text-green-400">Document attached</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!idNumber.trim() || !idDoc) return;
                setVettingSaving(true);
                await onVerifyId(idNumber.trim(), idDoc);
                setVettingSaving(false);
                setShow(false);
              }}
              disabled={vettingSaving || !idNumber.trim() || !idDoc}
              className="flex-1 text-xs bg-brand-green text-white px-2 py-1 rounded hover:bg-brand-green-dark disabled:opacity-50"
            >Submit</button>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded"
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, accent, onEdit, onUpdateVetting, onVerifyId }: {
  member: TeamMember;
  accent: "green" | "blue" | "orange" | "purple";
  onEdit: () => void;
  onUpdateVetting?: (newStatus: string, notes: string | null) => Promise<void>;
  onVerifyId?: (idNumber: string, idDocumentBase64: string) => Promise<void>;
}) {
  const colors: Record<string, string> = {
    green:  "border-l-brand-green bg-green-50 dark:bg-green-900/10",
    blue:   "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10",
    orange: "border-l-orange-400 bg-orange-50 dark:bg-orange-900/10",
    purple: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/10",
  };
  const vetting = VETTING_OPTIONS.find(v => v.value === member.vettingStatus) ?? VETTING_OPTIONS[0];
  const [showVettingDropdown, setShowVettingDropdown] = useState(false);
  const [vettingNotes, setVettingNotes] = useState("");
  const [vettingSaving, setVettingSaving] = useState(false);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 border-l-4 rounded-xl p-4 ${colors[accent]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {member.profilePictureUrl ? (
            <img src={member.profilePictureUrl} alt={member.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
              {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{member.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{member.employmentType} · {member.serviceZones}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {member.rating > 0 && (
            <span className="text-xs text-yellow-500 font-semibold whitespace-nowrap">★ {member.rating.toFixed(1)}</span>
          )}
          <button onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{member.skills}</p>

      {/* ID Verification Badge */}
      <div className="mt-2 flex items-center gap-2">
        {member.idDocumentUrl ? (
          member.idVerifiedAt ? (
            <>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">ID Verified</span>
              <LivenessBadge member={member} />
            </>
          ) : (
            <>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">ID Pending</span>
              <VerifyIdButton member={member} onVerifyId={onVerifyId} vettingSaving={vettingSaving} setVettingSaving={setVettingSaving} />
            </>
          )
        ) : (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">No ID Doc</span>
        )}
        {vettingSaving && <div className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" />}
      </div>

      {/* Vetting Badge */}
      <div className="mt-2 flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => onUpdateVetting && setShowVettingDropdown(s => !s)}
            className={`text-xs font-medium px-2 py-1 rounded-full ${vetting.color} ${onUpdateVetting ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
          >
            {vetting.label}
          </button>
          {showVettingDropdown && onUpdateVetting && (
            <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
              {VETTING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={async () => {
                    setVettingSaving(true);
                    await onUpdateVetting(opt.value, vettingNotes.trim() || null);
                    setShowVettingDropdown(false);
                    setVettingSaving(false);
                  }}
                  disabled={vettingSaving || opt.value === member.vettingStatus}
                  className={`w-full text-left px-3 py-2 text-xs ${opt.value === member.vettingStatus ? "bg-gray-50 dark:bg-gray-700 font-semibold" : "hover:bg-gray-50 dark:hover:bg-gray-700"} disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Vetting notes (optional)"
                  value={vettingNotes}
                  onChange={e => setVettingNotes(e.target.value)}
                  className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              </div>
            </div>
          )}
        </div>
        {vettingSaving && (
          <div className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" />
        )}
      </div>
    </div>
  );
}
