"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession } from "@/lib/auth";
import type { User, BusinessProfile } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
    } else {
      setUser(session);
      if (session.role === "ProviderOwner") {
        const raw = localStorage.getItem("cc_business_profile");
        if (raw) {
          try { setBusinessProfile(JSON.parse(raw) as BusinessProfile); } catch { /* noop */ }
        }
      }
    }
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    Customer: "Customer",
    BusinessCustomer: "Business Customer",
    Cleaner: "Cleaner",
    ProviderOwner: "Business Owner",
    Admin: "Administrator",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="font-bold text-xl text-gray-900">CleanConnect Africa</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            {user.firstName} {user.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.firstName}! 
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your account overview.</p>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-brand-green-light px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">
                {user.firstName} {user.lastName}
              </h2>
              <span className="inline-block mt-1 px-2 py-0.5 bg-brand-green text-white text-xs font-medium rounded-full">
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>
          </div>

          <div className="px-6 py-5 grid sm:grid-cols-2 gap-4">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phoneNumber} />
            <InfoRow label="Status" value={user.status} />
            <InfoRow label="User ID" value={user.id.slice(0, 8) + "…"} />
          </div>
        </div>

        {/* Customer profile */}
        {user.customerProfile && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🏠</span> Customer Profile
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow label="Customer type" value={user.customerProfile.customerType} />
              {user.customerProfile.companyName && (
                <InfoRow label="Company" value={user.customerProfile.companyName} />
              )}
              {user.customerProfile.billingAddress && (
                <InfoRow label="Billing address" value={user.customerProfile.billingAddress} />
              )}
            </div>
          </div>
        )}

        {/* Cleaner profile */}
        {user.cleanerProfile && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🧹</span> Cleaner Profile
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow label="Employment type" value={user.cleanerProfile.employmentType} />
              <InfoRow label="Rating" value={`${user.cleanerProfile.rating}/5`} />
              <InfoRow label="Skills" value={user.cleanerProfile.skills} />
              <InfoRow label="Service zones" value={user.cleanerProfile.serviceZones} />
            </div>
          </div>
        )}

        {/* Business Owner section */}
        {user.role === "ProviderOwner" && !businessProfile && (
          <div className="bg-brand-green-light border-2 border-brand-green rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🏢</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">Set Up Your Business Profile</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Add your company details, services and coverage areas so customers can find you.
                </p>
                <Link
                  href="/setup-business"
                  className="inline-block mt-4 px-6 py-2.5 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
                >
                  Set up now →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Business profile card */}
        {businessProfile && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-lg">🏢</span> Business Profile
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                businessProfile.status === "Approved"
                  ? "bg-green-100 text-green-700"
                  : businessProfile.status === "UnderReview"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {businessProfile.status}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow label="Company" value={businessProfile.companyName} />
              <InfoRow label="Reg. Number" value={businessProfile.registrationNumber} />
              {businessProfile.baseLocation && (
                <InfoRow label="Base Location" value={businessProfile.baseLocation} />
              )}
              <InfoRow label="Service Radius" value={`${businessProfile.serviceRadiusKm} km`} />
            </div>
            {businessProfile.serviceCategories.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Services</p>
                <div className="flex flex-wrap gap-2">
                  {businessProfile.serviceCategories.map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-brand-green-light text-brand-green text-sm font-medium rounded-full">
                      {cat === "CarWash" ? "Car Wash" : cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {businessProfile.serviceAreas.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Service Areas</p>
                <div className="flex flex-wrap gap-2">
                  {businessProfile.serviceAreas.map((area) => (
                    <span key={area} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{area}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href="/setup-business"
                className="text-sm text-brand-green font-medium hover:underline"
              >
                Update business profile →
              </Link>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick actions</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: "🧹", label: "Book Cleaning", href: "#" },
              { icon: "👕", label: "Book Laundry", href: "#" },
              { icon: "🚗", label: "Book Car Wash", href: "#" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors text-center"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
