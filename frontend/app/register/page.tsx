"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type { CustomerType, UserRole } from "@/lib/types";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  customerType: CustomerType;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "Customer",
    customerType: "Residential",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        customerProfile: form.role === "Customer" ? { customerType: form.customerType } : null,
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

  const set = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">CC</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">CleanConnect</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Join thousands of happy customers</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
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
                  <option value="Hospitality">Hospitality — Hotel / B&B</option>
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
              disabled={loading}
              className="w-full py-3 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-green font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
