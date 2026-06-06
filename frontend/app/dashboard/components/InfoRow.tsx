export default function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 dark:text-gray-200 mt-0.5">{value}</p>
    </div>
  );
}
