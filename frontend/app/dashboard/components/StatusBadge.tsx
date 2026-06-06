export default function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Approved" || status === "Completed" || status === "Confirmed"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : status === "UnderReview" || status === "PendingPayment" || status === "Pay Onsite"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : status === "Rejected" || status === "Cancelled"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : status === "Assigned"
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
      : status === "CleanerEnRoute"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : status === "InProgress"
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}
