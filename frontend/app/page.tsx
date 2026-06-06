import Link from "next/link";
import ThemeToggle from "./components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-gray-100">CleanConnect Africa</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-4 py-2 text-brand-green font-medium rounded-lg border border-brand-green hover:bg-brand-green-light transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-brand-green text-white font-medium rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center">
          <span className="inline-block px-3 py-1 bg-brand-green-light dark:bg-green-900/30 text-brand-green dark:text-green-400 text-sm font-medium rounded-full mb-6">
            South Africa&apos;s #1 Home Services Platform
          </span>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
            Clean homes,{" "}
            <span className="text-brand-green">fresh laundry</span>,{" "}
            <span className="text-brand-orange">sparkling cars</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
            Connect with trusted cleaning professionals across South Africa.
            Book cleaning, laundry, or car wash services in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors text-lg shadow-sm"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-lg"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-16">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: "🧹", title: "Cleaning", desc: "Deep cleans, regular upkeep, and move-in/out services" },
            { icon: "👕", title: "Laundry", desc: "Wash, dry, iron and deliver — right to your door" },
            { icon: "🚗", title: "Car Wash", desc: "Mobile car wash at your home or office, any time" },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 px-6 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} CleanConnect Africa. Built for Africa.
      </footer>
    </div>
  );
}
