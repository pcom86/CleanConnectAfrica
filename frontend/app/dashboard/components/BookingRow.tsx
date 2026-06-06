import type { Booking } from "@/lib/types";

const statusClasses: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
  PendingPayment: "bg-yellow-100 text-yellow-700",
};

export default function BookingRow({ booking }: { booking: Booking }) {
  const isPayOnsite = booking.payOnsite && (booking.status === "Confirmed" || booking.status === "PendingPayment");
  const displayStatus = isPayOnsite ? "Pay Onsite" : booking.status;
  const cls = statusClasses[booking.status] ?? "bg-gray-100 text-gray-600";
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{booking.serviceName}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{displayStatus}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{booking.addressSummary}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(booking.scheduledStart).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-brand-green">R{booking.price.toFixed(2)}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{booking.currency}</p>
      </div>
    </div>
  );
}
