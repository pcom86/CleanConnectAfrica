export interface ApiResult<T> {
  succeeded: boolean;
  data: T | null;
  error: string | null;
  errorCode?: string | null;
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
  profilePictureUrl: string | null;
}

export interface SupervisorProfile {
  id: string;
  providerId: string | null;
  employmentType: string;
  skills: string;
  serviceZones: string;
  rating: number;
  status: string;
  profilePictureUrl: string | null;
}

export interface JobCheckIn {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  checkInTime: string;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  photoUrls: string[];
  notes: string | null;
}

export interface JobCheckOut {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  checkOutTime: string;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  photoUrls: string[];
  notes: string | null;
  workSummary: string | null;
}

export interface Notification {
  id: string;
  bookingId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface ChecklistResult {
  taskName: string;
  completed: boolean;
  notes: string | null;
}

export interface PostJobReport {
  id: string;
  bookingId: string;
  compiledByUserId: string;
  compiledByName: string;
  compiledAt: string;
  summary: string;
  issuesFound: string | null;
  recommendations: string | null;
  overallRating: number | null;
  photos: string[];
  checklistResults: ChecklistResult[];
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
  mustChangePassword: boolean;
  livenessRequired: boolean;
  livenessVerifiedAt: string | null;
  customerProfile: CustomerProfile | null;
  cleanerProfile: CleanerProfile | null;
  supervisorProfile: SupervisorProfile | null;
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

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface BookingServiceItem {
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  unitPrice: number;
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
  review: Review | null;
  isRecurring?: boolean;
  recurrenceFrequency?: string | null;
  recurrenceGroupId?: string | null;
  recurrenceIndex?: number | null;
  services?: BookingServiceItem[];
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
  services?: BookingServiceItem[];
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
  vehicleRegistration: string | null;
  vehicleType: string | null;
}

export interface TeamMember {
  profileId: string;
  userId: string;
  name: string;
  memberRole: string;
  employmentType: string;
  skills: string;
  serviceZones: string;
  rating: number;
  email: string;
  phoneNumber: string;
  status: string;
  vettingStatus: string;
  idDocumentUrl: string | null;
  idVerifiedAt: string | null;
  profilePictureUrl: string | null;
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
  teamMembers: TeamMember[] | null;
  supervisorName: string | null;
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
  isRecurring?: boolean;
  recurrenceFrequency?: string | null;
  recurrenceGroupId?: string | null;
  recurrenceIndex?: number | null;
  recurrenceCount?: number | null;
  services?: BookingServiceItem[];
  specialInstructions?: string | null;
  accessNotes?: string | null;
  hasPets?: boolean;
  parkingInformation?: string | null;
}

export type UserRole = "Customer" | "BusinessCustomer" | "Cleaner" | "Supervisor" | "ProviderOwner" | "ProviderStaff" | "Admin";
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
