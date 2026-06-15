"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSession, clearSession, saveSession } from "@/lib/auth";
import {
  getUser,
  updateUser,
  listServices,
  createCleaningBooking,
  getCustomerBookings,
  getProviderBookings,
  getMyProviderBookings,
  addCustomerAddress,
  getMyBusinessProfile,
  getProviderTeam,
  getSupervisorBookings,
  rateBooking,
} from "@/lib/api";
import type { User, BusinessProfile, Service, Booking, ProviderBooking, Address, TeamMember } from "@/lib/types";
import ThemeToggle from "../components/ThemeToggle";
import InfoRow from "./components/InfoRow";
import StatCard from "./components/StatCard";
import AddressCard from "./components/AddressCard";
import BookingRow from "./components/BookingRow";
import StatusBadge from "./components/StatusBadge";
import CategoryBadge from "./components/CategoryBadge";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(searchParams.get("payment") === "success");
  const [onsiteSuccess, setOnsiteSuccess] = useState(searchParams.get("onsite") === "1");
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("cc_bookings_cache");
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  });

  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Provider bookings
  const [providerBookings, setProviderBookings] = useState<ProviderBooking[]>([]);
  const [showAllProviderBookings, setShowAllProviderBookings] = useState(false);
  const [providerBookingsLoading, setProviderBookingsLoading] = useState(false);
  const [myProviderBookings, setMyProviderBookings] = useState<ProviderBooking[]>([]);
  const [myProviderBookingsLoading, setMyProviderBookingsLoading] = useState(false);

  // Supervisor bookings
  const [supervisorBookings, setSupervisorBookings] = useState<Booking[]>([]);
  const [supervisorBookingsLoading, setSupervisorBookingsLoading] = useState(false);

  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);

  // Edit profile form
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", customerType: "Residential", companyName: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add address form
  const [addrForm, setAddrForm] = useState({ label: "Home", streetAddress: "", suburb: "", city: "", province: "", postalCode: "", accessInstructions: "" });
  const [addrError, setAddrError] = useState<string | null>(null);
  const [addrSaving, setAddrSaving] = useState(false);

  // New booking form
  const [bookingForm, setBookingForm] = useState({ serviceId: "", addressId: "", date: "", time: "09:00", specialInstructions: "", accessNotes: "", hasPets: false, parkingInformation: "", payOnsite: false });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingAddressMode, setBookingAddressMode] = useState<"saved" | "new">("saved");
  const [bookingNewAddr, setBookingNewAddr] = useState({ label: "Home", streetAddress: "", suburb: "", city: "", province: "", postalCode: "" });

  const paymentParam = searchParams.get("payment");

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    loadData(session);
  }, [router, paymentParam]);

  useEffect(() => {
    if (typeof window !== "undefined" && bookings.length > 0) {
      localStorage.setItem("cc_bookings_cache", JSON.stringify(bookings));
    }
  }, [bookings]);

  async function loadData(sessionUser: User) {
    setLoading(true);
    try {
      const userRes = await getUser(sessionUser.id);
      const freshUser = userRes.succeeded && userRes.data ? userRes.data : sessionUser;
      setUser(freshUser);
      if (userRes.succeeded && userRes.data) saveSession(userRes.data);

      if (freshUser.role === "Supervisor") {
        setSupervisorBookingsLoading(true);
        try {
          const sbRes = await getSupervisorBookings(freshUser.id);
          if (sbRes.succeeded && sbRes.data) setSupervisorBookings(sbRes.data);
        } catch { /* silent */ } finally { setSupervisorBookingsLoading(false); }
      }

      if (freshUser.role === "ProviderOwner") {
        // Load provider business profile from API
        try {
          const bpRes = await getMyBusinessProfile(freshUser.id);
          if (bpRes.succeeded && bpRes.data) {
            setBusinessProfile(bpRes.data);
            localStorage.setItem("cc_business_profile", JSON.stringify(bpRes.data));
            // Load team for this provider
            try {
              const teamRes = await getProviderTeam(bpRes.data.id);
              if (teamRes.succeeded && teamRes.data) setTeamMembers(teamRes.data);
            } catch { /* silent */ }
          }
        } catch { /* silent */ }
        // Load provider bookings
        setProviderBookingsLoading(true);
        try {
          const pbRes = await getProviderBookings(1, 50);
          if (pbRes.succeeded && pbRes.data) setProviderBookings(pbRes.data.items);
        } catch { /* silent */ } finally { setProviderBookingsLoading(false); }
        // Load my assigned bookings
        setMyProviderBookingsLoading(true);
        try {
          const myRes = await getMyProviderBookings(freshUser.id, 1, 50);
          if (myRes.succeeded && myRes.data) setMyProviderBookings(myRes.data.items);
        } catch { /* silent */ } finally { setMyProviderBookingsLoading(false); }
      }

      const svcRes = await listServices();
      if (svcRes.succeeded && svcRes.data) setServices(svcRes.data);

      const cpId = freshUser.customerProfile?.id;
      if (cpId) {
        const bkRes = await getCustomerBookings(cpId, 1, 10);
        if (bkRes.succeeded && bkRes.data) {
          setBookings(bkRes.data.items);
          localStorage.setItem("cc_bookings_cache", JSON.stringify(bkRes.data.items));
        }
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  function handleLogout() { clearSession(); router.push("/login"); }

  function openEditProfile() {
    if (!user) return;
    setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phoneNumber: user.phoneNumber, customerType: user.customerProfile?.customerType ?? "Residential", companyName: user.customerProfile?.companyName ?? "" });
    setEditError(null); setShowEditProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); if (!user) return;
    setEditError(null);
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) { setEditError("First and last name are required."); return; }
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) { setEditError("A valid email is required."); return; }
    if (!editForm.phoneNumber.trim()) { setEditError("Phone number is required."); return; }

    setEditSaving(true);
    try {
      const result = await updateUser(user.id, {
        firstName: editForm.firstName.trim(), lastName: editForm.lastName.trim(), email: editForm.email.trim(), phoneNumber: editForm.phoneNumber.trim(),
        role: user.role, status: user.status,
        customerProfile: user.customerProfile ? { customerType: editForm.customerType as any, companyName: editForm.companyName.trim() || null, vatNumber: user.customerProfile.vatNumber, billingAddress: user.customerProfile.billingAddress, defaultPaymentMethodReference: user.customerProfile.defaultPaymentMethodReference } : undefined,
      });
      if (result.succeeded && result.data) { setUser(result.data); saveSession(result.data); setShowEditProfile(false); }
      else setEditError(result.error ?? "Failed to update profile.");
    } catch { setEditError("Server error. Please try again."); }
    finally { setEditSaving(false); }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault(); if (!user) return;
    setAddrError(null);
    if (!addrForm.streetAddress.trim() || !addrForm.suburb.trim() || !addrForm.city.trim() || !addrForm.province.trim()) { setAddrError("Street address, suburb, city, and province are required."); return; }
    setAddrSaving(true);
    try {
      const result = await addCustomerAddress(user.id, { label: addrForm.label.trim() || "Address", streetAddress: addrForm.streetAddress.trim(), suburb: addrForm.suburb.trim(), city: addrForm.city.trim(), province: addrForm.province.trim(), postalCode: addrForm.postalCode.trim(), accessInstructions: addrForm.accessInstructions.trim() || null });
      if (result.succeeded && result.data) { setUser(result.data); saveSession(result.data); setAddrForm({ label: "Home", streetAddress: "", suburb: "", city: "", province: "", postalCode: "", accessInstructions: "" }); setShowAddAddress(false); }
      else setAddrError(result.error ?? "Failed to add address.");
    } catch { setAddrError("Server error. Please try again."); }
    finally { setAddrSaving(false); }
  }

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault(); if (!user?.customerProfile) return;
    setBookingError(null);
    if (!bookingForm.serviceId || !bookingForm.date || !bookingForm.time) { setBookingError("Please select a service, date and time."); return; }

    let addressId = bookingForm.addressId;
    if (bookingAddressMode === "new") {
      if (!bookingNewAddr.streetAddress.trim() || !bookingNewAddr.suburb.trim() || !bookingNewAddr.city.trim() || !bookingNewAddr.province.trim()) { setBookingError("Please fill in street address, suburb, city and province."); return; }
      setBookingSaving(true);
      try {
        const addrRes = await addCustomerAddress(user.id, { label: bookingNewAddr.label.trim() || "Address", streetAddress: bookingNewAddr.streetAddress.trim(), suburb: bookingNewAddr.suburb.trim(), city: bookingNewAddr.city.trim(), province: bookingNewAddr.province.trim(), postalCode: bookingNewAddr.postalCode.trim(), accessInstructions: null });
        if (addrRes.succeeded && addrRes.data) {
          const freshUser = addrRes.data;
          setUser(freshUser); saveSession(freshUser);
          const newAddr = freshUser.customerProfile?.addresses?.find((a: Address) => a.streetAddress === bookingNewAddr.streetAddress.trim() && a.suburb === bookingNewAddr.suburb.trim());
          addressId = newAddr?.id ?? "";
        } else { setBookingError(addrRes.error ?? "Failed to save address."); setBookingSaving(false); return; }
      } catch { setBookingError("Server error while saving address."); setBookingSaving(false); return; }
    }
    if (!addressId) { setBookingError("Please select or enter a valid address."); setBookingSaving(false); return; }

    const scheduledStart = new Date(`${bookingForm.date}T${bookingForm.time}`);
    const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000);
    setBookingSaving(true);
    try {
      const result = await createCleaningBooking({ customerProfileId: user.customerProfile.id, serviceId: bookingForm.serviceId, addressId, scheduledStart: scheduledStart.toISOString(), scheduledEnd: scheduledEnd.toISOString(), specialInstructions: bookingForm.specialInstructions.trim() || null, accessNotes: bookingForm.accessNotes.trim() || null, hasPets: bookingForm.hasPets, parkingInformation: bookingForm.parkingInformation.trim() || null, payOnsite: bookingForm.payOnsite });
      if (result.succeeded && result.data) {
        const newBooking = result.data!;
        setBookings((prev) => [newBooking, ...prev]);
        setBookingForm({ serviceId: "", addressId: "", date: "", time: "09:00", specialInstructions: "", accessNotes: "", hasPets: false, parkingInformation: "", payOnsite: false });
        setBookingNewAddr({ label: "Home", streetAddress: "", suburb: "", city: "", province: "", postalCode: "" });
        setBookingAddressMode(customerAddresses.length > 0 ? "saved" : "new");
        setShowNewBooking(false);
        localStorage.setItem("cc_pending_booking", JSON.stringify(newBooking));
        if (bookingForm.payOnsite) {
          router.push("/dashboard?onsite=1");
        } else {
          router.push(`/dashboard/booking-confirmation?bookingId=${newBooking.id}`);
        }
      } else setBookingError(result.error ?? "Failed to create booking.");
    } catch { setBookingError("Server error. Please try again."); }
    finally { setBookingSaving(false); }
  }

  async function handleRateBooking(bookingId: string, rating: number, comment: string) {
    const cpId = user?.customerProfile?.id;
    if (!cpId) return;
    try {
      const res = await rateBooking({ bookingId, customerProfileId: cpId, rating, comment: comment || null });
      if (res.succeeded && res.data) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, review: res.data! } : b))
        );
      }
    } catch { /* silent */ }
  }

  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getFilteredProviderBookings(): ProviderBooking[] {
    if (!businessProfile) return [];
    if (showAllProviderBookings) return providerBookings;

    const providerLat = businessProfile.latitude;
    const providerLng = businessProfile.longitude;
    const radius = businessProfile.serviceRadiusKm;

    if (providerLat == null || providerLng == null) {
      // If provider has no coordinates, show all
      return providerBookings;
    }

    return providerBookings.filter((b) => {
      if (b.addressLatitude == null || b.addressLongitude == null) return true; // include if no coords
      const dist = haversineDistance(providerLat, providerLng, b.addressLatitude, b.addressLongitude);
      return dist <= radius;
    });
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabel: Record<string, string> = { Customer: "Customer", BusinessCustomer: "Business Customer", Cleaner: "Cleaner", ProviderOwner: "Business Owner", Admin: "Administrator" };
  const customerAddresses = user.customerProfile?.addresses ?? [];
  const isCustomer = user.role === "Customer" || user.role === "BusinessCustomer";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">CC</span></div>
          <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100">CleanConnect Africa</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{user.firstName} {user.lastName}</span>
          <ThemeToggle />
          <button onClick={handleLogout} className="p-2 sm:px-4 sm:py-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Log out">
            <LogOut className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline text-sm">Log out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {paymentSuccess && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-green-600 dark:text-green-400 text-lg sm:text-xl">✓</span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-400">Payment Successful</p>
                <p className="text-xs text-green-600 dark:text-green-500 hidden sm:block">Your booking has been confirmed. Thank you!</p>
              </div>
            </div>
            <button onClick={() => setPaymentSuccess(false)} className="text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 text-lg leading-none">&times;</button>
          </div>
        )}
        {onsiteSuccess && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-blue-600 dark:text-blue-400 text-lg sm:text-xl">✓</span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-400">Booking Created</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 hidden sm:block">Payment will be collected on site by the cleaner. Your booking is confirmed!</p>
              </div>
            </div>
            <button onClick={() => setOnsiteSuccess(false)} className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-lg leading-none">&times;</button>
          </div>
        )}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome, {user.firstName}!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here&apos;s your account overview.</p>
        </div>

        {isCustomer && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Bookings" value={String(bookings.length)} icon="📋" />
            <StatCard label="Saved Addresses" value={String(customerAddresses.length)} icon="📍" />
            <StatCard label="Active" value={String(bookings.filter((b) => b.status === "Confirmed" || b.status === "InProgress").length)} icon="🔔" />
            <StatCard label="Member Since" value={new Date().toLocaleDateString("en-ZA", { month: "short", year: "numeric" })} icon="📅" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="bg-brand-green-light dark:bg-green-900/20 px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">{user.firstName[0]}{user.lastName[0]}</div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">{user.firstName} {user.lastName}</h2>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-brand-green text-white text-xs font-medium rounded-full">{roleLabel[user.role] ?? user.role}</span>
                  </div>
                </div>
                <button onClick={openEditProfile} className="px-4 py-2 bg-white dark:bg-gray-800 text-brand-green text-sm font-medium rounded-lg border border-brand-green hover:bg-brand-green-light transition-colors">Edit Profile</button>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5 grid sm:grid-cols-2 gap-3 sm:gap-4">
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Phone" value={user.phoneNumber} />
                <InfoRow label="Status" value={user.status} />
                {user.idNumber && <InfoRow label="ID Number" value={user.idNumber} />}
                {user.customerProfile && <InfoRow label="Customer Type" value={user.customerProfile.customerType} />}
                {user.customerProfile?.companyName && <InfoRow label="Company" value={user.customerProfile.companyName} />}
              </div>
            </div>

            {isCustomer && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">📍 My Addresses</h3>
                  <button onClick={() => { setAddrError(null); setShowAddAddress(true); }} className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors">+ Add Address</button>
                </div>
                {customerAddresses.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700"><p className="text-gray-500 dark:text-gray-400 text-sm">No saved addresses yet.</p><p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add an address to start booking services.</p></div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">{customerAddresses.map((addr) => <AddressCard key={addr.id} address={addr} />)}</div>
                )}
              </div>
            )}

            {isCustomer && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 border-l-4 border-l-brand-green">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">📋 My Bookings</h3>
                    <span className="px-2 py-0.5 bg-brand-green-light dark:bg-green-900/30 text-brand-green dark:text-green-400 text-xs font-semibold rounded-full">{bookings.length}</span>
                  </div>
                  <button onClick={() => { setBookingError(null); setBookingAddressMode(customerAddresses.length > 0 ? "saved" : "new"); setShowNewBooking(true); }} className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors">+ New Booking</button>
                </div>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700"><p className="text-gray-500 dark:text-gray-400 text-sm">No bookings yet.</p><p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create your first booking to get started.</p></div>
                ) : (
                  <div className="space-y-3">{bookings.map((b) => <BookingRow key={b.id} booking={b} customerProfileId={user?.customerProfile?.id} onRate={handleRateBooking} />)}</div>
                )}
              </div>
            )}

            {user.role === "Supervisor" && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 border-l-4 border-l-blue-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">📋 My Bookings</h3>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                      {supervisorBookingsLoading ? "…" : supervisorBookings.length}
                    </span>
                  </div>
                  <Link href="/dashboard/supervisor" className="px-4 py-1.5 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors">Manage →</Link>
                </div>
                {supervisorBookingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading your bookings…</p>
                  </div>
                ) : supervisorBookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No assigned bookings yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {supervisorBookings.map((b) => (
                      <div key={b.id} className="flex items-stretch gap-2">
                        <Link href={`/dashboard/supervisor`} className="flex-1 block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-green hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{b.serviceName}</p>
                                <StatusBadge status={b.status} />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.addressLabel}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(b.scheduledStart).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-brand-green">R{b.price.toFixed(2)}</p>
                              <p className="text-xs text-brand-green font-medium">Manage →</p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {user.cleanerProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">🧹 Cleaner Profile</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow label="Employment type" value={user.cleanerProfile.employmentType} />
                  <InfoRow label="Rating" value={`${user.cleanerProfile.rating}/5`} />
                  <InfoRow label="Skills" value={user.cleanerProfile.skills} />
                  <InfoRow label="Service zones" value={user.cleanerProfile.serviceZones} />
                </div>
              </div>
            )}

            {user.role === "ProviderOwner" && !businessProfile && (
              <div className="bg-brand-green-light dark:bg-green-900/20 border-2 border-brand-green dark:border-green-700 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🏢</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Set Up Your Business Profile</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Add your company details, services and coverage areas so customers can find you.</p>
                    <Link href="/setup-business" className="inline-block mt-4 px-6 py-2.5 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors">Set up now →</Link>
                  </div>
                </div>
              </div>
            )}
            {businessProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">🏢 Business Profile</h3>
                  <StatusBadge status={businessProfile.status} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow label="Company" value={businessProfile.companyName} />
                  <InfoRow label="Reg. Number" value={businessProfile.registrationNumber} />
                  {businessProfile.streetAddress && <InfoRow label="Street" value={businessProfile.streetAddress} />}
                  {businessProfile.suburb && <InfoRow label="Suburb" value={businessProfile.suburb} />}
                  {businessProfile.city && <InfoRow label="City" value={businessProfile.city} />}
                  {businessProfile.province && <InfoRow label="Province" value={businessProfile.province} />}
                  {businessProfile.postalCode && <InfoRow label="Postal Code" value={businessProfile.postalCode} />}
                  {businessProfile.baseLocation && <InfoRow label="Base Location" value={businessProfile.baseLocation} />}
                  <InfoRow label="Service Radius" value={`${businessProfile.serviceRadiusKm} km`} />
                  <InfoRow label="Commission" value={`${(businessProfile.commissionRate * 100).toFixed(0)}%`} />
                  <InfoRow label="Joining Fee" value={`R${businessProfile.joiningFeeAmount.toFixed(2)}`} />
                </div>
                {businessProfile.serviceCategories.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {businessProfile.serviceCategories.map((cat) => <span key={cat} className="px-3 py-1 bg-brand-green-light text-brand-green text-sm font-medium rounded-full">{cat === "CarWash" ? "Car Wash" : cat}</span>)}
                    </div>
                  </div>
                )}
                {businessProfile.serviceAreas.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Service Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {businessProfile.serviceAreas.map((area) => <span key={area} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-full">{area}</span>)}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <Link href="/dashboard/business-profile" className="text-sm text-brand-green font-medium hover:underline">Update business profile →</Link>
                </div>
              </div>
            )}

            {user.role === "ProviderOwner" && businessProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">👷 My Team</h3>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">{teamMembers.length}</span>
                  </div>
                  <Link href="/dashboard/team" className="px-4 py-1.5 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors">Manage Team →</Link>
                </div>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No team members yet.</p>
                    <Link href="/dashboard/team" className="inline-block mt-2 text-sm text-brand-green font-medium hover:underline">Add your first staff member →</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map(m => (
                      <div key={m.profileId} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                        m.memberRole === "Supervisor"
                          ? "border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10"
                          : "border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10"
                      }`}>
                        <span className="text-lg">{{ Cleaner: "🧹", Washer: "🫧", Driver: "🚗", Supervisor: "👷" }[m.memberRole] ?? "👤"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{m.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.memberRole} · {m.employmentType} · {m.serviceZones}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">★ {m.rating.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {user.role === "ProviderOwner" && businessProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 border-l-4 border-l-brand-green">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">🗂️ My Jobs</h3>
                    <span className="px-2 py-0.5 bg-brand-green-light dark:bg-green-900/30 text-brand-green dark:text-green-400 text-xs font-semibold rounded-full">
                      {myProviderBookingsLoading ? "…" : myProviderBookings.length}
                    </span>
                  </div>
                </div>

                {myProviderBookingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading your jobs…</p>
                  </div>
                ) : myProviderBookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No accepted jobs yet.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Accept a booking from Available Bookings below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myProviderBookings.map((b) => (
                      <div key={b.id} className="flex items-stretch gap-2">
                        <Link href={`/dashboard/provider-booking/${b.id}`} className="flex-1 block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-green hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{b.serviceName}</p>
                                <CategoryBadge category={b.serviceCategory} />
                                <StatusBadge status={b.status} />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.addressSummary}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(b.scheduledStart).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-brand-green">R{b.price.toFixed(2)}</p>
                              <p className="text-xs text-brand-green font-medium">Manage →</p>
                            </div>
                          </div>
                        </Link>
                        <Link href={`/dashboard/booking-report/${b.id}`} className="flex items-center justify-center px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50 transition-all text-blue-500 text-xs font-medium whitespace-nowrap">
                          📋<span className="ml-1 hidden sm:inline">Report</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {user.role === "ProviderOwner" && businessProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 border-l-4 border-l-brand-green">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">🗂️ Available Bookings</h3>
                    <span className="px-2 py-0.5 bg-brand-green-light dark:bg-green-900/30 text-brand-green dark:text-green-400 text-xs font-semibold rounded-full">
                      {providerBookingsLoading ? "…" : getFilteredProviderBookings().length}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showAllProviderBookings}
                      onChange={(e) => setShowAllProviderBookings(e.target.checked)}
                      className="w-4 h-4 text-brand-green border-gray-300 dark:border-gray-600 rounded focus:ring-brand-green bg-white dark:bg-gray-800"
                    />
                    Show all (outside range)
                  </label>
                </div>

                {providerBookingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading bookings…</p>
                  </div>
                ) : providerBookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No bookings available.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Check back later for new customer bookings.</p>
                  </div>
                ) : getFilteredProviderBookings().length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No bookings in your service area.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Toggle &ldquo;Show all&rdquo; to view bookings outside your range.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredProviderBookings().map((b) => (
                      <Link key={b.id} href={`/dashboard/provider-booking/${b.id}`} className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-green hover:shadow-sm transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{b.serviceName}</p>
                              <CategoryBadge category={b.serviceCategory} />
                              <StatusBadge status={b.payOnsite && (b.status === "Confirmed" || b.status === "PendingPayment") ? "Pay Onsite" : b.status} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.addressSummary}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(b.scheduledStart).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
                            {b.addressLatitude != null && b.addressLongitude != null && businessProfile.latitude != null && businessProfile.longitude != null && (
                              <p className="text-xs text-brand-green font-medium mt-1">
                                📍 {haversineDistance(businessProfile.latitude, businessProfile.longitude, b.addressLatitude, b.addressLongitude).toFixed(1)} km away
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-green">R{b.price.toFixed(2)}</p>
                            <p className="text-xs text-brand-green font-medium">View →</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={() => { setBookingError(null); setBookingAddressMode(customerAddresses.length > 0 ? "saved" : "new"); setShowNewBooking(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors text-left"><span className="text-xl sm:text-2xl">🧹</span><div><p className="text-sm font-medium text-gray-700">Book a Service</p><p className="text-xs text-gray-400">Cleaning, laundry or car wash</p></div></button>
                <button onClick={() => { setAddrError(null); setShowAddAddress(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors text-left"><span className="text-xl sm:text-2xl">📍</span><div><p className="text-sm font-medium text-gray-700">Add Address</p><p className="text-xs text-gray-400">Save a new service location</p></div></button>
                <button onClick={openEditProfile} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors text-left"><span className="text-xl sm:text-2xl">✏️</span><div><p className="text-sm font-medium text-gray-700">Edit Profile</p><p className="text-xs text-gray-400">Update your details</p></div></button>
                {user.role === "ProviderOwner" && (
                  <Link href="/dashboard/team" className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-green hover:bg-brand-green-light transition-colors text-left"><span className="text-xl sm:text-2xl">👷</span><div><p className="text-sm font-medium text-gray-700">Manage Team</p><p className="text-xs text-gray-400">Add cleaners &amp; supervisors</p></div></Link>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Available Services</h3>
              {services.length === 0 ? <p className="text-sm text-gray-400">No services available.</p> : (
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div key={svc.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-900">{svc.name}</p><span className="text-xs font-semibold text-brand-green">R{svc.basePrice.toFixed(2)}</span></div>
                      <p className="text-xs text-gray-500 mt-1">{svc.description}</p>
                      <div className="flex items-center gap-2 mt-2"><CategoryBadge category={svc.category} /><span className="text-xs text-gray-400">{svc.estimatedDurationMinutes} min</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {showEditProfile && <EditProfileModal />}
      {showAddAddress && <AddAddressModal />}
      {showNewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">New Booking</h2><button onClick={() => setShowNewBooking(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl">&times;</button></div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {bookingError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{bookingError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label><select required value={bookingForm.serviceId} onChange={(e) => setBookingForm({ ...bookingForm, serviceId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"><option value="">Select a service</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name} — R{s.basePrice.toFixed(2)}</option>)}</select></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                {customerAddresses.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setBookingAddressMode("saved")} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${bookingAddressMode === "saved" ? "bg-brand-green text-white border-brand-green" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-green"}`}>Saved</button>
                    <button type="button" onClick={() => setBookingAddressMode("new")} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${bookingAddressMode === "new" ? "bg-brand-green text-white border-brand-green" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-green"}`}>New</button>
                  </div>
                )}
                {bookingAddressMode === "saved" ? (
                  <select required value={bookingForm.addressId} onChange={(e) => setBookingForm({ ...bookingForm, addressId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"><option value="">Select an address</option>{customerAddresses.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.streetAddress}, {a.suburb}</option>)}</select>
                ) : (
                  <div className="space-y-3">
                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Label <span className="text-gray-400 dark:text-gray-500 font-normal">(e.g. Home, Office)</span></label><input value={bookingNewAddr.label} onChange={(e) => setBookingNewAddr({ ...bookingNewAddr, label: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Street Address</label><input required={bookingAddressMode === "new"} value={bookingNewAddr.streetAddress} onChange={(e) => setBookingNewAddr({ ...bookingNewAddr, streetAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Suburb</label><input required={bookingAddressMode === "new"} value={bookingNewAddr.suburb} onChange={(e) => setBookingNewAddr({ ...bookingNewAddr, suburb: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
                      <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label><input required={bookingAddressMode === "new"} value={bookingNewAddr.city} onChange={(e) => setBookingNewAddr({ ...bookingNewAddr, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Province</label><select required={bookingAddressMode === "new"} value={bookingNewAddr.province} onChange={(e) => setBookingNewAddr({ ...bookingNewAddr, province: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"><option value="">Select</option><option value="Eastern Cape">Eastern Cape</option><option value="Free State">Free State</option><option value="Gauteng">Gauteng</option><option value="KwaZulu-Natal">KwaZulu-Natal</option><option value="Limpopo">Limpopo</option><option value="Mpumalanga">Mpumalanga</option><option value="Northern Cape">Northern Cape</option><option value="North West">North West</option><option value="Western Cape">Western Cape</option></select></div>
                      <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Postal Code</label><input value={bookingNewAddr.postalCode} onChange={(e) => setBookingNewAddr({ ...bookingNewAddr, postalCode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input required type="date" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label><input required type="time" value={bookingForm.time} onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label><textarea value={bookingForm.specialInstructions} onChange={(e) => setBookingForm({ ...bookingForm, specialInstructions: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Notes <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label><input value={bookingForm.accessNotes} onChange={(e) => setBookingForm({ ...bookingForm, accessNotes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parking Information <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label><input value={bookingForm.parkingInformation} onChange={(e) => setBookingForm({ ...bookingForm, parkingInformation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="hasPets" checked={bookingForm.hasPets} onChange={(e) => setBookingForm({ ...bookingForm, hasPets: e.target.checked })} className="w-4 h-4 text-brand-green border-gray-300 dark:border-gray-600 rounded focus:ring-brand-green bg-white dark:bg-gray-800" /><label htmlFor="hasPets" className="text-sm text-gray-700 dark:text-gray-300">Pets on the premises</label></div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"><input type="checkbox" id="payOnsite" checked={bookingForm.payOnsite} onChange={(e) => setBookingForm({ ...bookingForm, payOnsite: e.target.checked })} className="w-4 h-4 text-brand-green border-gray-300 dark:border-gray-600 rounded focus:ring-brand-green bg-white dark:bg-gray-800" /><label htmlFor="payOnsite" className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Pay onsite</span> — Cash or card to the cleaner on arrival</label></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowNewBooking(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button><button type="submit" disabled={bookingSaving} className="flex-1 py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60">{bookingSaving ? "Booking…" : "Create Booking"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function EditProfileModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Profile</h2><button onClick={() => setShowEditProfile(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl">&times;</button></div>
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            {editError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label><input required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label><input required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><input required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label><input required value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Type</label><select value={editForm.customerType} onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"><option value="Residential">Residential</option><option value="Hospitality">Hospitality</option><option value="Commercial">Commercial</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label><input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowEditProfile(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button><button type="submit" disabled={editSaving} className="flex-1 py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60">{editSaving ? "Saving…" : "Save Changes"}</button></div>
          </form>
        </div>
      </div>
    );
  }

  function AddAddressModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Address</h2><button onClick={() => setShowAddAddress(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl">&times;</button></div>
          <form onSubmit={handleAddAddress} className="p-6 space-y-4">
            {addrError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{addrError}</div>}
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label <span className="text-gray-400 dark:text-gray-500 font-normal">(e.g. Home, Office)</span></label><input required value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label><input required value={addrForm.streetAddress} onChange={(e) => setAddrForm({ ...addrForm, streetAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suburb</label><input required value={addrForm.suburb} onChange={(e) => setAddrForm({ ...addrForm, suburb: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label><input required value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Province</label><select required value={addrForm.province} onChange={(e) => setAddrForm({ ...addrForm, province: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"><option value="">Select</option><option value="Eastern Cape">Eastern Cape</option><option value="Free State">Free State</option><option value="Gauteng">Gauteng</option><option value="KwaZulu-Natal">KwaZulu-Natal</option><option value="Limpopo">Limpopo</option><option value="Mpumalanga">Mpumalanga</option><option value="Northern Cape">Northern Cape</option><option value="North West">North West</option><option value="Western Cape">Western Cape</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label><input value={addrForm.postalCode} onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Instructions <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label><textarea value={addrForm.accessInstructions} onChange={(e) => setAddrForm({ ...addrForm, accessInstructions: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" /></div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowAddAddress(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button><button type="submit" disabled={addrSaving} className="flex-1 py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60">{addrSaving ? "Adding…" : "Add Address"}</button></div>
          </form>
        </div>
      </div>
    );
  }

}

