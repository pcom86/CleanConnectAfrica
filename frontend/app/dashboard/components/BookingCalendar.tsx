"use client";

import { useState, useMemo } from "react";
import type { Booking, ProviderBooking } from "@/lib/types";

interface BookingCalendarProps {
  bookings: (Booking | ProviderBooking)[];
  onBookingClick?: (bookingId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Confirmed: "bg-blue-500",
  PendingPayment: "bg-yellow-500",
  Assigned: "bg-indigo-500",
  CleanerEnRoute: "bg-amber-500",
  InProgress: "bg-fuchsia-500",
  Completed: "bg-green-500",
  Cancelled: "bg-red-500",
  Rejected: "bg-gray-500",
  Disputed: "bg-orange-500",
};

const STATUS_LABELS: Record<string, string> = {
  Confirmed: "Confirmed",
  PendingPayment: "Pending Payment",
  Assigned: "Accepted",
  CleanerEnRoute: "En Route",
  InProgress: "In Progress",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Rejected: "Rejected",
  Disputed: "Disputed",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function formatServiceNames(booking: Booking | ProviderBooking) {
  if (booking.services && booking.services.length > 0) {
    return booking.services.map((s) => s.serviceName).join(" + ");
  }
  return booking.serviceName;
}

export default function BookingCalendar({ bookings, onBookingClick }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const bookingsByDay = useMemo(() => {
    const map: Record<string, (Booking | ProviderBooking)[]> = {};
    bookings.forEach((b) => {
      const d = new Date(b.scheduledStart);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const monthLabel = currentDate.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const cells: { day: number | null; isToday: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isToday: isSameDay(new Date(year, month, d), today) });
  }

  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    const key = `${selectedDay.year}-${selectedDay.month}-${selectedDay.day}`;
    return bookingsByDay[key] ?? [];
  }, [selectedDay, bookingsByDay]);

  const selectedDateLabel = selectedDay
    ? new Date(selectedDay.year, selectedDay.month, selectedDay.day).toLocaleDateString("en-ZA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">📅 Job Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">←</button>
          <button onClick={goToToday} className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium">Today</button>
          <button onClick={nextMonth} className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">→</button>
        </div>
      </div>
      <p className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
        {cells.map((cell, idx) => {
          if (cell.day === null) return <div key={`empty-${idx}`} className="h-20" />;
          const key = `${year}-${month}-${cell.day}`;
          const dayBookings = bookingsByDay[key] || [];
          const dayNum = cell.day as number;
          return (
            <button
              key={key}
              onClick={() => setSelectedDay({ year, month, day: dayNum })}
              className={`h-20 border rounded-lg p-1 flex flex-col gap-0.5 overflow-hidden transition-colors text-left ${
                cell.isToday ? "border-brand-green bg-brand-green-light/30 dark:bg-brand-green/10" : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span className={`text-xs font-medium ${cell.isToday ? "text-brand-green" : "text-gray-500 dark:text-gray-400"}`}>{dayNum}</span>
              <div className="flex flex-wrap gap-0.5 content-start">
                {dayBookings.slice(0, 4).map((b) => (
                  <span
                    key={b.id}
                    title={`${formatServiceNames(b)} — ${formatTime(b.scheduledStart)}`}
                    className={`w-2 h-2 rounded-full ${STATUS_COLORS[b.status] ?? "bg-gray-400"}`}
                  />
                ))}
                {dayBookings.length > 4 && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">+{dayBookings.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Confirmed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />Assigned</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />En Route</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fuchsia-500" />In Progress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Pending Payment</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Cancelled</span>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{selectedDateLabel}</h4>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Close
            </button>
          </div>
          {selectedDayBookings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No bookings scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onBookingClick?.(b.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[b.status] ?? "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{formatServiceNames(b)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(b.scheduledStart)} — {STATUS_LABELS[b.status] ?? b.status}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-green">R{b.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
