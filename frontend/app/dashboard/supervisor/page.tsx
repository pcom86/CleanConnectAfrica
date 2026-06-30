"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSession, clearSession } from "@/lib/auth";
import { getSupervisorBookings, getBookingById, checkIn, checkOut, createPostJobReport } from "@/lib/api";
import type { User, Booking, BookingDetail, TeamMember } from "@/lib/types";
import ThemeToggle from "../../components/ThemeToggle";
import StatusBadge from "../components/StatusBadge";
import Logo from "../../components/Logo";

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check-in form
  const [showCheckInPanel, setShowCheckInPanel] = useState(true);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInPhotos, setCheckInPhotos] = useState<string[]>([]);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  // Check-out form
  const [showCheckOutPanel, setShowCheckOutPanel] = useState(true);
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [checkOutPhotos, setCheckOutPhotos] = useState<string[]>([]);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);

  // Post-job report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSummary, setReportSummary] = useState("");
  const [reportIssues, setReportIssues] = useState("");
  const [reportRecommendations, setReportRecommendations] = useState("");
  const [reportRating, setReportRating] = useState(5);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.role !== "Supervisor") {
      router.push("/dashboard");
      return;
    }
    setUser(session);
    loadBookings(session.id);
  }, [router]);

  async function loadBookings(supervisorUserId: string) {
    setLoading(true);
    try {
      const res = await getSupervisorBookings(supervisorUserId);
      if (res.succeeded && res.data) {
        setBookings(res.data);
      } else {
        setError(res.error ?? "Failed to load bookings");
      }
    } catch {
      setError("Unable to load bookings");
    } finally {
      setLoading(false);
    }
  }

  async function loadBookingDetail(bookingId: string) {
    setBookingLoading(true);
    try {
      const res = await getBookingById(bookingId);
      if (res.succeeded && res.data) {
        setSelectedBooking(res.data);
      } else {
        setError(res.error ?? "Failed to load booking details");
      }
    } catch {
      setError("Unable to load booking details");
    } finally {
      setBookingLoading(false);
    }
  }

  const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB per photo
  const MAX_TOTAL_PAYLOAD_BYTES = 8 * 1024 * 1024; // 8 MB total JSON

  function estimatePayloadSize(obj: unknown): number {
    try { return new Blob([JSON.stringify(obj)]).size; } catch { return 0; }
  }

  async function handleCheckIn(bookingId: string) {
    if (!user) return;
    setCheckInSubmitting(true);
    setError(null);
    try {
      const payload = {
        bookingId,
        userId: user.id,
        latitude: -33.9249,
        longitude: 18.4241,
        ...(checkInPhotos.length > 0 ? { photoUrls: checkInPhotos } : {}),
        notes: checkInNotes || null,
      };
      const size = estimatePayloadSize(payload);
      if (size > MAX_TOTAL_PAYLOAD_BYTES) {
        setError(`Photos are too large (${(size / 1024 / 1024).toFixed(1)} MB). Please remove some photos or use smaller images (max ~${(MAX_TOTAL_PAYLOAD_BYTES / 1024 / 1024).toFixed(0)} MB total).`);
        setCheckInSubmitting(false);
        return;
      }
      const res = await checkIn(payload);
      if (res.succeeded) {
        setCheckInNotes("");
        setCheckInPhotos([]);
        setShowCheckInPanel(false);
        loadBookingDetail(bookingId);
      } else {
        setError(res.error ?? "Check-in failed");
      }
    } catch (err) {
      console.error("Check-in error:", err);
      setError("Network error: unable to reach the server. Please check your connection and try again.");
    } finally {
      setCheckInSubmitting(false);
    }
  }

  async function handleCheckOut(bookingId: string) {
    if (!user) return;
    setCheckOutSubmitting(true);
    setError(null);
    try {
      const payload = {
        bookingId,
        userId: user.id,
        latitude: -33.9249,
        longitude: 18.4241,
        ...(checkOutPhotos.length > 0 ? { photoUrls: checkOutPhotos } : {}),
        notes: checkOutNotes || null,
        workSummary: workSummary || null,
      };
      const size = estimatePayloadSize(payload);
      if (size > MAX_TOTAL_PAYLOAD_BYTES) {
        setError(`Photos are too large (${(size / 1024 / 1024).toFixed(1)} MB). Please remove some photos or use smaller images (max ~${(MAX_TOTAL_PAYLOAD_BYTES / 1024 / 1024).toFixed(0)} MB total).`);
        setCheckOutSubmitting(false);
        return;
      }
      const res = await checkOut(payload);
      if (res.succeeded) {
        setCheckOutNotes("");
        setWorkSummary("");
        setCheckOutPhotos([]);
        setShowCheckOutPanel(false);
        loadBookingDetail(bookingId);
      } else {
        setError(res.error ?? "Check-out failed");
      }
    } catch (err) {
      console.error("Check-out error:", err);
      setError("Network error: unable to reach the server. Please check your connection and try again.");
    } finally {
      setCheckOutSubmitting(false);
    }
  }

  async function handlePostJobReport(bookingId: string) {
    if (!user) return;
    setReportSubmitting(true);
    try {
      const res = await createPostJobReport({
        bookingId,
        compiledByUserId: user.id,
        summary: reportSummary,
        issuesFound: reportIssues,
        recommendations: reportRecommendations,
        overallRating: reportRating,
        photos: [],
        checklistResults: [],
      });
      if (res.succeeded) {
        setShowReportForm(false);
        setReportSummary("");
        setReportIssues("");
        setReportRecommendations("");
        setReportRating(5);
        loadBookingDetail(bookingId);
      } else {
        setError(res.error ?? "Failed to submit report");
      }
    } catch {
      setError("Unable to submit report");
    } finally {
      setReportSubmitting(false);
    }
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <ThemeToggle />
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 sm:px-4 sm:py-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline text-sm">Dashboard</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 sm:px-4 sm:py-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline text-sm">Log out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bookings List */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-4">My Bookings</h2>
              {bookings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No bookings assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => loadBookingDetail(booking.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        selectedBooking?.id === booking.id
                          ? "border-brand-green bg-brand-green-light dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-brand-green"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{booking.serviceName}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{booking.addressLabel}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(booking.scheduledStart).toLocaleDateString()} · {new Date(booking.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {selectedBooking && (
              <button
                onClick={() => setSelectedBooking(null)}
                className="lg:hidden mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to bookings
              </button>
            )}
            {bookingLoading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
              </div>
            ) : !selectedBooking ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">Select a booking to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Booking Info */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selectedBooking.serviceName}</h2>
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Address:</span> {selectedBooking.addressSummary}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Scheduled:</span> {new Date(selectedBooking.scheduledStart).toLocaleString()} - {new Date(selectedBooking.scheduledEnd).toLocaleString()}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Price:</span> R{selectedBooking.price.toFixed(2)} {selectedBooking.currency}
                    </p>
                  </div>
                </div>

                {/* Team */}
                {selectedBooking.assignments && selectedBooking.assignments.length > 0 && selectedBooking.assignments[0].teamMembers && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Team Members</h3>
                    <div className="space-y-2">
                      {selectedBooking.assignments[0].teamMembers.map((member) => (
                        <div key={member.profileId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                          <span className="text-lg">🧹</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.employmentType} · {member.serviceZones}</p>
                          </div>
                          <span className="text-xs text-gray-400">★ {member.rating.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Check-in / Check-out */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Site Actions</h3>

                  {/* Check-in */}
                  {showCheckInPanel && (
                    <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Check In</h4>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photos (optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > MAX_PHOTO_BYTES) {
                              setError(`Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed is ${(MAX_PHOTO_BYTES / 1024 / 1024).toFixed(0)} MB.`);
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => setCheckInPhotos((prev) => [...prev, reader.result as string]);
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-xs text-gray-600 dark:text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                        />
                        {checkInPhotos.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {checkInPhotos.map((photo, idx) => (
                              <div key={idx} className="relative">
                                <img src={photo} alt={`Check-in photo ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                                <button
                                  onClick={() => setCheckInPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <textarea
                        value={checkInNotes}
                        onChange={(e) => setCheckInNotes(e.target.value)}
                        placeholder="Add check-in notes..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 mb-2"
                        rows={2}
                      />
                      <button
                        onClick={() => handleCheckIn(selectedBooking.id)}
                        disabled={checkInSubmitting}
                        className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {checkInSubmitting ? "Checking in..." : "Check In"}
                      </button>
                    </div>
                  )}

                  {/* Check-out */}
                  {showCheckOutPanel && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Check Out</h4>
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photos (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > MAX_PHOTO_BYTES) {
                            setError(`Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed is ${(MAX_PHOTO_BYTES / 1024 / 1024).toFixed(0)} MB.`);
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setCheckOutPhotos((prev) => [...prev, reader.result as string]);
                          reader.readAsDataURL(file);
                        }}
                        className="w-full text-xs text-gray-600 dark:text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                      />
                      {checkOutPhotos.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {checkOutPhotos.map((photo, idx) => (
                            <div key={idx} className="relative">
                              <img src={photo} alt={`Check-out photo ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                              <button
                                onClick={() => setCheckOutPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <textarea
                      value={checkOutNotes}
                      onChange={(e) => setCheckOutNotes(e.target.value)}
                      placeholder="Add check-out notes..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 mb-2"
                      rows={2}
                    />
                    <textarea
                      value={workSummary}
                      onChange={(e) => setWorkSummary(e.target.value)}
                      placeholder="Work summary..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 mb-2"
                      rows={2}
                    />
                    <button
                      onClick={() => handleCheckOut(selectedBooking.id)}
                      disabled={checkOutSubmitting}
                      className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {checkOutSubmitting ? "Checking out..." : "Check Out"}
                    </button>
                  </div>
                  )}
                </div>

                {/* Post-Job Report */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Post-Job Report</h3>
                    <button
                      onClick={() => setShowReportForm(!showReportForm)}
                      className="text-sm text-brand-green font-medium hover:underline"
                    >
                      {showReportForm ? "Cancel" : "Create Report"}
                    </button>
                  </div>

                  {showReportForm && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary</label>
                        <textarea
                          value={reportSummary}
                          onChange={(e) => setReportSummary(e.target.value)}
                          placeholder="Job summary..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issues Found</label>
                        <textarea
                          value={reportIssues}
                          onChange={(e) => setReportIssues(e.target.value)}
                          placeholder="Any issues encountered..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommendations</label>
                        <textarea
                          value={reportRecommendations}
                          onChange={(e) => setReportRecommendations(e.target.value)}
                          placeholder="Recommendations for future jobs..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Rating</label>
                        <select
                          value={reportRating}
                          onChange={(e) => setReportRating(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                        >
                          {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handlePostJobReport(selectedBooking.id)}
                        disabled={reportSubmitting}
                        className="w-full py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-50 transition-colors"
                      >
                        {reportSubmitting ? "Submitting..." : "Submit Report"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
