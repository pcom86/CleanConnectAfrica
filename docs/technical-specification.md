# CleanConnect Africa Technical Specification

## 1. Overview

CleanConnect Africa is a technology-enabled home and facility services platform that connects residential, hospitality, and commercial clients with professional, vetted service teams through a mobile application and web platform.

The company will initially provide cleaning services using its own trained staff. The platform will later evolve into a marketplace that allows independent service companies to onboard, receive bookings, pay a joining fee, and pay CleanConnect Africa a percentage commission for every completed booking. The MVP service catalogue must support cleaning, mobile laundry, and mobile car wash services.

The goal is to become one of South Africa's most trusted and accessible cleaning services platforms by combining technology, quality assurance, customer convenience, and scalable operations.

## 2. Technology Stack

- **Backend:** .NET 10 REST API
- **Architecture:** Clean Architecture with CQRS
- **Messaging:** Event-driven messaging where necessary
- **Cloud orchestration:** .NET Aspire
- **Mobile app:** React Native
- **Admin portal:** React with TypeScript
- **Database:** PostgreSQL
- **ORM:** Entity Framework Core
- **Caching:** Redis
- **Messaging broker:** RabbitMQ, Azure Service Bus, or AWS SQS depending on hosting
- **API documentation:** OpenAPI / Swagger
- **Observability:** OpenTelemetry, Aspire dashboard, structured logging

## 3. User Types

- **Residential customers:** Book once-off or recurring home cleaning, mobile laundry collection and delivery, and mobile car wash services.
- **Hospitality customers:** Manage housekeeping and turnover cleaning for hotels, guesthouses, lodges, and short-stay properties.
- **Commercial customers:** Manage recurring cleaning for offices, retail spaces, schools, clinics, and business premises.
- **CleanConnect staff:** Internal cleaners, supervisors, dispatchers, finance users, support users, and admins.
- **Marketplace providers:** Independent cleaning, laundry, and car wash companies onboarded into the CleanConnect ecosystem.

## 4. Core Platform Components

### 4.1 React Native Mobile App

The mobile app should support customer and cleaner workflows.

Key modules:

- Authentication
- Customer onboarding
- Service selection
- Booking creation
- Address management
- Payment checkout
- Booking tracking
- Ratings and reviews
- Cleaner job dashboard
- Cleaner check-in and check-out
- Checklist completion
- Notifications

### 4.2 React Admin Portal

The admin portal is the operational control center.

Key modules:

- Dashboard
- Booking management
- Customer management
- Staff management
- Cleaner assignment
- Payment monitoring
- Refunds
- Complaints and disputes
- Quality assurance
- Reports
- Provider onboarding
- Joining fee management
- Commission and payout management

### 4.3 .NET 10 REST API

The backend exposes REST endpoints and implements CQRS commands and queries.

Main modules:

- Identity and access
- Customers
- Services
- Bookings
- Scheduling
- Assignments
- Cleaner operations
- Payments
- Notifications
- Quality assurance
- Commercial accounts
- Marketplace providers
- Laundry operations
- Mobile car wash operations
- Reports
- Administration

### 4.4 .NET Aspire AppHost

.NET Aspire should orchestrate local and cloud-ready services:

- REST API
- Worker services
- PostgreSQL
- Redis
- Message broker
- Admin portal
- Observability
- Health checks
- Service discovery

## 5. CQRS Design

Commands handle state-changing operations.

Examples:

- `CreateBookingCommand`
- `CreateLaundryBookingCommand`
- `CreateCarWashBookingCommand`
- `CancelBookingCommand`
- `RescheduleBookingCommand`
- `AssignCleanerCommand`
- `CheckInJobCommand`
- `CheckOutJobCommand`
- `CompleteJobCommand`
- `SubmitReviewCommand`
- `SubmitProviderApplicationCommand`
- `InitiateProviderJoiningFeePaymentCommand`
- `ConfirmProviderJoiningFeePaymentCommand`
- `ApproveProviderCommand`
- `UpdateProviderCommissionRateCommand`
- `CalculateProviderBookingCommissionCommand`
- `GenerateProviderPayoutCommand`

Queries handle read-only operations.

Examples:

- `GetAvailableServicesQuery`
- `GetBookingByIdQuery`
- `GetCustomerBookingsQuery`
- `GetCleanerScheduleQuery`
- `GetAdminDashboardQuery`
- `GetProviderOnboardingStatusQuery`
- `GetProviderJoiningFeeQuery`
- `GetProviderCommissionHistoryQuery`
- `GetProviderPayoutsQuery`

## 6. Messaging Requirements

Messaging should be used for asynchronous, long-running, or integration-heavy workflows.

Recommended event examples:

- `BookingCreatedEvent`
- `BookingConfirmedEvent`
- `PaymentSucceededEvent`
- `PaymentFailedEvent`
- `CleanerAssignedEvent`
- `JobCompletedEvent`
- `LaundryCollectedEvent`
- `LaundryWashedEvent`
- `LaundryOutForDeliveryEvent`
- `LaundryDeliveredEvent`
- `CarWashProviderArrivedEvent`
- `CarWashCompletedEvent`
- `ProviderApplicationSubmittedEvent`
- `ProviderJoiningFeePaymentSucceededEvent`
- `ProviderApprovedEvent`
- `ProviderCommissionCalculatedEvent`
- `ProviderPayoutGeneratedEvent`
- `ProviderPayoutPaidEvent`

Messaging use cases:

- Sending notifications
- Processing payment webhooks
- Generating invoices
- Creating recurring bookings
- Calculating provider commissions
- Generating provider payouts
- Updating reporting projections
- Updating laundry collection and delivery milestones
- Updating mobile car wash arrival and completion milestones

## 7. Booking Management

Customers must be able to create, modify, cancel, and view bookings.

Booking statuses:

- `Draft`
- `PendingPayment`
- `Confirmed`
- `Assigned`
- `CleanerEnRoute`
- `InProgress`
- `Completed`
- `Cancelled`
- `Failed`
- `Disputed`
- `Refunded`

Booking fields:

- Customer
- Service
- Address
- Scheduled start
- Scheduled end
- Status
- Payment status
- Price
- Currency
- Special instructions
- Access notes
- Pets indicator
- Parking information

## 8. Service Categories for MVP

The MVP should support three core service categories:

- **Cleaning services:** Home cleaning, deep cleaning, office cleaning, hospitality turnover cleaning, and custom commercial cleaning.
- **Mobile laundry services:** Laundry collection, washing, drying, folding or ironing, and delivery back to the customer.
- **Mobile car wash services:** On-site car wash at the customer's residence or selected address.

All service categories should use the shared booking, payment, provider assignment, commission, payout, rating, and support infrastructure. Service-specific workflows should be handled through service details, job milestones, provider capabilities, and optional service extensions.

## 9. Mobile Laundry MVP Business Model

Mobile laundry allows a customer to request laundry service from the mobile app. A nominated provider collects the laundry from the customer's address, washes it, dries it, folds or irons it depending on the selected package, and delivers it back to the customer.

### 9.1 Customer Value Proposition

- Convenient door-to-door laundry service.
- No need for customers to visit a laundromat.
- Transparent pricing and turnaround time.
- Collection and delivery tracking.
- Provider accountability through ratings and support.

### 9.2 MVP Laundry Service Types

The MVP should support simple laundry packages:

- **Wash and fold:** Collection, washing, drying, folding, and delivery.
- **Wash and iron:** Collection, washing, drying, ironing, and delivery.
- **Ironing only:** Collection, ironing, and delivery.
- **Bedding laundry:** Sheets, duvet covers, pillowcases, and blankets.
- **Express laundry:** Faster turnaround at a premium price.

Dry cleaning may be excluded from MVP unless a verified provider is specifically approved for it.

### 9.3 Laundry Booking Flow

1. Customer selects `Mobile Laundry`.
2. Customer selects package type.
3. Customer enters pickup and delivery address.
4. Customer selects pickup date and time window.
5. Customer selects estimated laundry quantity.
6. System shows estimated price.
7. Customer confirms and pays.
8. Admin or system assigns a nominated laundry provider.
9. Provider accepts the job.
10. Provider collects laundry and marks it as `Collected`.
11. Provider records actual weight or item count.
12. If actual quantity changes the price, the system requests customer approval for price adjustment.
13. Provider washes, dries, folds or irons the laundry.
14. Provider marks laundry as `ReadyForDelivery`.
15. Provider delivers laundry back to customer.
16. Customer confirms delivery and rates the service.

### 9.4 Laundry Job Statuses

Laundry bookings should support these additional statuses or milestones:

- `AwaitingCollection`
- `ProviderEnRouteForCollection`
- `Collected`
- `ReceivedAtLaundryFacility`
- `Washing`
- `Drying`
- `Ironing`
- `Packed`
- `ReadyForDelivery`
- `OutForDelivery`
- `Delivered`
- `DeliveryConfirmed`

### 9.5 Laundry Pricing Model

MVP pricing should be simple and configurable:

- Fixed package price for small standard loads.
- Price per kilogram for larger loads.
- Additional fee for ironing.
- Additional fee for bedding or bulky items.
- Express turnaround surcharge.
- Collection and delivery fee, optional.

Recommended MVP approach:

```text
Estimated Price = Base Package Price + Estimated Weight Charge + Add-ons + Delivery Fee
Final Price = Actual Weight Charge + Add-ons + Delivery Fee
```

The system should support post-collection price adjustment if actual laundry weight differs from the customer estimate.

### 9.6 Laundry Provider Requirements

Laundry providers must declare:

- Laundry service areas.
- Collection and delivery capacity.
- Daily kilogram capacity.
- Turnaround time.
- Services offered.
- Whether ironing is supported.
- Whether bedding and bulky items are supported.
- Whether express service is supported.

### 9.7 Laundry MVP Constraints

For MVP:

- The customer should pay upfront based on estimated quantity.
- Price adjustments should be approved before delivery where required.
- The provider should upload collection and delivery evidence where necessary.
- Live tracking is optional.
- Barcode or bag tagging can be deferred to a later phase.

## 10. Mobile Car Wash MVP Business Model

Mobile car wash allows a customer to request a car wash from the app. A nominated provider travels to the customer's residence or selected address and washes the vehicle on-site.

### 10.1 Customer Value Proposition

- Car wash at home without visiting a car wash site.
- Scheduled time slot.
- Transparent package pricing.
- Provider accountability through ratings and support.
- Optional add-ons such as interior cleaning or polish.

### 10.2 MVP Car Wash Service Types

The MVP should support simple packages:

- **Exterior wash:** Body wash, rinse, and dry.
- **Interior and exterior wash:** Exterior wash plus vacuum and interior wipe-down.
- **Premium wash:** Interior and exterior wash plus tyre shine and dashboard treatment.
- **Fleet or multi-car wash:** Multiple vehicles at one address.

### 10.3 Car Wash Booking Flow

1. Customer selects `Mobile Car Wash`.
2. Customer selects vehicle type and package.
3. Customer enters service address.
4. Customer selects date and time window.
5. Customer adds vehicle details.
6. System calculates price.
7. Customer confirms and pays.
8. Admin or system assigns a nominated car wash provider.
9. Provider accepts the job.
10. Provider travels to customer residence.
11. Provider checks in on arrival.
12. Provider washes the vehicle.
13. Provider uploads completion photo if required.
14. Customer confirms completion and rates the service.

### 10.4 Car Wash Job Statuses

Car wash bookings should support these additional statuses or milestones:

- `ProviderAssigned`
- `ProviderEnRoute`
- `Arrived`
- `InProgress`
- `Completed`
- `CustomerConfirmed`

### 10.5 Car Wash Pricing Model

MVP pricing should be package-based:

- Package price by vehicle type.
- Add-ons for interior cleaning, engine bay cleaning, polish, wax, or tyre shine.
- Multi-vehicle discount.
- Travel surcharge for selected zones, optional.

Example:

```text
Final Price = Package Price + Add-ons + Travel Surcharge - Multi-Car Discount
```

### 10.6 Car Wash Provider Requirements

Car wash providers must declare:

- Service areas.
- Available time slots.
- Supported vehicle types.
- Packages offered.
- Whether waterless wash is supported.
- Whether provider brings own water and equipment.
- Maximum vehicles per time slot.

### 10.7 Car Wash MVP Constraints

For MVP:

- The service should be residence-based or address-based.
- Provider must bring required tools and consumables unless otherwise stated.
- Customer must provide parking or access instructions.
- Weather-related cancellation and rescheduling rules should be supported.
- Live tracking is optional.

## 11. Marketplace Provider Onboarding

Independent cleaning companies must be able to apply to join CleanConnect Africa.

Provider onboarding fields:

- Company name
- Company registration number
- Tax number
- Contact person
- Email address
- Phone number
- Business address
- Service areas
- Services offered
- Staff count
- Operating hours
- Banking details
- Insurance documents
- Company registration documents
- Tax compliance documents
- References
- Preferred membership plan

Provider statuses:

- `ApplicationStarted`
- `Submitted`
- `PendingJoiningFee`
- `JoiningFeePaid`
- `UnderReview`
- `Approved`
- `Rejected`
- `Suspended`
- `Inactive`

Provider onboarding flow:

1. Provider creates an account.
2. Provider enters company and contact details.
3. Provider uploads verification documents.
4. System calculates the joining fee.
5. Provider pays the joining fee.
6. Payment gateway confirms payment.
7. Provider status changes to `JoiningFeePaid`.
8. CleanConnect admin reviews the application.
9. Admin approves or rejects the provider.
10. Approved provider becomes eligible to receive bookings.

## 12. Joining Fee Requirements

CleanConnect Africa must be able to charge independent cleaning companies a joining fee before or during onboarding.

Supported joining fee models:

- Once-off joining fee
- Recurring monthly or annual membership fee
- Tiered joining fee by provider size, city, service category, or plan
- Promotional, discounted, waived, or deferred joining fee

Joining fee statuses:

- `NotRequired`
- `Pending`
- `Paid`
- `Failed`
- `Waived`
- `Refunded`
- `Overdue`

The system must support:

- Configurable fee amount
- Currency, default `ZAR`
- Due date
- Payment status
- Gateway reference
- Admin waiver
- Admin refund
- Receipts
- Invoices

## 13. Commission Requirements

CleanConnect Africa must charge a percentage commission on every completed marketplace booking.

Commission formula:

```text
Commission Amount = Booking Gross Amount × Provider Commission Rate
Provider Net Amount = Booking Gross Amount - Commission Amount - Adjustments
```

Example:

```text
Booking amount: R1,000.00
Provider commission rate: 15%
CleanConnect commission: R150.00
Provider net earning: R850.00
```

Commission configuration priority:

1. Provider-specific commission rate
2. Contract or negotiated rate
3. Service-category rate
4. City or regional rate
5. Global default rate

Commission records must be created when provider bookings are completed and must be used during provider payout generation.

## 14. Provider Payouts

Provider payouts should deduct CleanConnect commission and applicable adjustments.

Payout formula:

```text
Gross Amount = Sum of completed provider booking values
Commission Amount = Sum of CleanConnect commissions
Adjustments = Refunds + penalties + bonuses + manual corrections
Net Amount = Gross Amount - Commission Amount - Adjustments
```

Payout statuses:

- `Pending`
- `Approved`
- `Processing`
- `Paid`
- `Failed`
- `OnHold`

Payout rules:

- Include only completed bookings.
- Include only paid bookings.
- Exclude disputed bookings unless manually approved.
- Do not include commission records already paid out.
- Apply refund and adjustment rules before final payout.

## 15. REST API Requirements

### Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

### Services

```http
GET /api/v1/services
GET /api/v1/services/{serviceId}
GET /api/v1/services/{serviceId}/availability
```

### Bookings

```http
POST /api/v1/bookings
GET /api/v1/bookings/{bookingId}
GET /api/v1/customers/me/bookings
POST /api/v1/bookings/{bookingId}/cancel
POST /api/v1/bookings/{bookingId}/reschedule
```

### Mobile Laundry

```http
POST /api/v1/laundry/bookings
GET /api/v1/laundry/bookings/{bookingId}
POST /api/v1/laundry/bookings/{bookingId}/collect
POST /api/v1/laundry/bookings/{bookingId}/update-actual-weight
POST /api/v1/laundry/bookings/{bookingId}/ready-for-delivery
POST /api/v1/laundry/bookings/{bookingId}/deliver
```

### Mobile Car Wash

```http
POST /api/v1/car-wash/bookings
GET /api/v1/car-wash/bookings/{bookingId}
POST /api/v1/car-wash/bookings/{bookingId}/arrive
POST /api/v1/car-wash/bookings/{bookingId}/start
POST /api/v1/car-wash/bookings/{bookingId}/complete
```

### Cleaner Jobs

```http
GET /api/v1/cleaner/jobs
GET /api/v1/cleaner/jobs/{jobId}
POST /api/v1/cleaner/jobs/{jobId}/check-in
POST /api/v1/cleaner/jobs/{jobId}/check-out
POST /api/v1/cleaner/jobs/{jobId}/complete
```

### Provider Onboarding

```http
POST /api/v1/providers/apply
GET /api/v1/providers/me
PATCH /api/v1/providers/me
POST /api/v1/providers/me/documents
GET /api/v1/providers/me/onboarding-status
```

### Provider Joining Fee

```http
POST /api/v1/providers/me/joining-fee/initiate-payment
GET /api/v1/providers/me/joining-fee
POST /api/v1/admin/providers/{providerId}/joining-fee/waive
POST /api/v1/admin/providers/{providerId}/joining-fee/refund
```

### Provider Commission and Payouts

```http
GET /api/v1/providers/me/commissions
GET /api/v1/providers/me/payouts
GET /api/v1/admin/providers/{providerId}/commissions
PATCH /api/v1/admin/providers/{providerId}/commission-rate
POST /api/v1/admin/providers/{providerId}/payouts/generate
POST /api/v1/admin/providers/{providerId}/payouts/{payoutId}/approve
```

## 16. Database Model Summary

Core entities:

- `User`
- `CustomerProfile`
- `Address`
- `Service`
- `Booking`
- `Assignment`
- `CleanerProfile`
- `Provider`
- `Checklist`
- `ChecklistItem`
- `JobCompletion`
- `Payment`
- `Review`
- `Payout`
- `LaundryJobDetail`
- `CarWashJobDetail`
- `ServiceMilestone`

Marketplace financial entities to include:

- `ProviderJoiningFeePayment`
- `ProviderCommission`
- `ProviderMembershipPlan`

Service extension entities to include:

- `LaundryJobDetail`
- `CarWashJobDetail`
- `ServiceMilestone`

Laundry job fields should include:

- `bookingId`
- `packageType`
- `estimatedWeightKg`
- `actualWeightKg`
- `pickupWindowStart`
- `pickupWindowEnd`
- `deliveryWindowStart`
- `deliveryWindowEnd`
- `laundryStatus`
- `requiresIroning`
- `requiresExpressTurnaround`
- `collectionConfirmedAt`
- `deliveryConfirmedAt`

Car wash job fields should include:

- `bookingId`
- `vehicleType`
- `vehicleMake`
- `vehicleModel`
- `registrationNumber`
- `packageType`
- `numberOfVehicles`
- `requiresInteriorCleaning`
- `requiresWax`
- `providerArrivedAt`
- `completedAt`

Provider fields should include:

- `commissionRate`
- `joiningFeeStatus`
- `joiningFeeAmount`
- `joiningFeePaidAt`
- `membershipPlanId`
- `isEligibleForBookings`

Payout fields should include:

- `grossAmount`
- `commissionAmount`
- `joiningFeeDeductionAmount`
- `adjustmentAmount`
- `netAmount`

## 17. Security and Compliance

The platform must implement:

- JWT authentication
- Role-based authorization
- Secure password hashing
- Admin MFA recommended
- Payment webhook validation
- Audit logging
- Encrypted sensitive data
- Secure document storage
- POPIA compliance
- PCI-DSS compliant payment gateway usage

CleanConnect Africa should not store raw card details.

## 18. MVP Scope

MVP should include:

- .NET 10 REST API
- PostgreSQL database
- EF Core models and migrations
- React Native customer and cleaner workflows
- React admin portal
- Customer registration and login
- Service listing
- Mobile laundry booking flow
- Mobile laundry collection and delivery milestones
- Mobile car wash booking flow
- Mobile car wash provider arrival and completion milestones
- Booking creation
- Payment initiation
- Admin booking dashboard
- Manual cleaner assignment
- Cleaner check-in and check-out
- Customer ratings
- Provider application model prepared for marketplace expansion
- Joining fee and commission model in the database design

## 19. Roadmap

### Phase 1: Internal Operations MVP

- Internal CleanConnect staff
- Residential bookings
- Mobile laundry MVP
- Mobile car wash MVP
- Manual assignment
- Basic payments
- Basic notifications

### Phase 2: Operational Optimization

- Recurring bookings
- Cleaner availability
- Scheduling tools
- Supervisor audits
- Commercial client support

### Phase 3: Marketplace Foundation

- Provider onboarding
- Joining fee payments
- Provider verification
- Provider commission tracking
- Provider payouts
- Provider capabilities by service category

### Phase 4: Automated Marketplace Scaling

- Automated provider matching
- Dynamic pricing
- Route optimization
- Advanced analytics
- Multi-city expansion

## 20. Acceptance Criteria

The provider marketplace model is complete when:

- A cleaning company can apply to join the platform.
- The system can generate a joining fee invoice.
- A provider can pay the joining fee online.
- Payment webhooks can confirm joining fee payment.
- Admin can approve, reject, suspend, or reactivate providers.
- Approved providers can receive bookings.
- The system calculates commission for every completed provider booking.
- Provider payout calculations deduct commission correctly.
- Providers can view commission deductions and payouts.
- Admin can configure joining fees and commission rates.

The mobile laundry MVP is complete when:

- A customer can request laundry collection from the app.
- The system can assign a nominated laundry provider.
- The provider can mark laundry as collected, washed, ready for delivery, and delivered.
- The system can handle estimated and actual laundry quantity.
- The customer can confirm delivery and rate the provider.
- Provider commission is calculated on completed laundry bookings.

The mobile car wash MVP is complete when:

- A customer can request a car wash at their residence.
- The system can assign a nominated car wash provider.
- The provider can mark arrival, start, and completion.
- The customer can confirm completion and rate the provider.
- Provider commission is calculated on completed car wash bookings.
