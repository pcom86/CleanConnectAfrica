import type { ApiResult, User, BusinessProfile, PagedResult, AdminStats, MembershipPlan, Service, Booking, ProviderBooking, Payment, BookingDetail, CleanerProfile, SupervisorProfile, JobCheckIn, JobCheckOut, PostJobReport, TeamMember, Review, Notification } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function safeJson<T>(res: Response): Promise<ApiResult<T>> {
  try { return (await res.json()) as ApiResult<T>; }
  catch {
    return { succeeded: false, data: null, error: `Server error (${res.status})` } as ApiResult<T>;
  }
}

async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return safeJson<T>(res);
}

async function get<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return safeJson<T>(res);
}

async function put<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return safeJson<T>(res);
}

export async function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: string;
  status: string;
  idNumber?: string | null;
  customerProfile?: {
    customerType: string;
    address?: {
      streetAddress: string;
      suburb: string;
      city: string;
      province: string;
      postalCode: string;
      label?: string;
    } | null;
  } | null;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/users", data);
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/auth/login", data);
}

export async function changePassword(data: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/auth/change-password", data);
}

export async function createBusinessProfile(data: {
  contactUserId: string;
  companyName: string;
  registrationNumber: string;
  taxNumber?: string | null;
  serviceCategories: string[];
  baseLocation: string;
  streetAddress?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  serviceAreas: string[];
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm: number;
  joiningFeeAmount: number;
  commissionRate: number;
  verificationPassed?: boolean;
  paymentCompleted?: boolean;
  membershipPlanId?: string;
}): Promise<ApiResult<BusinessProfile>> {
  return post<BusinessProfile>("/api/v1/business-profiles", data);
}

export async function verifyCompany(registrationNumber: string): Promise<ApiResult<{ isValid: boolean; companyName: string | null; message: string }>> {
  return post<{ isValid: boolean; companyName: string | null; message: string }>("/api/v1/business-profiles/verify", { registrationNumber });
}

export async function listMembershipPlans(): Promise<ApiResult<MembershipPlan[]>> {
  return get<MembershipPlan[]>("/api/v1/membership-plans");
}

export async function getBusinessProfile(providerId: string): Promise<ApiResult<BusinessProfile>> {
  return get<BusinessProfile>(`/api/v1/business-profiles/${providerId}`);
}

export async function getAdminStats(): Promise<ApiResult<AdminStats>> {
  return get<AdminStats>("/api/v1/admin/stats");
}

export async function listUsers(params?: { status?: string; role?: string; page?: number; pageSize?: number }): Promise<ApiResult<PagedResult<User>>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.role) qs.set("role", params.role);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return get<PagedResult<User>>(`/api/v1/users?${qs.toString()}`);
}

export async function updateUserStatus(userId: string, status: string): Promise<ApiResult<User>> {
  return post<User>(`/api/v1/users/${userId}/status`, { status });
}

export async function updateUser(userId: string, data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  customerProfile?: {
    customerType: string;
    companyName: string | null;
    vatNumber: string | null;
    billingAddress: string | null;
    defaultPaymentMethodReference: string | null;
  };
}): Promise<ApiResult<User>> {
  return put<User>(`/api/v1/users/${userId}`, data);
}

export async function listBusinessProfiles(params?: { status?: string; serviceCategory?: string; page?: number; pageSize?: number }): Promise<ApiResult<PagedResult<BusinessProfile>>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.serviceCategory) qs.set("serviceCategory", params.serviceCategory);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return get<PagedResult<BusinessProfile>>(`/api/v1/business-profiles?${qs.toString()}`);
}

export async function approveBusinessProfile(providerId: string): Promise<ApiResult<BusinessProfile>> {
  return post<BusinessProfile>(`/api/v1/business-profiles/${providerId}/approve`, {});
}

export async function rejectBusinessProfile(providerId: string, reason?: string): Promise<ApiResult<BusinessProfile>> {
  return post<BusinessProfile>(`/api/v1/business-profiles/${providerId}/reject`, { reason });
}

export async function updateBusinessProfile(providerId: string, data: {
  companyName: string;
  registrationNumber: string;
  taxNumber?: string | null;
  serviceCategories: string[];
  baseLocation: string;
  streetAddress?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  serviceAreas: string[];
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm: number;
  joiningFeeAmount: number;
  commissionRate: number;
  isEligibleForBookings: boolean;
}): Promise<ApiResult<BusinessProfile>> {
  return put<BusinessProfile>(`/api/v1/admin/business-profiles/${providerId}`, data);
}

export async function getMyBusinessProfile(contactUserId: string): Promise<ApiResult<BusinessProfile>> {
  return get<BusinessProfile>(`/api/v1/business-profiles/me?contactUserId=${contactUserId}`);
}

export async function updateMyBusinessProfile(providerId: string, data: {
  companyName: string;
  registrationNumber: string;
  taxNumber?: string | null;
  serviceCategories: string[];
  baseLocation: string;
  streetAddress?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  serviceAreas: string[];
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm: number;
  joiningFeeAmount: number;
  commissionRate: number;
  isEligibleForBookings: boolean;
}): Promise<ApiResult<BusinessProfile>> {
  return put<BusinessProfile>(`/api/v1/business-profiles/${providerId}`, data);
}

export async function listAdminMembershipPlans(): Promise<ApiResult<MembershipPlan[]>> {
  return get<MembershipPlan[]>("/api/v1/admin/membership-plans");
}

export async function createMembershipPlan(data: {
  name: string;
  description: string;
  joiningFeeAmount: number;
  recurringFeeAmount: number;
  billingCycle: string;
  defaultCommissionRate: number;
  isActive?: boolean;
}): Promise<ApiResult<MembershipPlan>> {
  return post<MembershipPlan>("/api/v1/admin/membership-plans", data);
}

export async function updateMembershipPlan(planId: string, data: {
  name: string;
  description: string;
  joiningFeeAmount: number;
  recurringFeeAmount: number;
  billingCycle: string;
  defaultCommissionRate: number;
  isActive: boolean;
}): Promise<ApiResult<MembershipPlan>> {
  return put<MembershipPlan>(`/api/v1/admin/membership-plans/${planId}`, data);
}

export async function deleteMembershipPlan(planId: string): Promise<ApiResult<boolean>> {
  const res = await fetch(`${BASE_URL}/api/v1/admin/membership-plans/${planId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  return res.json() as Promise<ApiResult<boolean>>;
}

export async function getUser(userId: string): Promise<ApiResult<User>> {
  return get<User>(`/api/v1/users/${userId}`);
}

export async function listServices(): Promise<ApiResult<Service[]>> {
  const res = await fetch(`${BASE_URL}/api/v1/services`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { succeeded: false, data: null, error: body.error ?? `HTTP ${res.status}` };
  }
  const data = (await res.json()) as Service[];
  return { succeeded: true, data, error: null };
}

export async function listAllServices(): Promise<ApiResult<Service[]>> {
  const res = await fetch(`${BASE_URL}/api/v1/services?activeOnly=false`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { succeeded: false, data: null, error: body.error ?? `HTTP ${res.status}` };
  }
  const data = (await res.json()) as Service[];
  return { succeeded: true, data, error: null };
}

export async function updateService(serviceId: string, data: {
  name?: string;
  description?: string;
  category?: string;
  basePrice?: number;
  estimatedDurationMinutes?: number;
  requiredCleaners?: number;
  isActive?: boolean;
}): Promise<ApiResult<Service>> {
  return put<Service>(`/api/v1/services/${serviceId}`, data);
}

export async function createCleaningBooking(data: {
  customerProfileId: string;
  serviceId?: string | null;
  serviceIds?: string[];
  addressId?: string | null;
  oneTimeAddress?: { streetAddress: string; suburb: string; city: string; province: string; postalCode?: string | null; label?: string | null } | null;
  scheduledStart: string;
  scheduledEnd: string;
  specialInstructions?: string | null;
  accessNotes?: string | null;
  hasPets?: boolean;
  parkingInformation?: string | null;
  payOnsite?: boolean;
  recurrenceFrequency?: string | null;
  recurrenceCount?: number;
}): Promise<ApiResult<Booking[]>> {
  return post<Booking[]>("/api/v1/cleaning-bookings", data);
}

export async function getCustomerBookings(customerProfileId: string, page = 1, pageSize = 20): Promise<ApiResult<PagedResult<Booking>>> {
  return get<PagedResult<Booking>>(`/api/v1/customer-bookings/${customerProfileId}?page=${page}&pageSize=${pageSize}`);
}

export async function rateBooking(data: {
  bookingId: string;
  customerProfileId: string;
  rating: number;
  comment?: string | null;
}): Promise<ApiResult<Review>> {
  return post<Review>("/api/v1/customer-bookings/rate", data);
}

export async function getProviderBookings(page = 1, pageSize = 50, providerContactUserId?: string | null): Promise<ApiResult<PagedResult<ProviderBooking>>> {
  let url = `/api/v1/provider-bookings?page=${page}&pageSize=${pageSize}`;
  if (providerContactUserId) url += `&providerContactUserId=${providerContactUserId}`;
  return get<PagedResult<ProviderBooking>>(url);
}

export async function addCustomerAddress(userId: string, data: {
  label: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode?: string | null;
  accessInstructions?: string | null;
}): Promise<ApiResult<User>> {
  return post<User>(`/api/v1/users/${userId}/addresses`, data);
}

export async function createBookingPayment(bookingId: string, customerProfileId: string): Promise<ApiResult<{ paymentId: string; paymentUrl: string; amount: number; currency: string }>> {
  return post<{ paymentId: string; paymentUrl: string; amount: number; currency: string }>(`/api/v1/payments/bookings/${bookingId}`, { customerProfileId });
}

export async function confirmBookingPayment(paymentId: string, gateway: string, gatewayReference: string, status: string): Promise<ApiResult<Payment>> {
  return post<Payment>("/api/v1/payments/confirm", { paymentId, gateway, gatewayReference, status });
}

export async function getPayment(paymentId: string): Promise<ApiResult<Payment>> {
  return get<Payment>(`/api/v1/payments/${paymentId}`);
}

export async function getBookingById(bookingId: string): Promise<ApiResult<BookingDetail>> {
  return get<BookingDetail>(`/api/v1/cleaning-bookings/${bookingId}`);
}

export async function acceptBooking(bookingId: string, providerId: string, scope?: "Single" | "Selected" | "AllInSeries", selectedBookingIds?: string[]): Promise<ApiResult<Booking[]>> {
  const payload: Record<string, unknown> = { providerId };
  if (scope) payload.scope = scope;
  if (selectedBookingIds) payload.selectedBookingIds = selectedBookingIds;
  return post<Booking[]>(`/api/v1/cleaning-bookings/${bookingId}/accept`, payload);
}

export async function assignCleanerToBooking(bookingId: string, cleanerProfileId: string): Promise<ApiResult<Booking>> {
  return post<Booking>(`/api/v1/cleaning-bookings/${bookingId}/assign-cleaner`, { cleanerProfileId });
}

export async function updateBookingStatus(bookingId: string, newStatus: string, notes?: string | null): Promise<ApiResult<Booking>> {
  return put<Booking>(`/api/v1/cleaning-bookings/${bookingId}/status`, { newStatus, notes });
}

export async function updateBooking(bookingId: string, data: {
  scheduledStart: string;
  scheduledEnd: string;
  specialInstructions?: string | null;
  accessNotes?: string | null;
  hasPets?: boolean;
  parkingInformation?: string | null;
}): Promise<ApiResult<Booking>> {
  return put<Booking>(`/api/v1/cleaning-bookings/${bookingId}`, data);
}

export async function updateVettingStatus(profileId: string, isSupervisor: boolean, newStatus: string, notes?: string | null): Promise<ApiResult<TeamMember>> {
  return put<TeamMember>(`/api/v1/staff/${profileId}/vetting`, { isSupervisor, newStatus, notes });
}

export async function completeBooking(bookingId: string, afterPhotos: string[], cleanerNotes: string, completedChecklistItems?: string[]): Promise<ApiResult<Booking>> {
  return post<Booking>(`/api/v1/cleaning-bookings/${bookingId}/complete`, { afterPhotos, cleanerNotes, completedChecklistItems });
}

export async function getMyProviderBookings(contactUserId: string, page = 1, pageSize = 50): Promise<ApiResult<PagedResult<ProviderBooking>>> {
  return get<PagedResult<ProviderBooking>>(`/api/v1/provider-bookings/my?contactUserId=${contactUserId}&page=${page}&pageSize=${pageSize}`);
}

export async function getProviderCleaners(providerId: string): Promise<ApiResult<CleanerProfile[]>> {
  return get<CleanerProfile[]>(`/api/v1/cleaners?providerId=${providerId}`);
}

export async function registerCleaner(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  providerId: string | null;
  employmentType: string;
  skills: string;
  serviceZones: string;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/cleaners", data);
}

export async function registerStaff(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  providerId: string | null;
  employmentType: string;
  skills: string;
  serviceZones: string;
  staffRole: string;
  idNumber?: string;
  idDocumentUrl?: string;
  profilePictureUrl?: string;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/staff", data);
}

export async function updateStaff(userId: string, data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  employmentType: string;
  skills: string;
  serviceZones: string;
  status: string;
  staffRole: string;
  providerId: string | null;
  idDocumentUrl?: string;
  profilePictureUrl?: string;
}): Promise<ApiResult<User>> {
  return put<User>(`/api/v1/staff/${userId}`, data);
}

export async function verifyIdDocument(profileId: string, isSupervisor: boolean): Promise<ApiResult<TeamMember>> {
  return put<TeamMember>(`/api/v1/staff/${profileId}/verify-id`, { isSupervisor });
}

export async function verifyIdentity(profileId: string, isSupervisor: boolean, idNumber: string, idDocumentBase64: string): Promise<ApiResult<TeamMember>> {
  return post<TeamMember>(`/api/v1/staff/${profileId}/verify-identity`, { isSupervisor, idNumber, idDocumentBase64 });
}

export async function verifyLiveness(userId: string, selfieBase64: string): Promise<ApiResult<User>> {
  return post<User>("/api/v1/auth/verify-liveness", { userId, selfieBase64 });
}

export async function getProviderSupervisors(providerId: string): Promise<ApiResult<SupervisorProfile[]>> {
  return get<SupervisorProfile[]>(`/api/v1/supervisors?providerId=${providerId}`);
}

export async function getSupervisorBookings(supervisorUserId: string): Promise<ApiResult<Booking[]>> {
  return get<Booking[]>(`/api/v1/supervisors/my-bookings?supervisorUserId=${supervisorUserId}`);
}

export async function getProviderTeam(providerId: string): Promise<ApiResult<TeamMember[]>> {
  return get<TeamMember[]>(`/api/v1/cleaning-bookings/team/${providerId}`);
}

export async function assignTeam(
  bookingId: string,
  cleanerProfileIds: string[],
  supervisorProfileId: string | null,
  vehicleRegistration?: string | null,
  vehicleType?: string | null
): Promise<ApiResult<Booking>> {
  return post<Booking>(`/api/v1/cleaning-bookings/${bookingId}/assign-team`, {
    cleanerProfileIds,
    supervisorProfileId,
    vehicleRegistration,
    vehicleType
  });
}

export async function registerSupervisor(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  providerId: string | null;
  employmentType: string;
  skills: string;
  serviceZones: string;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/supervisors", data);
}

export async function checkIn(data: {
  bookingId: string;
  userId: string;
  latitude?: number | null;
  longitude?: number | null;
  photoUrl?: string | null;
  photoUrls?: string[];
  notes?: string | null;
}): Promise<ApiResult<JobCheckIn>> {
  return post<JobCheckIn>("/api/v1/supervisors/check-in", data);
}

export async function checkOut(data: {
  bookingId: string;
  userId: string;
  latitude?: number | null;
  longitude?: number | null;
  photoUrl?: string | null;
  photoUrls?: string[];
  notes?: string | null;
  workSummary?: string | null;
}): Promise<ApiResult<JobCheckOut>> {
  return post<JobCheckOut>("/api/v1/supervisors/check-out", data);
}

export async function createPostJobReport(data: {
  bookingId: string;
  compiledByUserId: string;
  summary: string;
  issuesFound?: string | null;
  recommendations?: string | null;
  overallRating?: number | null;
  photos: string[];
  checklistResults: { taskName: string; completed: boolean; notes?: string | null }[];
}): Promise<ApiResult<PostJobReport>> {
  return post<PostJobReport>("/api/v1/supervisors/post-job-report", data);
}

export async function getPostJobReport(bookingId: string): Promise<ApiResult<PostJobReport>> {
  return get<PostJobReport>(`/api/v1/supervisors/post-job-report/${bookingId}`);
}

export async function getBookingCheckIns(bookingId: string): Promise<ApiResult<JobCheckIn[]>> {
  return get<JobCheckIn[]>(`/api/v1/supervisors/check-ins/${bookingId}`);
}

export async function getBookingCheckOuts(bookingId: string): Promise<ApiResult<JobCheckOut[]>> {
  return get<JobCheckOut[]>(`/api/v1/supervisors/check-outs/${bookingId}`);
}

export async function getCustomerNotifications(customerProfileId: string, unreadOnly = false): Promise<ApiResult<Notification[]>> {
  return get<Notification[]>(`/api/v1/notifications/customer/${customerProfileId}?unreadOnly=${unreadOnly}`);
}

export async function markNotificationRead(notificationId: string): Promise<ApiResult<boolean>> {
  return post<boolean>(`/api/v1/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead(customerProfileId: string): Promise<ApiResult<number>> {
  return post<number>(`/api/v1/notifications/customer/${customerProfileId}/read-all`, {});
}
