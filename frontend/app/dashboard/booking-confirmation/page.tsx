"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import type { Booking } from "@/lib/types";
import ThemeToggle from "@/app/components/ThemeToggle";
import Logo from "@/app/components/Logo";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    if (!bookingId) {
      setError("No booking specified.");
      setLoading(false);
      return;
    }

    // Load booking from localStorage (stored during creation)
    const stored = localStorage.getItem("cc_pending_booking");
    let bookingData: Booking | null = null;
    if (stored) {
      try { bookingData = JSON.parse(stored); } catch { /* ignore */ }
    }

    if (!bookingData || bookingData.id !== bookingId) {
      setError("Booking details not found. Please check your bookings in the dashboard.");
      setLoading(false);
      return;
    }

    setBooking(bookingData);
    setLoading(false);
  }, [bookingId, router]);

  function handleProceedToPayment() {
    router.push(`/dashboard/payment?bookingId=${bookingId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading booking…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-xl">!</span>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block w-full py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Booking Confirmed</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Step 1 of 2 — Your booking has been created successfully.</p>
        </div>

        {booking && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Booking Summary</p>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Service</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{booking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Category</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{booking.serviceCategory === "CarWash" ? "Car Wash" : booking.serviceCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Address</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right max-w-[60%]">{booking.addressSummary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Date & Time</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {new Date(booking.scheduledStart).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long" })}
                  {" at "}
                  {new Date(booking.scheduledStart).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Amount</span>
                <span className="text-xl font-bold text-brand-green">{booking.currency} {booking.price?.toFixed(2) ?? "0.00"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Step 2: Complete Payment</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">
            Proceed to payment to confirm your booking. Your slot is held for 15 minutes.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleProceedToPayment}
            className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Proceed to Payment
          </button>

          <Link
            href="/dashboard?onsite=1"
            className="block w-full py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-semibold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-center"
          >
            Pay Onsite — Cash or Card to Cleaner
          </Link>

          <Link
            href="/dashboard"
            className="block w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            Pay Later — Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full"></div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
