import type { ApiResult, User, BusinessProfile, PagedResult, AdminStats, MembershipPlan } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ApiResult<T>>;
}

async function get<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json() as Promise<ApiResult<T>>;
}

async function put<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ApiResult<T>>;
}

export async function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: string;
  status: string;
  customerProfile?: { customerType: string } | null;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/users", data);
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<ApiResult<User>> {
  return post<User>("/api/v1/auth/login", data);
}

export async function createBusinessProfile(data: {
  contactUserId: string;
  companyName: string;
  registrationNumber: string;
  taxNumber?: string | null;
  serviceCategories: string[];
  baseLocation: string;
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
