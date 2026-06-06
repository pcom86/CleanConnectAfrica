"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getBookingById,
  acceptBooking,
  assignCleanerToBooking,
  updateBookingStatus,
  completeBooking,
  getProviderCleaners,
  getMyBusinessProfile,
} from "@/lib/api";
import type { BookingDetail, CleanerProfile, ServiceMilestone } from "@/lib/types";
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
  const [cleaners, setCleaners] = useState<CleanerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Completion form
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [afterPhotos, setAfterPhotos] = useState("");
  const [cleanerNotes, setCleanerNotes] = useState("");

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
        // Load cleaners for this provider
        const cleanersRes = await getProviderCleaners(bpRes.data.id);
        if (cleanersRes.succeeded && cleanersRes.data) {
          setCleaners(cleanersRes.data);
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

  async function handleAccept() {
    if (!providerId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await acceptBooking(bookingId, providerId);
      if (res.succeeded && res.data) {
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

  async function handleAssignCleaner(cleanerProfileId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await assignCleanerToBooking(bookingId, cleanerProfileId);
      if (res.succeeded && res.data) {
        await loadData();
      } else {
        setError(res.error ?? "Failed to assign cleaner.");
      }
    } catch {
      setError("API error while assigning cleaner.");
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
    const status = booking.payOnsite && booking.status === "Confirmed" ? "PayOnsite" : booking.status;
    switch (booking.status) {
      case "Confirmed":
      case "PendingPayment":
        return { label: "Accept Job", action: handleAccept, color: "bg-brand-green text-white hover:bg-brand-green-dark" };
      case "Assigned":
        return { label: "Dispatch Team", action: null, color: "bg-amber-600 text-white hover:bg-amber-700", isDispatch: true };
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{booking.serviceName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{booking.serviceCategory}</p>

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
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Select a cleaner to dispatch to this job:</p>
                {cleaners.length === 0 ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                    No cleaners registered. Register cleaners from your business profile first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cleaners.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleAssignCleaner(c.id)}
                        disabled={actionLoading}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left hover:border-brand-green hover:bg-brand-green-light dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                      >
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cleaner ID: {c.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.employmentType} · {c.skills.slice(0, 40)}…</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Rating: {c.rating.toFixed(1)}</p>
                      </button>
                    ))}
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
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Assignments</h2>
            <div className="space-y-3">
              {booking.assignments.map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{a.cleanerName ?? a.providerName ?? "Unassigned"}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{a.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{a.assignedType} · Assigned {new Date(a.assignedAt).toLocaleDateString("en-ZA")}</p>
                </div>
              ))}
            </div>
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
