import type { Address } from "@/lib/types";

export default function AddressCard({ address }: { address: Address }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{address.label}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{address.streetAddress}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{address.suburb}, {address.city}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{address.province} {address.postalCode}</p>
      {address.accessInstructions && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{address.accessInstructions}</p>}
    </div>
  );
}
