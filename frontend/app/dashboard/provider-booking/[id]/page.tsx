"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getBookingById,
  acceptBooking,
  updateBookingStatus,
  completeBooking,
  getProviderTeam,
  assignTeam,
  registerStaff,
  getMyBusinessProfile,
} from "@/lib/api";
import type { BookingDetail, TeamMember } from "@/lib/types";
import { getSession } from "@/lib/auth";

const statusLabels: Record<string, string> = {
  Confirmed: "Confirmed",
  Assigned: "Accepted",
  CleanerEnRoute: "Dispatched",
  InProgress: "On Site",
  Completed: "Completed",
  PendingPayment: "Pending Payment",
  Cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  Confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Assigned: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  CleanerEnRoute: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  InProgress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PendingPayment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ProviderBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedCleaners, setSelectedCleaners] = useState<Set<string>>(new Set());
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Accept scope for recurring bookings
  const [acceptScope, setAcceptScope] = useState<"Single" | "AllInSeries">("Single");
  const [showAcceptOptions, setShowAcceptOptions] = useState(false);

  // Completion form
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [afterPhotos, setAfterPhotos] = useState("");
  const [cleanerNotes, setCleanerNotes] = useState("");

  // Inline add-member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", employmentType: "InternalStaff", staffRole: "Cleaner", skills: "", serviceZones: "" });
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [bookingId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const session = getSession();
      if (!session) { router.replace("/login"); return; }

      // Load business profile to get provider id
      const bpRes = await getMyBusinessProfile(session.id);
      if (bpRes.succeeded && bpRes.data) {
        setProviderId(bpRes.data.id);
        // Load team for this provider
        const teamRes = await getProviderTeam(bpRes.data.id);
        if (teamRes.succeeded && teamRes.data) {
          setTeamMembers(teamRes.data);
        }
      }

      const res = await getBookingById(bookingId);
      if (res.succeeded && res.data) {
        setBooking(res.data);
      } else {
        setError(res.error ?? "Booking not found.");
      }
    } catch {
      setError("Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(scope: "Single" | "AllInSeries" = "Single") {
    if (!providerId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await acceptBooking(bookingId, providerId, scope);
      if (res.succeeded && res.data) {
        setShowAcceptOptions(false);
        await loadData();
      } else {
        setError(res.error ?? "Failed to accept booking.");
      }
    } catch {
      setError("API error while accepting booking.");
    } finally {
      setActionLoading(false);
    }
  }

  const EMPLOYMENT_TYPES = ["InternalStaff", "Contractor", "ProviderStaff"];
  const STAFF_ROLES = ["Cleaner", "Washer", "Driver", "Supervisor"] as const;
  const ROLE_EMOJI: Record<string, string> = { Cleaner: "🧹", Washer: "🫧", Driver: "🚗", Supervisor: "👷" };

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId) return;
    setMemberSaving(true);
    setMemberError(null);
    const res = await registerStaff({ ...memberForm, passwordHash: "Password@123", providerId });
    if (res.succeeded && res.data) {
      setMemberForm({ firstName: "", lastName: "", email: "", phoneNumber: "", employmentType: "InternalStaff", staffRole: "Cleaner", skills: "", serviceZones: "" });
      setShowAddMember(false);
      const teamRes = await getProviderTeam(providerId);
      if (teamRes.succeeded && teamRes.data) setTeamMembers(teamRes.data);
    } else {
      setMemberError(res.error ?? `Failed to add staff member.`);
    }
    setMemberSaving(false);
  }

  async function handleAssignTeam() {
    setActionLoading(true);
    setError(null);
    try {
      const cleanerIds = Array.from(selectedCleaners);
      if (cleanerIds.length === 0) { setError("Select at least one cleaner."); setActionLoading(false); return; }
      const res = await assignTeam(bookingId, cleanerIds, selectedSupervisor || null);
      if (res.succeeded) {
        setSelectedCleaners(new Set());
        setSelectedSupervisor("");
        await loadData();
      } else {
        setError(res.error ?? "Failed to assign team.");
      }
    } catch {
      setError("API error while assigning team.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOnSite() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateBookingStatus(bookingId, "InProgress", "Team arrived on site");
      if (res.succeeded && res.data) {
        await loadData();
      } else {
        setError(res.error ?? "Failed to update status.");
      }
    } catch {
      setError("API error while updating status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    const photoList = afterPhotos
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (photoList.length === 0) {
      setError("Please provide at least one after photo URL.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await completeBooking(bookingId, photoList, cleanerNotes);
      if (res.succeeded && res.data) {
        setShowCompleteForm(false);
        await loadData();
      } else {
        setError(res.error ?? "Failed to complete booking.");
      }
    } catch {
      setError("API error while completing booking.");
    } finally {
      setActionLoading(false);
    }
  }

  function getNextAction() {
    if (!booking) return null;
    switch (booking.status) {
      case "Confirmed":
      case "PendingPayment":
        if (booking.isRecurring && booking.recurrenceGroupId) {
          return { label: "Accept Job", action: null, color: "bg-brand-green text-white hover:bg-brand-green-dark", isRecurring: true as const };
        }
        return { label: "Accept Job", action: () => handleAccept("Single"), color: "bg-brand-green text-white hover:bg-brand-green-dark" };
      case "Assigned":
        return { label: "Assign Team", action: null, color: "bg-amber-600 text-white hover:bg-amber-700", isDispatch: true };
      case "CleanerEnRoute":
        return { label: "Report On Site", action: handleOnSite, color: "bg-purple-600 text-white hover:bg-purple-700" };
      case "InProgress":
        return { label: "Report Complete", action: () => setShowCompleteForm(true), color: "bg-green-600 text-white hover:bg-green-700" };
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading booking…</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">← Back to Dashboard</button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const nextAction = getNextAction();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">← Back to Dashboard</button>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status] ?? "bg-gray-100 text-gray-600"}`}>
            {booking.payOnsite && booking.status === "Confirmed" ? "Pay Onsite" : (statusLabels[booking.status] ?? booking.status)}
          </span>
        </div>

        {/* Booking Info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{booking.serviceName}</h1>
            {booking.isRecurring && booking.recurrenceFrequency && (
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
                {booking.recurrenceFrequency}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{booking.serviceCategory}</p>
          {booking.isRecurring && booking.recurrenceCount && booking.recurrenceCount > 1 && (
            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Recurring Booking — {booking.recurrenceCount} occurrences
                {booking.recurrenceIndex ? ` (Occurrence ${booking.recurrenceIndex} of ${booking.recurrenceCount})` : ""}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Unit price: R{booking.price.toFixed(2)} × {booking.recurrenceCount} = Total: R{(booking.price * booking.recurrenceCount).toFixed(2)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Address</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{booking.addressLabel}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{booking.addressSummary}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Schedule</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                {new Date(booking.scheduledStart).toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(booking.scheduledStart).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })} — {new Date(booking.scheduledEnd).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Price</p>
              <p className="text-lg font-bold text-brand-green mt-1">R{booking.price.toFixed(2)}</p>
              {booking.isRecurring && booking.recurrenceCount && booking.recurrenceCount > 1 && (
                <p className="text-xs text-brand-green font-medium">× {booking.recurrenceCount} = R{(booking.price * booking.recurrenceCount).toFixed(2)} total</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">{booking.currency}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Payment</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{booking.paymentStatus}</p>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {nextAction && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Next Action</h2>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>}

            {nextAction.isDispatch ? (
              <div className="space-y-5">
                {/* ── Step 1: Build your team ── */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Step 1 — Your Staff</p>
                    <button
                      type="button"
                      onClick={() => { setShowAddMember(!showAddMember); setMemberError(null); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        showAddMember
                          ? "bg-gray-400 text-white"
                          : "bg-brand-green text-white hover:bg-brand-green-dark"
                      }`}
                    >
                      {showAddMember ? "✕ Cancel" : "+ Add Staff"}
                    </button>
                  </div>

                  {/* Inline create form */}
                  {showAddMember && (
                    <form onSubmit={handleAddMember} className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      {memberError && <p className="text-xs text-red-600 dark:text-red-400">{memberError}</p>}
                      {/* Role selector */}
                      <div className="flex gap-2 flex-wrap">
                        {STAFF_ROLES.map(r => (
                          <button key={r} type="button"
                            onClick={() => setMemberForm(f => ({ ...f, staffRole: r }))}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                              memberForm.staffRole === r
                                ? "bg-brand-green text-white border-brand-green"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                            }`}>
                            {ROLE_EMOJI[r]} {r}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["firstName", "lastName"] as const).map(k => (
                          <input key={k} required placeholder={k === "firstName" ? "First name" : "Last name"}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                            value={memberForm[k]} onChange={e => setMemberForm(f => ({ ...f, [k]: e.target.value }))} />
                        ))}
                        <input required type="email" placeholder="Email"
                          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} />
                        <input required type="tel" placeholder="Phone"
                          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          value={memberForm.phoneNumber} onChange={e => setMemberForm(f => ({ ...f, phoneNumber: e.target.value }))} />
                        <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          value={memberForm.employmentType} onChange={e => setMemberForm(f => ({ ...f, employmentType: e.target.value }))}>
                          {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <input required placeholder="Service zones (e.g. Cape Town)"
                          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          value={memberForm.serviceZones} onChange={e => setMemberForm(f => ({ ...f, serviceZones: e.target.value }))} />
                        <input required placeholder="Skills (e.g. Deep cleaning)"
                          className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green"
                          value={memberForm.skills} onChange={e => setMemberForm(f => ({ ...f, skills: e.target.value }))} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">Default password: <span className="font-mono">Password@123</span></p>
                        <button type="submit" disabled={memberSaving}
                          className="text-xs bg-brand-green text-white px-4 py-1.5 rounded-lg font-medium hover:bg-brand-green-dark disabled:opacity-50 transition-colors">
                          {memberSaving ? "Saving…" : `Add ${memberForm.staffRole}`}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Current staff roster */}
                  <div className="p-4">
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No staff yet — click <strong>+ Add Staff</strong> above.</p>
                    ) : (
                      <div className="space-y-2">
                        {teamMembers.map(m => (
                          <div key={m.profileId} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                            <span className="text-base">{ROLE_EMOJI[m.memberRole] ?? "�"}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{m.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.memberRole} · {m.employmentType}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Step 2: Assign to this job ── */}
                {teamMembers.length > 0 && (() => {
                  const assignable = teamMembers.filter(m => m.memberRole !== "Supervisor");
                  const supervisors = teamMembers.filter(m => m.memberRole === "Supervisor");
                  return (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Step 2 — Assign to This Job</p>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Assign Staff <span className="text-red-500">*</span></p>
                          {assignable.length === 0 ? (
                            <p className="text-sm text-amber-600">No staff in team — add cleaners, washers, or drivers above.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {assignable.map(m => (
                                <label key={m.profileId} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                  selectedCleaners.has(m.profileId)
                                    ? "border-brand-green bg-green-50 dark:bg-green-900/20 dark:border-green-600"
                                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-brand-green"
                                }`}>
                                  <input type="checkbox" className="mt-0.5 rounded border-gray-300"
                                    checked={selectedCleaners.has(m.profileId)}
                                    onChange={e => {
                                      const next = new Set(selectedCleaners);
                                      e.target.checked ? next.add(m.profileId) : next.delete(m.profileId);
                                      setSelectedCleaners(next);
                                    }} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.employmentType} · {m.serviceZones}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.skills}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        {supervisors.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Supervisor <span className="text-gray-400">(optional)</span></p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                selectedSupervisor === "" ? "border-gray-300 bg-gray-50 dark:bg-gray-800" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400"
                              }`}>
                                <input type="radio" name="supervisor" value="" checked={selectedSupervisor === ""} onChange={() => setSelectedSupervisor("")} />
                                <span className="text-sm text-gray-500">None</span>
                              </label>
                              {supervisors.map(m => (
                                <label key={m.profileId} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                  selectedSupervisor === m.profileId
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"
                                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400"
                                }`}>
                                  <input type="radio" name="supervisor" value={m.profileId}
                                    checked={selectedSupervisor === m.profileId}
                                    onChange={() => setSelectedSupervisor(m.profileId)} className="mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.employmentType} · {m.serviceZones}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleAssignTeam}
                          disabled={actionLoading || selectedCleaners.size === 0}
                          className="w-full py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading ? "Assigning…" : `Dispatch Team (${selectedCleaners.size} cleaner${selectedCleaners.size !== 1 ? "s" : ""}${selectedSupervisor ? " + supervisor" : ""})`}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : nextAction.isRecurring ? (
              <div className="space-y-3">
                {!showAcceptOptions ? (
                  <button
                    onClick={() => setShowAcceptOptions(true)}
                    disabled={actionLoading}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${nextAction.color}`}
                  >
                    {actionLoading ? "Processing…" : nextAction.label}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Recurring Booking — {booking.recurrenceCount} occurrences</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Unit: R{booking.price.toFixed(2)} × {booking.recurrenceCount} = <span className="font-semibold">R{(booking.price * (booking.recurrenceCount ?? 1)).toFixed(2)} total</span>
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Accept:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAccept("Single")}
                        disabled={actionLoading}
                        className="py-3 px-4 rounded-xl border-2 border-brand-green bg-white dark:bg-gray-800 text-brand-green font-semibold hover:bg-brand-green-light dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 text-sm"
                      >
                        {actionLoading ? "…" : `This occurrence only (R${booking.price.toFixed(2)})`}
                      </button>
                      <button
                        onClick={() => handleAccept("AllInSeries")}
                        disabled={actionLoading}
                        className="py-3 px-4 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 text-sm"
                      >
                        {actionLoading ? "…" : `Entire series (R${(booking.price * (booking.recurrenceCount ?? 1)).toFixed(2)})`}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowAcceptOptions(false)}
                      disabled={actionLoading}
                      className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={nextAction.action ?? undefined}
                disabled={actionLoading}
                className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${nextAction.color}`}
              >
                {actionLoading ? "Processing…" : nextAction.label}
              </button>
            )}
          </div>
        )}

        {/* Completion Form */}
        {showCompleteForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Complete Job</h2>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">After Photo URLs</label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Comma-separated image URLs</p>
                <textarea
                  value={afterPhotos}
                  onChange={(e) => setAfterPhotos(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 text-sm"
                  placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cleaner Notes</label>
                <textarea
                  value={cleanerNotes}
                  onChange={(e) => setCleanerNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 text-sm"
                  placeholder="Describe the work completed, any issues, etc."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleComplete} disabled={actionLoading} className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                  {actionLoading ? "Saving…" : "Submit Completion Report"}
                </button>
                <button onClick={() => setShowCompleteForm(false)} disabled={actionLoading} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Job Details */}
        {booking.jobDetail && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Job Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400 dark:text-gray-500">Cleaning Type:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{booking.jobDetail.cleaningType}</span></div>
              {booking.jobDetail.numberOfRooms != null && <div><span className="text-gray-400 dark:text-gray-500">Rooms:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{booking.jobDetail.numberOfRooms}</span></div>}
              {booking.jobDetail.squareMeters != null && <div><span className="text-gray-400 dark:text-gray-500">Area:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{booking.jobDetail.squareMeters} m²</span></div>}
              <div><span className="text-gray-400 dark:text-gray-500">Has Pets:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{booking.jobDetail.hasPets ? "Yes" : "No"}</span></div>
              {booking.jobDetail.specialInstructions && <div className="sm:col-span-2"><span className="text-gray-400 dark:text-gray-500">Instructions:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{booking.jobDetail.specialInstructions}</span></div>}
              {booking.jobDetail.teamDispatchedAt && <div><span className="text-gray-400 dark:text-gray-500">Dispatched:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{new Date(booking.jobDetail.teamDispatchedAt).toLocaleString("en-ZA")}</span></div>}
              {booking.jobDetail.teamArrivedAt && <div><span className="text-gray-400 dark:text-gray-500">Arrived:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{new Date(booking.jobDetail.teamArrivedAt).toLocaleString("en-ZA")}</span></div>}
              {booking.jobDetail.completedAt && <div><span className="text-gray-400 dark:text-gray-500">Completed:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{new Date(booking.jobDetail.completedAt).toLocaleString("en-ZA")}</span></div>}
              {booking.jobDetail.cleanerNotes && <div className="sm:col-span-2"><span className="text-gray-400 dark:text-gray-500">Cleaner Notes:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{booking.jobDetail.cleanerNotes}</span></div>}
              {booking.jobDetail.afterPhotos.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 dark:text-gray-500 block mb-2">After Photos:</span>
                  <div className="flex flex-wrap gap-2">
                    {booking.jobDetail.afterPhotos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-brand-green underline">Photo {i + 1}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignments */}
        {booking.assignments.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Assigned Team</h2>
            {booking.assignments.map((a) => (
              <div key={a.id} className="space-y-3">
                {/* Team cleaners */}
                {(a.teamMembers && a.teamMembers.length > 0) ? (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Cleaners</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {a.teamMembers.map((m) => (
                        <div key={m.profileId} className="p-3 rounded-xl border border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 text-sm">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{m.employmentType} · {m.serviceZones}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : a.cleanerName ? (
                  <div className="p-3 rounded-xl border border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{a.cleanerName}</p>
                  </div>
                ) : null}
                {/* Supervisor */}
                {a.supervisorName && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Supervisor</p>
                    <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{a.supervisorName}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">{a.assignedType} · Assigned {new Date(a.assignedAt).toLocaleDateString("en-ZA")}</p>
              </div>
            ))}
          </div>
        )}

        {/* Milestones */}
        {booking.milestones.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Activity Timeline</h2>
            <div className="space-y-4 relative pl-4">
              {booking.milestones.map((m, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-brand-green" />
                  {i < booking.milestones.length - 1 && <div className="absolute -left-3.5 top-3.5 w-px h-full bg-gray-200 dark:bg-gray-700" />}
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.milestoneType}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.status} · {new Date(m.occurredAt).toLocaleString("en-ZA")}</p>
                  {m.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{m.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
