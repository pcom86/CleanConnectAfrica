export default function CategoryBadge({ category }: { category: string }) {
  const label =
    category === "CarWash" ? "Car Wash"
    : category === "PestControl" ? "Pest Control"
    : category;
  const cls =
    category === "Cleaning"
      ? "bg-green-100 text-green-700"
      : category === "Laundry"
      ? "bg-blue-100 text-blue-700"
      : category === "CarWash"
      ? "bg-purple-100 text-purple-700"
      : category === "PestControl"
      ? "bg-orange-100 text-orange-700"
      : category === "Garden"
      ? "bg-emerald-100 text-emerald-700"
      : category === "Landscaping"
      ? "bg-teal-100 text-teal-700"
      : "bg-gray-100 text-gray-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}
