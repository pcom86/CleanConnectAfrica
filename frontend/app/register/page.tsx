"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type { CustomerType, UserRole } from "@/lib/types";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  customerType: CustomerType;
  idNumber: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
}

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: "Account" },
  { num: 2, label: "Address" },
  { num: 3, label: "ID Verify" },
  { num: 4, label: "Face Check" },
  { num: 5, label: "Review" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "Customer",
    customerType: "Residential",
    idNumber: "",
    streetAddress: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
  });
  const [idVerified, setIdVerified] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function goNext() {
    setError(null);
    if (step < 5) setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function validateStep1(): boolean {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return false;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("A valid email address is required.");
      return false;
    }
    if (!form.phoneNumber.trim()) {
      setError("Phone number is required.");
      return false;
    }
    if (!form.password || form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!form.streetAddress.trim() || !form.suburb.trim() || !form.city.trim() || !form.province.trim()) {
      setError("Street address, suburb, city, and province are required.");
      return false;
    }
    return true;
  }

  function handleMockIdVerify(pass: boolean) {
    setError(null);
    if (!form.idNumber || form.idNumber.length !== 13 || !/^\d{13}$/.test(form.idNumber)) {
      setError("Please enter a valid 13-digit South African ID number.");
      return;
    }
    if (pass) {
      setIdVerified(true);
      goNext();
    } else {
      setError("ID verification failed. Please check your ID number and try again. (Mock)");
      setIdVerified(false);
    }
  }

  useEffect(() => {
    if (step !== 4) {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      return;
    }
    setCapturedPhoto(null);
    setCameraError(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCameraError("Camera access denied. Please allow camera permissions and try again."));
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.85));
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  }

  function retakePhoto() {
    setCapturedPhoto(null);
    setCameraError(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCameraError("Could not restart camera."));
  }

  function confirmFace() {
    setLivenessVerified(true);
    goNext();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        passwordHash: form.password,
        role: form.role,
        status: "Active",
        idNumber: form.idNumber || null,
        customerProfile: form.role === "Customer" ? {
          customerType: form.customerType,
          address: {
            streetAddress: form.streetAddress.trim(),
            suburb: form.suburb.trim(),
            city: form.city.trim(),
            province: form.province.trim(),
            postalCode: form.postalCode.trim(),
            label: "Primary",
          }
        } : null,
      };

      const result = await registerUser(payload);
      if (result.succeeded && result.data) {
        saveSession(result.data);
        router.push(result.data.role === "ProviderOwner" ? "/setup-business" : "/dashboard");
      } else {
        setError(result.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Unable to reach the server. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((s) => {
          const active = s.num === step;
          const done = s.num < step;
          return (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-green text-white"
                    : done
                    ? "bg-brand-green-light text-brand-green"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  active ? "text-brand-green" : done ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {s.num !== 5 && <div className="w-6 h-px bg-gray-200" />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex justify-end px-6 py-4">
        <ThemeToggle />
      </header>
      <div className="flex-1 flex items-start justify-center px-4 pb-12 -mt-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <Logo size="md" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your account</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Join thousands of happy customers</p>
          </div>

          <StepIndicator />

          {/* Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1 — Account Details */}
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateStep1()) goNext();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={set("firstName")}
                    placeholder="Thabo"
                    className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={set("lastName")}
                    placeholder="Mokoena"
                    className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  required
                  value={form.phoneNumber}
                  onChange={set("phoneNumber")}
                  placeholder="+27 82 123 4567"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account type</label>
                <select
                  value={form.role}
                  onChange={set("role")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="Customer">Customer — Book services</option>
                  <option value="ProviderOwner">Business Owner — Offer services</option>
                </select>
              </div>

              {form.role === "Customer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer type</label>
                  <select
                    value={form.customerType}
                    onChange={set("customerType")}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="Residential">Residential — Home</option>
                    <option value="Hospitality">Hospitality — Hotel / B&amp;B</option>
                    <option value="Commercial">Commercial — Office / Business</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors mt-2"
              >
                Next: Address
              </button>
            </form>
          )}

          {/* Step 2 — Physical Address */}
          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateStep2()) goNext();
              }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Physical Address</h2>
                <p className="text-sm text-gray-500">Enter your address for service and billing.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={form.streetAddress}
                  onChange={set("streetAddress")}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
                  <input
                    type="text"
                    required
                    value={form.suburb}
                    onChange={set("suburb")}
                    placeholder="Sandton"
                    className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={set("city")}
                    placeholder="Johannesburg"
                    className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <select
                    required
                    value={form.province}
                    onChange={set("province")}
                    className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 bg-white"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={set("postalCode")}
                    placeholder="2196"
                    className="w-full px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors"
                >
                  Next: Verify ID
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — ID Number Verification */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">ID Number Verification</h2>
                <p className="text-sm text-gray-500">Enter your South African ID number for verification.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SA ID Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.idNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                    setForm((prev) => ({ ...prev, idNumber: val }));
                  }}
                  placeholder="8501011234087"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400 tracking-widest font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">13 digits, e.g. YYMMDD followed by sequence number</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Mock Verification</p>
                <p className="text-xs text-amber-700 mb-3">
                  This step will eventually call a real ID verification service. For now, use the buttons below to simulate the outcome.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleMockIdVerify(true)}
                    className="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Mock: Verify Pass
                  </button>
                  <button
                    onClick={() => handleMockIdVerify(false)}
                    className="flex-1 py-2.5 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors text-sm"
                  >
                    Mock: Verify Fail
                  </button>
                </div>
              </div>

              <button
                onClick={goBack}
                className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 4 — Face Verification */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Face Verification</h2>
                <p className="text-sm text-gray-500">Take a live selfie to confirm your identity. Ensure your face is clearly visible in good lighting.</p>
              </div>

              {cameraError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <p className="font-semibold mb-1">Camera unavailable</p>
                  <p>{cameraError}</p>
                </div>
              ) : capturedPhoto ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <img src={capturedPhoto} alt="Selfie" className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      Photo taken
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Does this look clear and well-lit?</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={retakePhoto} className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Retake</button>
                    <button type="button" onClick={confirmFace} className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors">Confirm →</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-48 border-2 border-white/60 rounded-full" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Position your face within the oval and ensure good lighting</p>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Selfie
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              <button
                type="button"
                onClick={goBack}
                className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 5 — Review & Submit */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Review your details</h2>
                <p className="text-sm text-gray-500 mb-4">Confirm everything looks correct before creating your account.</p>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-900">{form.firstName} {form.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{form.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-gray-900">{form.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account type</span>
                  <span className="font-medium text-gray-900">{form.role}</span>
                </div>
                {form.role === "Customer" && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer type</span>
                    <span className="font-medium text-gray-900">{form.customerType}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Address</span>
                  <span className="font-medium text-gray-900 text-right">{form.streetAddress}, {form.suburb}, {form.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Province / Code</span>
                  <span className="font-medium text-gray-900">{form.province} {form.postalCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID Number</span>
                  <span className="font-medium text-gray-900 font-mono">{form.idNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID Verified</span>
                  <span className="font-medium text-green-700">{idVerified ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Liveness Verified</span>
                  <span className="font-medium text-green-700">{livenessVerified ? "Yes" : "No"}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !idVerified || !livenessVerified}
                  className="flex-1 py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-green font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  </div>
  );
}
