"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBusinessProfile, verifyCompany, listMembershipPlans } from "@/lib/api";
import { getSession, clearSession } from "@/lib/auth";
import type { ServiceCategory, BusinessProfile, MembershipPlan } from "@/lib/types";
import Logo from "../components/Logo";

const SERVICE_OPTIONS: { value: ServiceCategory; label: string; icon: string; description: string }[] = [
  { value: "Cleaning", label: "Cleaning", icon: "🧹", description: "Home, office & commercial cleaning" },
  { value: "Laundry", label: "Laundry", icon: "👕", description: "Wash, dry & fold laundry services" },
  { value: "CarWash", label: "Car Wash", icon: "🚗", description: "Interior & exterior vehicle cleaning" },
  { value: "PestControl", label: "Pest Control", icon: "🐛", description: "Rodent, insect & termite treatment" },
];

export default function SetupBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>([]);

  const [baseLocation, setBaseLocation] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [serviceAreaInput, setServiceAreaInput] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [serviceRadiusKm, setServiceRadiusKm] = useState("25");

  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [createdProfile, setCreatedProfile] = useState<BusinessProfile | null>(null);
  const [paymentResult, setPaymentResult] = useState<"success" | "cancelled" | "failed" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const selectedPlan = membershipPlans.find((p) => p.id === selectedPlanId) ?? null;
  const joiningFee = selectedPlan?.joiningFeeAmount ?? 0;
  const commissionRate = selectedPlan?.defaultCommissionRate ?? 0.1;

  useEffect(() => {
    listMembershipPlans().then((res) => {
      if (res.succeeded && res.data) {
        setMembershipPlans(res.data);
        if (res.data.length > 0) {
          setSelectedPlanId(res.data[0].id);
        }
      }
    });
  }, []);

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
    setStep(5);
  }

  function toggleService(cat: ServiceCategory) {
    setSelectedServices((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function addServiceArea() {
    const trimmed = serviceAreaInput.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      setServiceAreas((prev) => [...prev, trimmed]);
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
    setServiceAreas((prev) => prev.filter((a) => a !== area));
  }

  function nextStep() {
    setError(null);
    if (step === 1) {
      if (!companyName.trim() || !registrationNumber.trim()) {
        setError("Company name and registration number are required.");
        return;
      }
      if (!selectedPlanId) {
        setError("Please select a membership plan.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedServices.length === 0) {
        setError("Select at least one service.");
        return;
      }
      setStep(3);
    }
  }

  async function submitProfile(verificationPassed: boolean, paymentCompleted: boolean) {
    const user = getSession();
    if (!user) {
      router.replace("/login");
      return null;
    }

    setLoading(true);
    try {
      const result = await createBusinessProfile({
        contactUserId: user.id,
        companyName,
        registrationNumber,
        taxNumber: taxNumber.trim() || null,
        serviceCategories: selectedServices,
        baseLocation,
        streetAddress: streetAddress.trim() || null,
        suburb: suburb.trim() || null,
        city: city.trim() || null,
        province: province.trim() || null,
        postalCode: postalCode.trim() || null,
        serviceAreas,
        serviceRadiusKm: parseFloat(serviceRadiusKm) || 25,
        joiningFeeAmount: joiningFee,
        commissionRate,
        membershipPlanId: selectedPlanId ?? undefined,
        verificationPassed,
        paymentCompleted,
      });

      if (result.succeeded && result.data) {
        localStorage.setItem("cc_business_profile", JSON.stringify(result.data));
        setCreatedProfile(result.data);
        return result.data;
      } else {
        if (result.error?.toLowerCase().includes("contact user was not found")) {
          clearSession();
          router.replace("/login?reason=session_expired");
        } else {
          setError(result.error ?? "Failed to save business profile.");
        }
        return null;
      }
    } catch {
      setError("Unable to reach the server. Is the API running?");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleLocationSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!baseLocation.trim()) {
      setError("Base location is required.");
      return;
    }
    if (!streetAddress.trim() || !suburb.trim() || !city.trim() || !province.trim()) {
      setError("Street address, suburb, city, and province are required.");
      return;
    }
    if (serviceAreas.length === 0) {
      setError("Add at least one service area.");
      return;
    }
    setStep(4);
  }

  async function runVerification() {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyCompany(registrationNumber);
      if (result.succeeded && result.data) {
        setVerificationResult(result.data);
        if (!result.data.isValid) {
          await submitProfile(false, false);
        }
      } else {
        setError(result.error ?? "Verification failed.");
      }
    } catch {
      setError("Unable to verify company. Server error.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment(paid: boolean) {
    setError(null);
    if (paid) {
      const profile = await submitProfile(true, true);
      if (profile) {
        setPaymentResult("success");
        setStep(7);
      }
    } else {
      const profile = await submitProfile(true, false);
      if (profile) {
        setPaymentResult("cancelled");
        setStep(7);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          Skip for now →
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Progress */}
        {step < 7 && (
          <div className="mb-8">
            <div className="flex items-center gap-1 mb-4 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className="flex items-center gap-1 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      s < step
                        ? "bg-brand-green text-white"
                        : s === step
                        ? "bg-brand-green text-white ring-4 ring-brand-green-light"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {s < step ? "✓" : s}
                  </div>
                  {s < 6 && (
                    <div className={`h-0.5 w-8 ${s < step ? "bg-brand-green" : "bg-gray-200 dark:bg-gray-700"}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Step {step} of 6 —{" "}
              {step === 1 ? "Business Details" : step === 2 ? "Services Offered" : step === 3 ? "Location & Coverage" : step === 4 ? "Face Verification" : step === 5 ? "Company Verification" : "Joining Fee Payment"}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1 — Business Details */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Business Details</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Tell us about your company.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Spotless Solutions (Pty) Ltd"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. 2023/123456/07"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Tip: Use &ldquo;INVALID...&rdquo; or &ldquo;FAIL...&rdquo; to simulate verification failure.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tax Number <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Membership Plan <span className="text-red-500">*</span>
                  </label>
                  {membershipPlans.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">Loading plans…</p>
                  )}
                  <div className="space-y-3">
                    {membershipPlans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-brand-green bg-green-50 dark:bg-green-900/30"
                              : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>Joining fee: <strong>R{plan.joiningFeeAmount.toFixed(2)}</strong></span>
                              <span>Commission: <strong>{(plan.defaultCommissionRate * 100).toFixed(0)}%</strong></span>
                            </div>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "border-brand-green bg-brand-green"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={nextStep}
                className="mt-8 w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — Services */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Services Offered</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Select all services your business provides.
              </p>

              <div className="space-y-3">
                {SERVICE_OPTIONS.map((svc) => {
                  const selected = selectedServices.includes(svc.value);
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">{svc.description}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected
                            ? "border-brand-green bg-brand-green"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {selected && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Location */}
          {step === 3 && (
            <form onSubmit={handleLocationSubmit}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Location & Coverage</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Where is your business based and which areas do you service?
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={baseLocation}
                    onChange={(e) => setBaseLocation(e.target.value)}
                    placeholder="e.g. Cape Town, Western Cape"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 123 Main Street"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Suburb <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                      placeholder="e.g. Sandton"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Johannesburg"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 2196"
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
                      value={serviceRadiusKm}
                      onChange={(e) => setServiceRadiusKm(e.target.value)}
                      className="flex-1 accent-brand-green"
                    />
                    <span className="w-16 text-center font-semibold text-brand-green bg-brand-green-light rounded-lg py-1">
                      {serviceRadiusKm} km
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Areas <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    Type a suburb or area name and press Enter or &ldquo;Add&rdquo;.
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

                  {serviceAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {serviceAreas.map((area) => (
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
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Continue to Verification →"}
                </button>
              </div>
            </form>
          )}

          {/* Step 4 — Face Verification */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Face Verification</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Take a live selfie to verify your identity as the owner of this business account.
                </p>
              </div>

              {cameraError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Does this photo look clear and well-lit?</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={retakePhoto} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Retake</button>
                    <button type="button" onClick={confirmFace} className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors">Confirm &amp; Continue →</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-52 border-2 border-white/60 rounded-full" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Position your face within the oval guide and ensure good lighting</p>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
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
                onClick={() => setStep(3)}
                className="w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 5 — Company Verification */}
          {step === 5 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Company Verification</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                We verify your company registration with CIPC before proceeding.
              </p>

              {!verificationResult && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Verifying company with CIPC…</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Registration: {registrationNumber}</p>
                </div>
              )}

              {verificationResult && verificationResult.isValid && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Company Verified</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{verificationResult.message}</p>
                  <button
                    onClick={() => setStep(6)}
                    className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
                  >
                    Continue to Payment →
                  </button>
                </div>
              )}

              {verificationResult && !verificationResult.isValid && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-amber-600 dark:text-amber-400 text-2xl">!</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Verification Failed</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{verificationResult.message}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    Your profile has been created with status <strong>Under Review</strong>. An admin will review it shortly.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}

              {!verificationResult && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={runVerification}
                    disabled={loading}
                    className="flex-1 py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60"
                  >
                    {loading ? "Verifying…" : "Verify Company"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Ozow EFT Payment */}
          {step === 6 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Joining Fee Payment</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Pay the once-off joining fee via Ozow Instant EFT to activate your profile.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Amount due</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">R{joiningFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Company</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Reference</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{registrationNumber}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select your bank</label>
                <select className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green">
                  <option>FNB</option>
                  <option>Standard Bank</option>
                  <option>ABSA</option>
                  <option>Nedbank</option>
                  <option>Capitec</option>
                  <option>Investec</option>
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handlePayment(true)}
                  disabled={loading}
                  className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60"
                >
                  {loading ? "Processing…" : "Pay Now with Ozow"}
                </button>
                <button
                  onClick={() => handlePayment(false)}
                  disabled={loading}
                  className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  {loading ? "Processing…" : "Cancel / Pay Later"}
                </button>
                <button
                  onClick={() => { setPaymentResult("failed"); handlePayment(false); }}
                  disabled={loading}
                  className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-60"
                >
                  Simulate Payment Failed
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep(5)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Back to Verification
                </button>
              </div>
            </div>
          )}

          {/* Step 7 — Result */}
          {step === 7 && createdProfile && (
            <div className="text-center py-6">
              {paymentResult === "success" ? (
                <>
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Payment Successful</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Your joining fee of <strong>R{joiningFee.toFixed(2)}</strong> has been received.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    Profile status: <strong>{createdProfile.status}</strong>. You are now eligible for bookings once an admin approves your profile.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-amber-600 dark:text-amber-400 text-2xl">⏳</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Payment Pending</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    The joining fee of <strong>R{joiningFee.toFixed(2)}</strong> is still outstanding.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    Profile status: <strong>{createdProfile.status}</strong>. Complete the payment to activate your profile.
                  </p>
                </>
              )}
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
