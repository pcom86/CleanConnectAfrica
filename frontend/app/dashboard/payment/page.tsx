"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getSession } from "@/lib/auth";
import { createBookingPayment, confirmBookingPayment, getPayment } from "@/lib/api";
import type { Booking } from "@/lib/types";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");
  const status = searchParams.get("status");
  const simulated = searchParams.get("simulated");
  const reference = searchParams.get("reference");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("ZAR");
  const [isSimulated, setIsSimulated] = useState(false);
  const [mockProcessing, setMockProcessing] = useState(false);

  async function initPayment() {
    setLoading(true);
    setError(null);
    try {
      const session = getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      // Get booking from localStorage (stored during creation)
      const stored = localStorage.getItem("cc_pending_booking");
      let bookingData: Booking | null = null;
      if (stored) {
        try { bookingData = JSON.parse(stored); } catch { /* ignore */ }
      }

      if (!bookingData || bookingData.id !== bookingId) {
        setError("Booking details not found. Please check your bookings.");
        setLoading(false);
        return;
      }

      setBooking(bookingData);
      setAmount(bookingData.price ?? 0);
      setCurrency(bookingData.currency ?? "ZAR");

      const cpId = session?.customerProfile?.id;
      if (!cpId) {
        setError("Customer profile not found. Please log in again.");
        setLoading(false);
        return;
      }

      const result = await createBookingPayment(bookingId!, cpId);
      if (result.succeeded && result.data) {
        setPaymentUrl(result.data.paymentUrl);
        setPaymentId(result.data.paymentId);
        setIsSimulated(result.data.paymentUrl.includes("simulated=true"));
        localStorage.setItem("cc_pending_payment_id", result.data.paymentId);
      } else {
        setError(result.error ?? "Failed to initialize payment.");
      }
    } catch (err) {
      const isNetworkError = err instanceof TypeError || (err && typeof err === "object" && "message" in err && String((err as Error).message).includes("fetch"));
      if (isNetworkError) {
        setError("Unable to reach the payment server. Please make sure the API is running, or use Mock Payment below.");
      } else {
        setError("Unable to reach the payment server.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    // Handle Ozow return callbacks
    if (status && bookingId) {
      handleCallback();
      return;
    }

    // Normal flow: load booking details and generate payment
    if (!bookingId) {
      setError("No booking specified.");
      setLoading(false);
      return;
    }

    initPayment();

    async function handleCallback() {
      setLoading(true);
      try {
        const storedPaymentId = localStorage.getItem("cc_pending_payment_id");
        if (!storedPaymentId) {
          setError("Payment session expired.");
          setLoading(false);
          return;
        }

        if (status === "success" || status === "cancel") {
          // Check current payment status from backend
          const paymentResult = await getPayment(storedPaymentId);
          if (paymentResult.succeeded && paymentResult.data) {
            if (paymentResult.data.status === "Paid") {
              localStorage.removeItem("cc_pending_booking");
              localStorage.removeItem("cc_pending_payment_id");
              router.replace("/dashboard?payment=success");
              return;
            }
          }
        }

        // If simulated payment or success, confirm the payment
        if ((status === "success" || simulated === "true") && storedPaymentId) {
          const confirmResult = await confirmBookingPayment(
            storedPaymentId,
            "Ozow",
            reference ?? `OZOW-${bookingId ?? "unknown"}`,
            "Complete"
          );
          if (confirmResult.succeeded) {
            localStorage.removeItem("cc_pending_booking");
            localStorage.removeItem("cc_pending_payment_id");
            router.replace("/dashboard?payment=success");
            return;
          }
        }

        if (status === "cancel") {
          setError("Payment was cancelled. You can try again from your dashboard.");
          setLoading(false);
          return;
        }

        if (status === "error") {
          setError("An error occurred during payment. Please try again.");
          setLoading(false);
          return;
        }
      } catch {
        setError("Unable to verify payment status.");
      } finally {
        setLoading(false);
      }
    }
  }, [bookingId, status, simulated, reference, router]);

  function handlePayWithOzow() {
    if (paymentUrl) {
      if (paymentId) {
        localStorage.setItem("cc_pending_payment_id", paymentId);
      }
      window.location.href = paymentUrl;
    }
  }

  async function handleMockPayment(outcome: "success" | "failure") {
    if (!paymentId) {
      setError("Payment session not initialized. Please refresh the page.");
      return;
    }
    setMockProcessing(true);
    try {
      const gatewayRef = reference ?? `MOCK-${bookingId ?? "unknown"}`;
      const status = outcome === "success" ? "Complete" : "Failed";
      const confirmResult = await confirmBookingPayment(paymentId, "Ozow", gatewayRef, status);
      if (confirmResult.succeeded) {
        localStorage.removeItem("cc_pending_booking");
        localStorage.removeItem("cc_pending_payment_id");
        router.replace(`/dashboard?payment=${outcome}`);
      } else {
        setError(confirmResult.error ?? "Mock payment confirmation failed.");
      }
    } catch {
      setError("Unable to confirm mock payment.");
    } finally {
      setMockProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Complete Your Payment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Secure instant EFT via Ozow</p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{status ? "Verifying payment…" : "Preparing your payment…"}</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-xl">!</span>
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Payment Error</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error}</p>
            <div className="space-y-3">
                <button
                  onClick={() => { setError(null); setLoading(true); initPayment(); }}
                  className="w-full py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors"
                >
                  Retry Payment
                </button>
                <button
                  onClick={async () => {
                    setError(null);
                    setLoading(true);
                    try {
                      const session = getSession();
                      const cpId = session?.customerProfile?.id;
                      if (!cpId) { setError("Customer profile not found."); setLoading(false); return; }
                      const createRes = await createBookingPayment(bookingId!, cpId);
                      if (!createRes.succeeded || !createRes.data) { setError(createRes.error ?? "Failed to create payment."); setLoading(false); return; }
                      const pid = createRes.data.paymentId;
                      const confirmRes = await confirmBookingPayment(pid, "Ozow", `MOCK-${bookingId}`, "Complete");
                      if (confirmRes.succeeded) {
                        localStorage.removeItem("cc_pending_booking");
                        localStorage.removeItem("cc_pending_payment_id");
                        router.replace("/dashboard?payment=success");
                      } else {
                        setError(confirmRes.error ?? "Mock payment confirmation failed.");
                        setLoading(false);
                      }
                    } catch {
                      setError("API is unreachable. Start the backend to use mock payment.");
                      setLoading(false);
                    }
                  }}
                  className="w-full py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-medium rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  Mock Payment Success (Dev Mode)
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            {booking && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Booking Summary</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{booking.serviceName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{booking.addressSummary}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {new Date(booking.scheduledStart).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long" })}
                  {" at "}
                  {new Date(booking.scheduledStart).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}

            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {currency} {amount.toFixed(2)}
              </p>
            </div>

            {isSimulated ? (
              <>
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Mock Payment Mode</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Ozow credentials are not configured. No real transaction will occur.</p>
                </div>
                <button
                  onClick={() => handleMockPayment("success")}
                  disabled={mockProcessing}
                  className="w-full py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {mockProcessing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Simulate Payment Success
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleMockPayment("failure")}
                  disabled={mockProcessing}
                  className="w-full mt-3 py-2.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  Simulate Payment Failure
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePayWithOzow}
                  disabled={!paymentUrl}
                  className="w-full py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay with Ozow (Instant EFT)
                </button>
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                  You will be redirected to Ozow to complete your payment securely.
                </p>
              </>
            )}

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full mt-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Pay Later — Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full"></div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
