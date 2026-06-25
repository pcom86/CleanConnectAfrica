import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100 truncate">CleanConnect Africa</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <ThemeToggle />
          <Link
            href="/login"
            className="p-2 sm:px-4 sm:py-2 text-sm sm:text-base text-brand-green font-medium rounded-lg border border-brand-green hover:bg-brand-green-light transition-colors"
            title="Log in"
          >
            <LogIn className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline">Log in</span>
          </Link>
          <Link
            href="/register"
            className="p-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green-dark transition-colors"
            title="Sign up"
          >
            <UserPlus className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline">Sign up</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-3xl text-center px-2">
          <span className="inline-block px-3 py-1 bg-brand-green-light dark:bg-green-900/30 text-brand-green dark:text-green-400 text-xs sm:text-sm font-medium rounded-full mb-4 sm:mb-6">
            South Africa&apos;s #1 Home Services Platform
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6 leading-tight break-words">
            Clean homes,{" "}
            <span className="text-brand-green">fresh laundry</span>,{" "}
            <span className="text-brand-orange">sparkling cars</span>,{" "}
            <span className="text-purple-500">pest-free spaces</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-10 leading-relaxed">
            Connect with trusted cleaning professionals across South Africa.
            Book cleaning, laundry, car wash, or pest control services in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors text-base sm:text-lg shadow-sm"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-base sm:text-lg"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
          {[
            { icon: "🧹", title: "Cleaning", desc: "Deep cleans, regular upkeep, and move-in/out services" },
            { icon: "👕", title: "Laundry", desc: "Wash, dry, iron and deliver — right to your door" },
            { icon: "🚗", title: "Car Wash", desc: "Mobile car wash at your home or office, any time" },
            { icon: "🐛", title: "Pest Control", desc: "Safe, effective pest removal for homes and businesses" },
          ].map((f) => (
            <div key={f.title} className="p-4 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg mb-1 sm:mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} CleanConnect Africa. Built for Africa.
      </footer>
    </div>
  );
}
