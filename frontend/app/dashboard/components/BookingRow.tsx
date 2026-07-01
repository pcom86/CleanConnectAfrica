"use client";

import { useState } from "react";
import type { Booking, Assignment, CleaningJobDetail } from "@/lib/types";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  Car,
  Phone,
  User,
  Pencil,
  Star,
  ClipboardList,
  CheckCircle2,
  Truck,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; border: string; badge: string; dot: string }> = {
  Confirmed: {
    label: "Confirmed",
    border: "border-l-green-500",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dot: "bg-green-500",
  },
  PendingPayment: {
    label: "Pending Payment",
    border: "border-l-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  CleanerEnRoute: {
    label: "Dispatched",
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Assigned: {
    label: "Assigned",
    border: "border-l-indigo-500",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  InProgress: {
    label: "On Site",
    border: "border-l-purple-500",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  Completed: {
    label: "Completed",
    border: "border-l-gray-400",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-400",
  },
  Cancelled: {
    label: "Cancelled",
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  Draft: {
    label: "Draft",
    border: "border-l-gray-300",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-300",
  },
};

function getStatusConfig(status: string, payOnsite: boolean) {
  if (payOnsite && (status === "Confirmed" || status === "PendingPayment")) {
    return {
      label: "Pay Onsite",
      border: "border-l-blue-500",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      dot: "bg-blue-500",
    };
  }
  return STATUS_CONFIG[status] ?? {
    label: status,
    border: "border-l-gray-300",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-300",
  };
}

function formatServiceNames(booking: Booking) {
  if (booking.services && booking.services.length > 1) {
    return booking.services.map((s) => s.serviceName).join(" + ");
  }
  return booking.serviceName;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
  };
}

interface BookingRowProps {
  booking: Booking;
  customerProfileId?: string;
  onRate?: (bookingId: string, rating: number, comment: string) => void;
  onEdit?: (booking: Booking) => void;
}

export default function BookingRow({ booking, customerProfileId, onRate, onEdit }: BookingRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPayOnsite = booking.payOnsite && (booking.status === "Confirmed" || booking.status === "PendingPayment");
  const status = getStatusConfig(booking.status, booking.payOnsite);
  const isCompleted = booking.status === "Completed";
  const hasReview = booking.review != null;
  const isDispatched = booking.status === "CleanerEnRoute" || booking.status === "InProgress" || booking.status === "Completed";
  const serviceNames = formatServiceNames(booking);
  const start = formatDateTime(booking.scheduledStart);
  const end = formatDateTime(booking.scheduledEnd);

  const assignment: Assignment | undefined = booking.assignments?.[0];
  const jobDetail: CleaningJobDetail | null | undefined = booking.jobDetail;

  async function handleSubmit() {
    if (!onRate || !customerProfileId) return;
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    await onRate(booking.id, rating, comment);
    setSubmitting(false);
    setShowRateForm(false);
  }

  const canEdit = onEdit && (booking.status === "Draft" || booking.status === "PendingPayment" || booking.status === "Confirmed");

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden transition-all duration-200 hover:shadow-md ${status.border} border-l-4`}
    >
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 group"
      >
        {/* Service icon / category */}
        <div className="hidden sm:flex h-11 w-11 rounded-xl bg-brand-green/10 items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-brand-green" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{serviceNames}</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {booking.isRecurring && booking.recurrenceFrequency && (
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
                {booking.recurrenceFrequency}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{start.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{start.time} – {end.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{booking.addressLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-brand-green">R{booking.price.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{booking.currency}</p>
          </div>
          <div className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-gray-100 dark:border-gray-800">
          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <DetailItem icon={<MapPin className="w-4 h-4" />} label="Address" value={booking.addressSummary} />
            <DetailItem icon={<Calendar className="w-4 h-4" />} label="Schedule" value={`${start.date} · ${start.time} – ${end.time}`} />
            <DetailItem icon={<CreditCard className="w-4 h-4" />} label="Payment" value={`${booking.paymentStatus} · R${booking.price.toFixed(2)}`} />
            <DetailItem icon={<User className="w-4 h-4" />} label="Service" value={booking.serviceCategory} />
            {jobDetail?.specialInstructions && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">Special Instructions</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">{jobDetail.specialInstructions}</p>
              </div>
            )}
            {jobDetail?.hasPets && (
              <DetailItem icon={<ClipboardList className="w-4 h-4" />} label="Pets" value="Yes – please prepare accordingly" />
            )}
          </div>

          {/* Dispatched Team & Vehicle */}
          {isDispatched && assignment && (
            <div className="mt-5 space-y-4">
              {/* Vehicle */}
              {jobDetail?.vehicleRegistration && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    {jobDetail.vehicleType?.toLowerCase() === "van" || jobDetail.vehicleType?.toLowerCase() === "truck" ? (
                      <Truck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    ) : (
                      <Car className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{jobDetail.vehicleRegistration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {jobDetail.vehicleType ?? "Vehicle"} {
                        booking.status === "CleanerEnRoute" ? "on the way" :
                        booking.status === "InProgress" ? "on site" :
                        "job completed"
                      }
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      booking.status === "CleanerEnRoute"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        : booking.status === "InProgress"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        booking.status === "CleanerEnRoute" ? "bg-amber-500 animate-pulse" :
                        booking.status === "InProgress" ? "bg-purple-500" :
                        "bg-green-500"
                      }`} />
                      {booking.status === "CleanerEnRoute" ? "En Route" : booking.status === "InProgress" ? "On Site" : "Completed"}
                    </span>
                  </div>
                </div>
              )}

              {/* Supervisor — Contact Person */}
              {assignment.supervisorName && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Your Contact Person</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {assignment.supervisorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{assignment.supervisorName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Supervisor</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              {assignment.teamMembers && assignment.teamMembers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Team Members</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assignment.teamMembers.map((member) => (
                      <div
                        key={member.profileId}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      >
                        {member.profilePictureUrl ? (
                          <img
                            src={member.profilePictureUrl}
                            alt={member.name}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-brand-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.employmentType} · {member.skills}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider */}
              {assignment.providerName && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                  <span>Assigned by <span className="font-medium text-gray-700 dark:text-gray-300">{assignment.providerName}</span></span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            {canEdit && (
              <button
                onClick={() => onEdit?.(booking)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Booking
              </button>
            )}
            {isCompleted && hasReview && (
              <div className="flex items-center gap-0.5 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < booking.review!.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                  />
                ))}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Your review</span>
              </div>
            )}
            {isCompleted && !hasReview && customerProfileId && onRate && !showRateForm && (
              <button
                onClick={() => setShowRateForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-green bg-brand-green-light dark:bg-green-900/20 hover:bg-brand-green/20 rounded-lg transition-colors"
              >
                <Star className="w-3.5 h-3.5" />
                Rate Service
              </button>
            )}
          </div>

          {/* Rate Form */}
          {showRateForm && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rate this service</p>
              <div className="flex items-center gap-1 mb-3">
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
                        className={`w-6 h-6 transition-colors ${filled ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green mb-3"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={rating < 1 || submitting}
                  className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
                <button
                  onClick={() => setShowRateForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Review comment */}
          {hasReview && booking.review!.comment && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">&ldquo;{booking.review!.comment}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
