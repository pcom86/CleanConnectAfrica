export interface ApiResult<T> {
  succeeded: boolean;
  data: T | null;
  error: string | null;
}

export interface CustomerProfile {
  id: string;
  customerType: string;
  companyName: string | null;
  vatNumber: string | null;
  billingAddress: string | null;
}

export interface CleanerProfile {
  id: string;
  providerId: string | null;
  employmentType: string;
  skills: string;
  serviceZones: string;
  rating: number;
  status: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  customerProfile: CustomerProfile | null;
  cleanerProfile: CleanerProfile | null;
}

export type UserRole = "Customer" | "BusinessCustomer" | "Cleaner" | "ProviderOwner" | "ProviderStaff" | "Admin";
export type CustomerType = "Residential" | "Hospitality" | "Commercial";
export type ServiceCategory = "Cleaning" | "Laundry" | "CarWash";
export type AccountStatus = "Active" | "Inactive" | "Suspended" | "PendingActivation";

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  pendingProviders: number;
  approvedProviders: number;
  rejectedProviders: number;
}

export interface BusinessProfile {
  id: string;
  companyName: string;
  registrationNumber: string;
  taxNumber: string | null;
  serviceCategories: ServiceCategory[];
  baseLocation: string | null;
  serviceAreas: string[];
  status: string;
  joiningFeeStatus: string;
  joiningFeeAmount: number;
  commissionRate: number;
  latitude: number | null;
  longitude: number | null;
  serviceRadiusKm: number;
  isEligibleForBookings: boolean;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  joiningFeeAmount: number;
  recurringFeeAmount: number;
  billingCycle: string;
  defaultCommissionRate: number;
  isActive: boolean;
}
