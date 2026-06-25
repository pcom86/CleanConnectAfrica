"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";
import { Star, Pencil } from "lucide-react";

const statusClasses: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
  PendingPayment: "bg-yellow-100 text-yellow-700",
};

interface BookingRowProps {
  booking: Booking;
  customerProfileId?: string;
  onRate?: (bookingId: string, rating: number, comment: string) => void;
  onEdit?: (booking: Booking) => void;
}

function formatServiceNames(booking: Booking) {
  if (booking.services && booking.services.length > 1) {
    return booking.services.map((s) => s.serviceName).join(" + ");
  }
  return booking.serviceName;
}

export default function BookingRow({ booking, customerProfileId, onRate, onEdit }: BookingRowProps) {
  const isPayOnsite = booking.payOnsite && (booking.status === "Confirmed" || booking.status === "PendingPayment");
  const displayStatus = isPayOnsite ? "Pay Onsite" : booking.status;
  const cls = statusClasses[booking.status] ?? "bg-gray-100 text-gray-600";
  const isCompleted = booking.status === "Completed";
  const hasReview = booking.review != null;
  const serviceNames = formatServiceNames(booking);
  const [showRateForm, setShowRateForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!onRate || !customerProfileId) return;
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    await onRate(booking.id, rating, comment);
    setSubmitting(false);
    setShowRateForm(false);
  }

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{serviceNames}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{displayStatus}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{booking.addressSummary}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(booking.scheduledStart).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-brand-green">R{booking.price.toFixed(2)}</p>
            {onEdit && (booking.status === "Draft" || booking.status === "PendingPayment" || booking.status === "Confirmed") && (
              <button
                type="button"
                onClick={() => onEdit(booking)}
                title="Edit booking"
                className="p-1 text-gray-400 hover:text-brand-green transition-colors rounded"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {isCompleted && hasReview && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < booking.review!.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                />
              ))}
            </div>
          )}
          {isCompleted && !hasReview && customerProfileId && onRate && (
            <button
              onClick={() => setShowRateForm(true)}
              className="text-xs text-brand-green font-medium hover:underline"
            >
              Rate
            </button>
          )}
        </div>
      </div>

      {showRateForm && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Rate this service</p>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const starValue = i + 1;
              const filled = starValue <= (hoverRating || rating);
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(starValue)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${filled ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                  />
                </button>
              );
            })}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {rating > 0 ? `${rating}/5` : "Select a rating"}
            </span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green mb-2"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={rating < 1 || submitting}
              className="px-4 py-1.5 bg-brand-green text-white text-xs font-medium rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
            <button
              onClick={() => setShowRateForm(false)}
              className="px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {hasReview && booking.review!.comment && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{booking.review!.comment}"</p>
        </div>
      )}
    </div>
  );
}
