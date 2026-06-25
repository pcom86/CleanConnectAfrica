"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, Bell } from "lucide-react";
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
  getCustomerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateBooking,
  getBookingById,
} from "@/lib/api";
import type { User, BusinessProfile, Service, Booking, ProviderBooking, Address, TeamMember, Notification } from "@/lib/types";
import ThemeToggle from "../components/ThemeToggle";
import InfoRow from "./components/InfoRow";
import StatCard from "./components/StatCard";
import AddressCard from "./components/AddressCard";
import BookingRow from "./components/BookingRow";
import BookingCalendar from "./components/BookingCalendar";
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

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [editBookingFetching, setEditBookingFetching] = useState(false);
  const [editBookingForm, setEditBookingForm] = useState({ date: "", startTime: "09:00", endTime: "11:00", specialInstructions: "", accessNotes: "", hasPets: false, parkingInformation: "" });
  const [editBookingError, setEditBookingError] = useState<string | null>(null);
  const [editBookingSaving, setEditBookingSaving] = useState(false);

  // Edit profile form
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", customerType: "Residential", companyName: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add address form
  const [addrForm, setAddrForm] = useState({ label: "Home", streetAddress: "", suburb: "", city: "", province: "", postalCode: "", accessInstructions: "" });
  const [addrError, setAddrError] = useState<string | null>(null);
  const [addrSaving, setAddrSaving] = useState(false);

  // New booking form
  const [bookingForm, setBookingForm] = useState({ serviceIds: [] as string[], addressId: "", date: "", time: "09:00", specialInstructions: "", accessNotes: "", hasPets: false, parkingInformation: "", payOnsite: false, isRecurring: false, recurrenceFrequency: "Weekly" as "Weekly" | "BiWeekly" | "Monthly", recurrenceCount: 2 });
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
          const pbRes = await getProviderBookings(1, 50, freshUser.id);
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
        loadNotifications(cpId);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  function handleLogout() { clearSession(); router.push("/login"); }

  async function loadNotifications(customerProfileId: string) {
    setNotificationsLoading(true);
    try {
      const res = await getCustomerNotifications(customerProfileId, true);
      if (res.succeeded && res.data) {
        setNotifications(res.data);
      }
    } catch { /* silent */ } finally { setNotificationsLoading(false); }
  }

  async function handleMarkRead(notificationId: string, customerProfileId: string) {
    await markNotificationRead(notificationId);
    loadNotifications(customerProfileId);
  }

  async function handleMarkAllRead(customerProfileId: string) {
    await markAllNotificationsRead(customerProfileId);
    loadNotifications(customerProfileId);
  }

  async function openEditBooking(booking: import("@/lib/types").Booking) {
    setEditBookingId(booking.id);
    setEditBookingError(null);
    setEditBookingFetching(true);
    setShowEditBooking(true);
    const start = new Date(booking.scheduledStart);
    const end = new Date(booking.scheduledEnd);
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const toTimeStr = (d: Date) => d.toTimeString().slice(0, 5);
    setEditBookingForm({ date: toDateStr(start), startTime: toTimeStr(start), endTime: toTimeStr(end), specialInstructions: "", accessNotes: "", hasPets: false, parkingInformation: "" });
    try {
      const res = await getBookingById(booking.id);
      if (res.succeeded && res.data) {
        const d = res.data;
        setEditBookingForm({ date: toDateStr(start), startTime: toTimeStr(start), endTime: toTimeStr(end), specialInstructions: d.specialInstructions ?? "", accessNotes: d.accessNotes ?? "", hasPets: d.hasPets ?? false, parkingInformation: d.parkingInformation ?? "" });
      }
    } catch { /* use defaults */ } finally { setEditBookingFetching(false); }
  }

  async function handleSaveEditBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!editBookingId) return;
    setEditBookingError(null);
    if (!editBookingForm.date || !editBookingForm.startTime || !editBookingForm.endTime) { setEditBookingError("Date and times are required."); return; }
    const start = new Date(`${editBookingForm.date}T${editBookingForm.startTime}`);
    const end = new Date(`${editBookingForm.date}T${editBookingForm.endTime}`);
    if (end <= start) { setEditBookingError("End time must be after start time."); return; }
    setEditBookingSaving(true);
    try {
      const res = await updateBooking(editBookingId, {
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        specialInstructions: editBookingForm.specialInstructions.trim() || null,
        accessNotes: editBookingForm.accessNotes.trim() || null,
        hasPets: editBookingForm.hasPets,
        parkingInformation: editBookingForm.parkingInformation.trim() || null,
      });
      if (res.succeeded && res.data) {
        setBookings((prev) => prev.map((b) => b.id === editBookingId ? { ...b, scheduledStart: res.data!.scheduledStart, scheduledEnd: res.data!.scheduledEnd } : b));
        setShowEditBooking(false);
        setEditBookingId(null);
      } else {
        setEditBookingError(res.error ?? "Failed to update booking.");
      }
    } catch { setEditBookingError("Server error. Please try again."); }
    finally { setEditBookingSaving(false); }
  }

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
    if (bookingForm.serviceIds.length === 0 || !bookingForm.date || !bookingForm.time) { setBookingError("Please select at least one service, date and time."); return; }

    const scheduledStart = new Date(`${bookingForm.date}T${bookingForm.time}`);
    const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000);
    setBookingSaving(true);

    try {
      let payload: Parameters<typeof createCleaningBooking>[0] = {
        customerProfileId: user.customerProfile.id,
        serviceIds: bookingForm.serviceIds,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        specialInstructions: bookingForm.specialInstructions.trim() || null,
        accessNotes: bookingForm.accessNotes.trim() || null,
        hasPets: bookingForm.hasPets,
        parkingInformation: bookingForm.parkingInformation.trim() || null,
        payOnsite: bookingForm.payOnsite,
        recurrenceFrequency: bookingForm.isRecurring ? bookingForm.recurrenceFrequency : null,
        recurrenceCount: bookingForm.isRecurring ? bookingForm.recurrenceCount : 1,
      };

      if (bookingAddressMode === "new") {
        if (!bookingNewAddr.streetAddress.trim() || !bookingNewAddr.suburb.trim() || !bookingNewAddr.city.trim() || !bookingNewAddr.province.trim()) {
          setBookingError("Please fill in street address, suburb, city and province.");
          setBookingSaving(false);
          return;
        }
        payload.addressId = null;
        payload.oneTimeAddress = {
          streetAddress: bookingNewAddr.streetAddress.trim(),
          suburb: bookingNewAddr.suburb.trim(),
          city: bookingNewAddr.city.trim(),
          province: bookingNewAddr.province.trim(),
          postalCode: bookingNewAddr.postalCode?.trim() || null,
          label: bookingNewAddr.label?.trim() || null,
        };
      } else {
        if (!bookingForm.addressId) {
          setBookingError("Please select or enter a valid address.");
          setBookingSaving(false);
          return;
        }
        payload.addressId = bookingForm.addressId;
      }

      const result = await createCleaningBooking(payload);
      if (result.succeeded && result.data && result.data.length > 0) {
        const newBookings = result.data;
        setBookings((prev) => [...newBookings, ...prev]);
        setBookingForm({ serviceIds: [], addressId: "", date: "", time: "09:00", specialInstructions: "", accessNotes: "", hasPets: false, parkingInformation: "", payOnsite: false, isRecurring: false, recurrenceFrequency: "Weekly", recurrenceCount: 2 });
        setBookingNewAddr({ label: "Home", streetAddress: "", suburb: "", city: "", province: "", postalCode: "" });
        setBookingAddressMode(customerAddresses.length > 0 ? "saved" : "new");
        setShowNewBooking(false);
        localStorage.setItem("cc_pending_booking", JSON.stringify(newBookings[0]));
        if (bookingForm.payOnsite) {
          router.push("/dashboard?onsite=1");
        } else {
          router.push(`/dashboard/booking-confirmation?bookingId=${newBookings[0].id}`);
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

    const providerLat = businessProfile.latitude;
    const providerLng = businessProfile.longitude;
    const radius = businessProfile.serviceRadiusKm ?? 0;

    const hasProviderCoords = providerLat != null && providerLng != null;

    // Compute distance for each booking (null if no coords)
    const withDist = providerBookings.map((b) => {
      const dist =
        hasProviderCoords && b.addressLatitude != null && b.addressLongitude != null
          ? haversineDistance(providerLat, providerLng, b.addressLatitude, b.addressLongitude)
          : null;
      return { b, dist };
    });

    // Default: only show bookings with known distance within service radius
    // Show all checkbox overrides the range filter
    const filtered = showAllProviderBookings
      ? withDist
      : withDist.filter(({ dist }) => dist != null && dist <= radius);

    // Sort by distance ascending; unknown distances go to the end
    filtered.sort((a, b) => {
      if (a.dist != null && b.dist != null) return a.dist - b.dist;
      if (a.dist != null) return -1;
      if (b.dist != null) return 1;
      return 0;
    });

    return filtered.map(({ b }) => b);
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
          <div className="relative">
            <button
              onClick={() => { setShowNotifications((v) => !v); if (user?.customerProfile?.id) loadNotifications(user.customerProfile.id); }}
              className="relative p-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{notifications.length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="fixed right-2 top-16 w-80 max-w-[calc(100vw-1rem)] max-h-96 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                <div className="relative px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 rounded-t-xl">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Notifications</h3>
                  {notifications.length > 0 && user?.customerProfile?.id && (
                    <button onClick={() => handleMarkAllRead(user.customerProfile!.id)} className="text-xs text-brand-green hover:text-brand-green-dark font-medium shrink-0 ml-2">Mark all read</button>
                  )}
                </div>
                {notificationsLoading ? (
                  <div className="relative p-4 text-center text-sm text-gray-500">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="relative p-4 text-center text-sm text-gray-500">No new notifications</div>
                ) : (
                  <div className="relative divide-y divide-gray-100 dark:divide-gray-800">
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-[10px] text-gray-400 truncate">{new Date(n.createdAt).toLocaleString()}</span>
                          {user?.customerProfile?.id && (
                            <button onClick={() => handleMarkRead(n.id, user.customerProfile!.id)} className="text-xs text-brand-green hover:text-brand-green-dark font-medium shrink-0">Mark read</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
                  <div className="space-y-3">{bookings.map((b) => <BookingRow key={b.id} booking={b} customerProfileId={user?.customerProfile?.id} onRate={handleRateBooking} onEdit={openEditBooking} />)}</div>
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
                    {myProviderBookings.map((b) => {
                      const statusBorder =
                        b.status === "Assigned" || b.status === "Confirmed"
                          ? "border-l-indigo-500"
                          : b.status === "InProgress" || b.status === "CleanerEnRoute"
                          ? "border-l-fuchsia-500"
                          : b.status === "Completed"
                          ? "border-l-green-500"
                          : b.status === "Cancelled"
                          ? "border-l-red-500"
                          : "border-l-gray-300";
                      return (
                        <div key={b.id} className="flex items-stretch gap-2 min-w-0">
                          <Link
                            href={`/dashboard/provider-booking/${b.id}`}
                            className={`group flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-green hover:shadow-md transition-all border-l-4 ${statusBorder} overflow-hidden`}
                          >
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {b.services && b.services.length > 1 ? b.services.map((s) => s.serviceName).join(" + ") : b.serviceName}
                                </p>
                                <StatusBadge status={b.status} />
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{b.addressSummary}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                📅 {new Date(b.scheduledStart).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} ·{" "}
                                {new Date(b.scheduledStart).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 shrink-0 min-w-0">
                              <p className="text-base sm:text-lg font-bold text-brand-green">R{b.price.toFixed(2)}</p>
                              <p className="text-xs text-brand-green font-medium opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">Manage →</p>
                            </div>
                          </Link>
                          <Link
                            href={`/dashboard/booking-report/${b.id}`}
                            className="flex flex-col items-center justify-center gap-1 px-2 sm:px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-500 text-xs font-medium shrink-0"
                          >
                            <span className="text-base">📋</span>
                            <span className="hidden sm:inline">Report</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {user.role === "ProviderOwner" && businessProfile && (
              <BookingCalendar
                bookings={myProviderBookings}
                onBookingClick={(id) => router.push(`/dashboard/provider-booking/${id}`)}
              />
            )}

            {user.role === "ProviderOwner" && businessProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base whitespace-nowrap">Available Bookings</h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-brand-green text-white text-xs font-bold rounded-full flex-shrink-0">
                      {providerBookingsLoading ? "…" : getFilteredProviderBookings().length}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0 group">
                    <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${showAllProviderBookings ? "bg-brand-green" : "bg-gray-300 dark:bg-gray-600"}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showAllProviderBookings ? "translate-x-4" : "translate-x-0"}`} />
                      <input
                        type="checkbox"
                        checked={showAllProviderBookings}
                        onChange={(e) => setShowAllProviderBookings(e.target.checked)}
                        className="sr-only"
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Outside range</span>
                  </label>
                </div>

                {providerBookingsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400 dark:text-gray-500">
                    <div className="animate-spin w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full" />
                    Loading…
                  </div>
                ) : providerBookings.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <p className="text-2xl mb-2">📭</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No bookings available</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Check back later for new requests.</p>
                  </div>
                ) : getFilteredProviderBookings().length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <p className="text-2xl mb-2">🗺️</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">None in your service area</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enable &ldquo;Show outside range&rdquo; to see more.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {getFilteredProviderBookings().map((b) => {
                      const serviceLabel = b.services && b.services.length > 1
                        ? b.services.map((s) => s.serviceName).join(" + ")
                        : b.serviceName;
                      const distKm = b.addressLatitude != null && b.addressLongitude != null && businessProfile.latitude != null && businessProfile.longitude != null
                        ? haversineDistance(businessProfile.latitude, businessProfile.longitude, b.addressLatitude, b.addressLongitude).toFixed(1)
                        : null;
                      const dateLabel = new Date(b.scheduledStart).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                      const isPayOnsite = b.payOnsite && (b.status === "Confirmed" || b.status === "PendingPayment");
                      return (
                        <Link
                          key={b.id}
                          href={`/dashboard/provider-booking/${b.id}`}
                          className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                        >
                          {/* Left accent bar */}
                          <div className="w-1 self-stretch rounded-full bg-brand-green opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{serviceLabel}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {b.services && b.services.length > 0
                                ? b.services.map((s) => <CategoryBadge key={s.serviceId} category={s.serviceCategory} />)
                                : <CategoryBadge category={b.serviceCategory} />}
                              {isPayOnsite && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pay Onsite</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">📍 {b.addressSummary}</span>
                              {distKm && <span className="text-xs font-medium text-brand-green flex-shrink-0">{distKm} km</span>}
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">🕐 {dateLabel}</p>
                          </div>

                          {/* Right: price + CTA */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            <span className="text-sm font-bold text-brand-green">R{b.price.toFixed(2)}</span>
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-brand-green text-white font-medium group-hover:bg-brand-green-dark transition-colors">Accept</span>
                          </div>
                        </Link>
                      );
                    })}
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
      {showEditProfile && (
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
      )}
      {showAddAddress && (
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
      )}
      {showNewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">New Booking</h2><button onClick={() => setShowNewBooking(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl">&times;</button></div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {bookingError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{bookingError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Services <span className="text-gray-400 dark:text-gray-500 font-normal">(select one or more)</span></label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  {services.map((s) => {
                    const selected = bookingForm.serviceIds.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selected ? "bg-brand-green-light dark:bg-green-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...bookingForm.serviceIds, s.id]
                                : bookingForm.serviceIds.filter((id) => id !== s.id);
                              setBookingForm({ ...bookingForm, serviceIds: ids });
                            }}
                            className="w-4 h-4 text-brand-green border-gray-300 dark:border-gray-600 rounded focus:ring-brand-green bg-white dark:bg-gray-800"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{s.name}</span>
                        </div>
                        <span className="text-xs font-medium text-brand-green">R{s.basePrice.toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
                {bookingForm.serviceIds.length > 0 && (
                  <p className="text-xs text-brand-green font-medium mt-1">
                    Total: R{bookingForm.serviceIds.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.basePrice ?? 0), 0).toFixed(2)}
                  </p>
                )}
              </div>
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
              <div className="flex items-center gap-2 p-3 bg-brand-green-light dark:bg-green-900/20 border border-brand-green/20 dark:border-green-800 rounded-lg">
                <input type="checkbox" id="isRecurring" checked={bookingForm.isRecurring} onChange={(e) => setBookingForm({ ...bookingForm, isRecurring: e.target.checked })} className="w-4 h-4 text-brand-green border-gray-300 dark:border-gray-600 rounded focus:ring-brand-green bg-white dark:bg-gray-800" />
                <label htmlFor="isRecurring" className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Recurring booking</span> — Repeat this booking automatically</label>
              </div>
              {bookingForm.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Frequency</label>
                    <select value={bookingForm.recurrenceFrequency} onChange={(e) => setBookingForm({ ...bookingForm, recurrenceFrequency: e.target.value as "Weekly" | "BiWeekly" | "Monthly" })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                      <option value="Weekly">Weekly</option>
                      <option value="BiWeekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Occurrences <span className="text-gray-400 dark:text-gray-500 font-normal">(max 12)</span></label>
                    <input type="number" min={2} max={12} value={bookingForm.recurrenceCount} onChange={(e) => setBookingForm({ ...bookingForm, recurrenceCount: Math.min(12, Math.max(2, parseInt(e.target.value) || 2)) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
                  </div>
                </div>
              )}
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

      {showEditBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Booking</h2>
              <button onClick={() => { setShowEditBooking(false); setEditBookingId(null); }} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl">&times;</button>
            </div>
            {editBookingFetching ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400 dark:text-gray-500">
                <div className="animate-spin w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full" />
                Loading booking details…
              </div>
            ) : (
              <form onSubmit={handleSaveEditBooking} className="p-6 space-y-4">
                {editBookingError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{editBookingError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input required type="date" value={editBookingForm.date} onChange={(e) => setEditBookingForm({ ...editBookingForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                    <input required type="time" value={editBookingForm.startTime} onChange={(e) => setEditBookingForm({ ...editBookingForm, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                    <input required type="time" value={editBookingForm.endTime} onChange={(e) => setEditBookingForm({ ...editBookingForm, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                  <textarea value={editBookingForm.specialInstructions} onChange={(e) => setEditBookingForm({ ...editBookingForm, specialInstructions: e.target.value })} rows={2} placeholder="Any special requirements for the cleaner…" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Notes <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                  <input value={editBookingForm.accessNotes} onChange={(e) => setEditBookingForm({ ...editBookingForm, accessNotes: e.target.value })} placeholder="Gate code, intercom, key location…" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parking Information <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                  <input value={editBookingForm.parkingInformation} onChange={(e) => setEditBookingForm({ ...editBookingForm, parkingInformation: e.target.value })} placeholder="Street parking, bay number…" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="editHasPets" checked={editBookingForm.hasPets} onChange={(e) => setEditBookingForm({ ...editBookingForm, hasPets: e.target.checked })} className="w-4 h-4 text-brand-green border-gray-300 dark:border-gray-600 rounded focus:ring-brand-green bg-white dark:bg-gray-800" />
                  <label htmlFor="editHasPets" className="text-sm text-gray-700 dark:text-gray-300">Pets on the premises</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowEditBooking(false); setEditBookingId(null); }} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={editBookingSaving} className="flex-1 py-2.5 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60">{editBookingSaving ? "Saving…" : "Save Changes"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );


}

