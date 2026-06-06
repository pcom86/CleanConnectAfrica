"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getMyBusinessProfile, updateMyBusinessProfile } from "@/lib/api";
import type { ServiceCategory, BusinessProfile } from "@/lib/types";
import ThemeToggle from "@/app/components/ThemeToggle";

const SERVICE_OPTIONS: { value: ServiceCategory; label: string; icon: string }[] = [
  { value: "Cleaning", label: "Cleaning", icon: "🧹" },
  { value: "Laundry", label: "Laundry", icon: "👕" },
  { value: "CarWash", label: "Car Wash", icon: "🚗" },
  { value: "PestControl", label: "Pest Control", icon: "🐛" },
];

export default function BusinessProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    registrationNumber: "",
    taxNumber: "",
    serviceCategories: [] as ServiceCategory[],
    baseLocation: "",
    streetAddress: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    serviceAreas: [] as string[],
    serviceRadiusKm: "25",
    latitude: "",
    longitude: "",
  });
  const [serviceAreaInput, setServiceAreaInput] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    loadProfile(session.id);
  }, [router]);

  async function loadProfile(userId: string) {
    setLoading(true);
    try {
      const res = await getMyBusinessProfile(userId);
      if (res.succeeded && res.data) {
        const p = res.data;
        setProfile(p);
        setForm({
          companyName: p.companyName,
          registrationNumber: p.registrationNumber,
          taxNumber: p.taxNumber ?? "",
          serviceCategories: p.serviceCategories as ServiceCategory[],
          baseLocation: p.baseLocation ?? "",
          streetAddress: p.streetAddress ?? "",
          suburb: p.suburb ?? "",
          city: p.city ?? "",
          province: p.province ?? "",
          postalCode: p.postalCode ?? "",
          serviceAreas: p.serviceAreas ?? [],
          serviceRadiusKm: String(p.serviceRadiusKm ?? 25),
          latitude: p.latitude != null ? String(p.latitude) : "",
          longitude: p.longitude != null ? String(p.longitude) : "",
        });
        localStorage.setItem("cc_business_profile", JSON.stringify(p));
      } else {
        setError(res.error ?? "Failed to load business profile.");
      }
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function toggleService(cat: ServiceCategory) {
    setForm((prev) => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(cat)
        ? prev.serviceCategories.filter((c) => c !== cat)
        : [...prev.serviceCategories, cat],
    }));
  }

  function addServiceArea() {
    const trimmed = serviceAreaInput.trim();
    if (trimmed && !form.serviceAreas.includes(trimmed)) {
      setForm((prev) => ({ ...prev, serviceAreas: [...prev.serviceAreas, trimmed] }));
    }
    setServiceAreaInput("");
  }

  function handleAreaKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addServiceArea();
    }
  }

  function removeArea(area: string) {
    setForm((prev) => ({ ...prev, serviceAreas: prev.serviceAreas.filter((a) => a !== area) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(null);

    if (!form.companyName.trim() || !form.registrationNumber.trim()) {
      setError("Company name and registration number are required.");
      return;
    }
    if (form.serviceCategories.length === 0) {
      setError("Select at least one service category.");
      return;
    }
    if (!form.baseLocation.trim()) {
      setError("Base location is required.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateMyBusinessProfile(profile.id, {
        companyName: form.companyName.trim(),
        registrationNumber: form.registrationNumber.trim(),
        taxNumber: form.taxNumber.trim() || null,
        serviceCategories: form.serviceCategories,
        baseLocation: form.baseLocation.trim(),
        streetAddress: form.streetAddress.trim() || null,
        suburb: form.suburb.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        postalCode: form.postalCode.trim() || null,
        serviceAreas: form.serviceAreas,
        serviceRadiusKm: parseFloat(form.serviceRadiusKm) || 25,
        latitude: form.latitude.trim() ? parseFloat(form.latitude) : null,
        longitude: form.longitude.trim() ? parseFloat(form.longitude) : null,
        joiningFeeAmount: profile.joiningFeeAmount,
        commissionRate: profile.commissionRate,
        isEligibleForBookings: profile.isEligibleForBookings,
      });
      if (result.succeeded && result.data) {
        setProfile(result.data);
        localStorage.setItem("cc_business_profile", JSON.stringify(result.data));
        setSuccess("Business profile updated successfully.");
      } else {
        setError(result.error ?? "Failed to update profile.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-gray-100">CleanConnect Africa</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Business Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Update your company details.</p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.registrationNumber}
                onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Number <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.taxNumber}
                onChange={(e) => setForm((p) => ({ ...p, taxNumber: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Services Offered <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {SERVICE_OPTIONS.map((svc) => {
                  const selected = form.serviceCategories.includes(svc.value);
                  return (
                    <button
                      key={svc.value}
                      type="button"
                      onClick={() => toggleService(svc.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? "border-brand-green bg-green-50 dark:bg-green-900/30"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <span className="text-3xl">{svc.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{svc.label}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? "border-brand-green bg-brand-green" : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {selected && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.baseLocation}
                onChange={(e) => setForm((p) => ({ ...p, baseLocation: e.target.value }))}
                placeholder="e.g. Cape Town, Western Cape"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.streetAddress}
                  onChange={(e) => setForm((p) => ({ ...p, streetAddress: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suburb</label>
                <input
                  type="text"
                  value={form.suburb}
                  onChange={(e) => setForm((p) => ({ ...p, suburb: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select province</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="North West">North West</option>
                  <option value="Western Cape">Western Cape</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                <input
                  type="text"
                  value={form.latitude}
                  onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  placeholder="e.g. -33.9249"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                <input
                  type="text"
                  value={form.longitude}
                  onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  placeholder="e.g. 18.4241"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Radius (km)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={form.serviceRadiusKm}
                  onChange={(e) => setForm((p) => ({ ...p, serviceRadiusKm: e.target.value }))}
                  className="flex-1 accent-brand-green"
                />
                <span className="w-16 text-center font-semibold text-brand-green bg-green-50 dark:bg-green-900/30 rounded-lg py-1">
                  {form.serviceRadiusKm} km
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Areas <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Type a suburb or area name and press Enter or "Add".
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serviceAreaInput}
                  onChange={(e) => setServiceAreaInput(e.target.value)}
                  onKeyDown={handleAreaKeyDown}
                  placeholder="e.g. Claremont"
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={addServiceArea}
                  className="px-4 py-2.5 bg-brand-green text-white font-medium rounded-xl hover:bg-brand-green-dark transition-colors"
                >
                  Add
                </button>
              </div>
              {form.serviceAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-green-light text-brand-green font-medium text-sm rounded-full"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeArea(area)}
                        className="text-brand-green hover:text-brand-green-dark font-bold leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Link
                href="/dashboard"
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
