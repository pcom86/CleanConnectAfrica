"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession } from "@/lib/auth";
import ThemeToggle from "../components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/business-profiles", label: "Business Profiles", icon: "🏢" },
  { href: "/admin/membership-plans", label: "Membership Plans", icon: "💳" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "Admin") {
      router.replace("/login");
    } else {
      setUser(session);
    }
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading admin portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">Admin Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-green-light text-brand-green"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin</p>
            </div>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-green rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-600 dark:text-gray-300">
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === item.href ? "bg-brand-green-light text-brand-green" : "text-gray-600"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-red-600">
              Log out
            </button>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
