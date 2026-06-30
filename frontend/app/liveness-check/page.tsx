"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, saveSession } from "@/lib/auth";
import { verifyLiveness } from "@/lib/api";
import Logo from "@/app/components/Logo";

export default function LivenessCheckPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    if (!session.livenessRequired || session.livenessVerifiedAt) {
      router.push("/dashboard");
      return;
    }

    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch {
        setError("Camera access is required for liveness verification. Please allow camera permissions.");
      }
    }
    startCamera();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [router]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
  }

  async function submit() {
    if (!captured) return;
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await verifyLiveness(session.id, captured);
    if (res.succeeded && res.data) {
      setSuccess("Liveness verified successfully! Redirecting...");
      saveSession(res.data);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setError(res.error ?? "Liveness verification failed. Please try again in good lighting.");
    }
    setSubmitting(false);
  }

  function retake() {
    setCaptured(null);
    setError(null);
    setSuccess(null);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(s => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError("Camera access is required."));
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">Liveness Check</h1>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          For security, we need to verify your identity with a live selfie. Please position your face clearly in the frame.
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm text-center">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm text-center">{success}</div>}

        <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
          {!captured ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img src={captured} alt="Captured selfie" className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-center gap-3">
          {!captured ? (
            <button
              onClick={capture}
              className="bg-brand-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-navy-dark transition"
            >
              Capture Selfie
            </button>
          ) : (
            <>
              <button
                onClick={submit}
                disabled={submitting}
                className="bg-brand-green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-50 transition"
              >
                {submitting ? "Verifying…" : "Submit"}
              </button>
              <button
                onClick={retake}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Retake
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
