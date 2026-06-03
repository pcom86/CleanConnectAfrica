"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session_expired";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginUser({ email: form.email, password: form.password });
      if (result.succeeded && result.data) {
        saveSession(result.data);
        router.push(result.data.role === "Admin" ? "/admin/dashboard" : "/dashboard");
      } else {
        setError(result.error ?? "Login failed. Please try again.");
      }
    } catch {
      setError("Unable to reach the server. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">CC</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">CleanConnect</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Log in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {sessionExpired && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Your session has expired. Please log in again — or{" "}
              <Link href="/register" className="font-medium underline">register a new account</Link>.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brand-green font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
