export interface ApiResult<T> {
  succeeded: boolean;
  data: T | null;
  error: string | null;
}

export interface Address {
  id: string;
  label: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  accessInstructions: string | null;
}

export interface CustomerProfile {
  id: string;
  customerType: string;
  companyName: string | null;
  vatNumber: string | null;
  billingAddress: string | null;
  defaultPaymentMethodReference: string | null;
  addresses: Address[];
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
  idNumber: string | null;
  customerProfile: CustomerProfile | null;
  cleanerProfile: CleanerProfile | null;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  requiredCleaners: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gateway: string;
  gatewayReference: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  addressId: string;
  addressLabel: string;
  addressSummary: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  payOnsite: boolean;
  createdAt: string;
}

export interface ProviderBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  addressId: string;
  addressLabel: string;
  addressSummary: string;
  addressLatitude: number | null;
  addressLongitude: number | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  payOnsite: boolean;
  createdAt: string;
}

export interface CleaningJobDetail {
  id: string;
  cleaningType: string;
  numberOfRooms: number | null;
  squareMeters: number | null;
  hasPets: boolean;
  specialInstructions: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  cleanerNotes: string | null;
  teamDispatchedAt: string | null;
  teamArrivedAt: string | null;
  completedAt: string | null;
}

export interface Assignment {
  id: string;
  cleanerProfileId: string | null;
  cleanerName: string | null;
  providerId: string | null;
  providerName: string | null;
  assignedType: string;
  status: string;
  assignedAt: string;
  acceptedAt: string | null;
}

export interface ServiceMilestone {
  milestoneType: string;
  status: string;
  notes: string | null;
  occurredAt: string;
}

export interface BookingDetail {
  id: string;
  customerProfileId: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  addressId: string;
  addressLabel: string;
  addressSummary: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  payOnsite: boolean;
  createdAt: string;
  jobDetail: CleaningJobDetail | null;
  assignments: Assignment[];
  milestones: ServiceMilestone[];
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

export type UserRole = "Customer" | "BusinessCustomer" | "Cleaner" | "ProviderOwner" | "ProviderStaff" | "Admin";
export type CustomerType = "Residential" | "Hospitality" | "Commercial";
export type ServiceCategory = "Cleaning" | "Laundry" | "CarWash" | "PestControl";
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
  streetAddress: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
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
