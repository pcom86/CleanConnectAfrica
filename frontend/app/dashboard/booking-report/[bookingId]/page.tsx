"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getBookingById,
  getBookingCheckIns,
  getBookingCheckOuts,
  getPostJobReport,
  checkIn,
  checkOut,
  createPostJobReport,
} from "@/lib/api";
import type { BookingDetail, JobCheckIn, JobCheckOut, PostJobReport } from "@/lib/types";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

const DEFAULT_CHECKLIST = [
  "All surfaces cleaned",
  "Floors mopped/vacuumed",
  "Bathrooms sanitised",
  "Kitchen cleaned",
  "Waste disposed",
];

export default function BookingReportPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [checkIns, setCheckIns] = useState<JobCheckIn[]>([]);
  const [checkOuts, setCheckOuts] = useState<JobCheckOut[]>([]);
  const [report, setReport] = useState<PostJobReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Check-in form
  const [ciNotes, setCiNotes] = useState("");
  const [ciSubmitting, setCiSubmitting] = useState(false);

  // Check-out form
  const [coNotes, setCoNotes] = useState("");
  const [coSummary, setCoSummary] = useState("");
  const [coSubmitting, setCoSubmitting] = useState(false);

  // Report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [rSummary, setRSummary] = useState("");
  const [rIssues, setRIssues] = useState("");
  const [rRecs, setRRecs] = useState("");
  const [rRating, setRRating] = useState<number>(5);
  const [checklist, setChecklist] = useState<{ taskName: string; completed: boolean }[]>(
    DEFAULT_CHECKLIST.map((t) => ({ taskName: t, completed: false }))
  );
  const [rSubmitting, setRSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    setUserId(u.id);

    Promise.all([
      getBookingById(bookingId),
      getBookingCheckIns(bookingId),
      getBookingCheckOuts(bookingId),
      getPostJobReport(bookingId),
    ]).then(([b, ci, co, rpt]) => {
      if (b.succeeded && b.data) setBooking(b.data);
      if (ci.succeeded && ci.data) setCheckIns(ci.data);
      if (co.succeeded && co.data) setCheckOuts(co.data);
      if (rpt.succeeded && rpt.data) setReport(rpt.data);
    }).finally(() => setLoading(false));
  }, [bookingId, router]);

  async function handleCheckIn() {
    if (!userId) return;
    setCiSubmitting(true);
    setActionError(null);
    const res = await checkIn({ bookingId, userId, notes: ciNotes || null });
    if (res.succeeded && res.data) {
      setCheckIns((prev) => [...prev, res.data!]);
      setCiNotes("");
    } else {
      setActionError(res.error ?? "Check-in failed.");
    }
    setCiSubmitting(false);
  }

  async function handleCheckOut() {
    if (!userId) return;
    setCoSubmitting(true);
    setActionError(null);
    const res = await checkOut({ bookingId, userId, notes: coNotes || null, workSummary: coSummary || null });
    if (res.succeeded && res.data) {
      setCheckOuts((prev) => [...prev, res.data!]);
      setCoNotes(""); setCoSummary("");
    } else {
      setActionError(res.error ?? "Check-out failed.");
    }
    setCoSubmitting(false);
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setRSubmitting(true);
    setActionError(null);
    const res = await createPostJobReport({
      bookingId,
      compiledByUserId: userId,
      summary: rSummary,
      issuesFound: rIssues || null,
      recommendations: rRecs || null,
      overallRating: rRating,
      photos: [],
      checklistResults: checklist,
    });
    if (res.succeeded && res.data) {
      setReport(res.data);
      setShowReportForm(false);
    } else {
      setActionError(res.error ?? "Failed to submit report.");
    }
    setRSubmitting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (!booking) return (
    <div className="max-w-3xl mx-auto p-6 text-center text-gray-500">Booking not found.</div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">← Back</button>

      {/* Booking summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">{booking.serviceName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{booking.addressSummary}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>🗓 {fmt(booking.scheduledStart)}</span>
          <span className={`font-medium ${
            booking.status === "Completed" ? "text-green-600" :
            booking.status === "InProgress" ? "text-blue-600" : "text-gray-600"
          }`}>{booking.status}</span>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{actionError}</div>
      )}

      {/* Check-In panel */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
          <h2 className="font-semibold text-green-800 text-sm">Check-Ins ({checkIns.length})</h2>
        </div>
        <div className="p-5 space-y-3">
          {checkIns.length === 0 && <p className="text-xs text-gray-400">No check-ins recorded yet.</p>}
          {checkIns.map((ci) => (
            <div key={ci.id} className="flex items-start gap-3 text-sm">
              <span className="text-green-500 mt-0.5">✓</span>
              <div>
                <p className="font-medium text-gray-800">{ci.userName}</p>
                <p className="text-gray-500">{fmt(ci.checkInTime)}{ci.notes && ` — ${ci.notes}`}</p>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <textarea rows={2} placeholder="Optional notes..." value={ciNotes} onChange={(e) => setCiNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <button onClick={handleCheckIn} disabled={ciSubmitting}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
              {ciSubmitting ? "Recording…" : "Record Check-In"}
            </button>
          </div>
        </div>
      </section>

      {/* Check-Out panel */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
          <h2 className="font-semibold text-orange-800 text-sm">Check-Outs ({checkOuts.length})</h2>
        </div>
        <div className="p-5 space-y-3">
          {checkOuts.length === 0 && <p className="text-xs text-gray-400">No check-outs recorded yet.</p>}
          {checkOuts.map((co) => (
            <div key={co.id} className="flex items-start gap-3 text-sm">
              <span className="text-orange-500 mt-0.5">⏎</span>
              <div>
                <p className="font-medium text-gray-800">{co.userName}</p>
                <p className="text-gray-500">{fmt(co.checkOutTime)}{co.notes && ` — ${co.notes}`}</p>
                {co.workSummary && <p className="text-gray-600 mt-0.5 italic">{co.workSummary}</p>}
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <input placeholder="Work summary…" value={coSummary} onChange={(e) => setCoSummary(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <textarea rows={2} placeholder="Optional notes..." value={coNotes} onChange={(e) => setCoNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <button onClick={handleCheckOut} disabled={coSubmitting}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition">
              {coSubmitting ? "Recording…" : "Record Check-Out"}
            </button>
          </div>
        </div>
      </section>

      {/* Post-Job Report */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <h2 className="font-semibold text-blue-800 text-sm">Post-Job Report</h2>
          {!report && (
            <button onClick={() => setShowReportForm(!showReportForm)}
              className="text-xs text-blue-600 font-medium hover:underline">
              {showReportForm ? "Cancel" : "Compile Report"}
            </button>
          )}
        </div>
        <div className="p-5">
          {report ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Compiled by:</span>
                <span className="text-gray-600">{report.compiledByName} · {fmt(report.compiledAt)}</span>
              </div>
              {report.overallRating && (
                <div className="flex items-center gap-1 text-yellow-500 font-medium text-base">
                  {"★".repeat(report.overallRating)}{"☆".repeat(5 - report.overallRating)}
                  <span className="text-gray-600 font-normal text-sm ml-1">{report.overallRating}/5</span>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Summary</p>
                <p className="text-gray-800">{report.summary}</p>
              </div>
              {report.issuesFound && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Issues Found</p>
                  <p className="text-gray-700">{report.issuesFound}</p>
                </div>
              )}
              {report.recommendations && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Recommendations</p>
                  <p className="text-gray-700">{report.recommendations}</p>
                </div>
              )}
              {report.checklistResults.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Checklist</p>
                  <ul className="space-y-1">
                    {report.checklistResults.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className={item.completed ? "text-green-500" : "text-red-400"}>
                          {item.completed ? "✓" : "✗"}
                        </span>
                        <span className={item.completed ? "text-gray-700" : "text-gray-400 line-through"}>{item.taskName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : showReportForm ? (
            <form onSubmit={handleReport} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Summary *</label>
                <textarea required rows={3} value={rSummary} onChange={(e) => setRSummary(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Describe the overall job outcome..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Issues Found</label>
                <textarea rows={2} value={rIssues} onChange={(e) => setRIssues(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Any issues encountered..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recommendations</label>
                <textarea rows={2} value={rRecs} onChange={(e) => setRRecs(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Suggestions for next visit..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Overall Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRRating(n)}
                      className={`text-xl transition ${n <= rRating ? "text-yellow-400" : "text-gray-300"}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Checklist</label>
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={item.completed}
                        onChange={(e) => setChecklist((prev) => prev.map((c, idx) => idx === i ? { ...c, completed: e.target.checked } : c))}
                        className="rounded border-gray-300 text-blue-600" />
                      <span className="text-gray-700">{item.taskName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={rSubmitting}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                  {rSubmitting ? "Submitting…" : "Submit Report"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-gray-400">No report compiled yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
