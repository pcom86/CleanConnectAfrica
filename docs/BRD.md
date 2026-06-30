# CleanConnect Africa — Business Requirements Document (BRD)

**Document Version:** 1.0  
**Date:** June 2026  
**Status:** Living Document  
**Classification:** Internal — Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Problem Statement](#2-business-context--problem-statement)
3. [Vision & Mission](#3-vision--mission)
4. [Stakeholders](#4-stakeholders)
5. [Platform Roles](#5-platform-roles)
6. [Completed Features](#6-completed-features)
   - [6.15 Feature Completion Matrix](#615-feature-completion-matrix)
7. [Roadmap — Future Features](#7-roadmap--future-features)
8. [Go-to-Market Strategy](#8-go-to-market-strategy)
9. [Technical Specification](#9-technical-specification)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Glossary](#12-glossary)

---

## 1. Executive Summary

CleanConnect Africa is a South African technology-enabled home and facility services marketplace. It connects residential, hospitality, and commercial customers with vetted professional service providers across cleaning, laundry, car wash, and pest control service categories.

The platform operates a two-sided marketplace:
- **Customers** book once-off or recurring services via the web dashboard.
- **Providers** (independent service companies) register, pay a joining fee, and receive bookings from the marketplace, remitting a commission percentage to CleanConnect Africa on every completed booking.

The platform is built on a .NET 10 API backend with a Next.js / React TypeScript frontend, targeting South Africa initially with a vision to expand across sub-Saharan Africa.

---

## 2. Business Context & Problem Statement

### The Problem

South African households and businesses face three persistent pain points when sourcing home and facility services:

1. **Trust & Vetting** — No reliable way to verify cleaner credentials, insurance, or past performance.
2. **Booking Friction** — Service providers are found through word-of-mouth, WhatsApp, or unstructured online listings with no booking management, tracking, or payment infrastructure.
3. **Operational Gaps for Providers** — Small cleaning businesses lack tools to manage staff, track jobs, handle payments, and grow their customer base efficiently.

### The Opportunity

South Africa's home services market is largely informal and fragmented. There is a significant and growing middle-class demand for reliable, on-demand services. The R-denominated market represents a multi-billion-rand opportunity, with comparable models (e.g. SweepSouth, Uber for X) demonstrating strong demand-supply matching appetite.

---

## 3. Vision & Mission

| | |
|---|---|
| **Vision** | To become sub-Saharan Africa's most trusted platform for home and facility services. |
| **Mission** | Connect customers with quality-vetted service professionals through technology that makes booking, tracking, and payment effortless for both sides of the market. |

### Strategic Goals

- Achieve 500+ active provider businesses within 24 months of launch.
- Process 10,000+ bookings per month by end of Year 2.
- Expand to 3 metro areas (Johannesburg, Cape Town, Durban) within 18 months.
- Maintain a customer satisfaction score (CSAT) of ≥ 4.2 / 5.0.

---

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| **Residential Customers** | Easy, reliable booking of home services |
| **Business / Hospitality Customers** | Recurring multi-site service management |
| **Provider Owners** | Steady stream of bookings and tools to manage their team |
| **Provider Staff / Cleaners** | Clear job assignments and operational tools |
| **Supervisors** | Oversight of field teams and quality assurance |
| **CleanConnect Admin** | Platform governance, provider approvals, revenue tracking |
| **Finance Manager** | Payout management, commission tracking, financial reporting |
| **Operations Manager** | Booking oversight, provider performance monitoring |

---

## 5. Platform Roles

The platform supports 9 distinct user roles:

| Role | Description |
|---|---|
| `Customer` | Residential customer booking services for personal use |
| `BusinessCustomer` | Commercial or hospitality customer managing multi-property bookings |
| `ProviderOwner` | Owner of a registered provider company — manages bookings, staff, and payouts |
| `ProviderStaff` | Field staff employed by a provider (cleaners, washers, drivers) |
| `Cleaner` | Internal CleanConnect cleaner (direct employment) |
| `Supervisor` | Oversees field teams and performs quality checks |
| `Admin` | Full platform governance and configuration access |
| `OperationsManager` | Booking and provider operational oversight |
| `FinanceManager` | Financial reporting, commission management, payout approval |

---

## 6. Completed Features

### 6.1 Authentication & User Management ✅

- User registration (Customer, BusinessCustomer, ProviderOwner).
- Login with JWT-based authentication.
- Password hashing and secure credential storage.
- Role-based access control across all API endpoints.
- Forced password change on first login (`MustChangePassword` flag).
- Account status lifecycle: Active, Inactive, Suspended, Deleted.
- User profile editing (name, phone, email).
- Customer profile creation (Residential, Hospitality, Commercial types).
- **Face Verification during onboarding** — all users (customers and provider owners) must complete a live selfie capture as part of registration. The browser's `getUserMedia` API streams a live camera feed with a face-guide overlay. The user captures a photo, reviews it, and confirms before proceeding. Camera permissions are gracefully handled with an inline error state. (Third-party liveness API integration is Phase 2 — see Section 7.)

### 6.2 Service Catalogue ✅

Four service categories are live and seeded at startup:

| Service | Category | Base Price | Duration |
|---|---|---|---|
| Standard Home Cleaning | Cleaning | R450 | 120 min |
| Deep Spring Cleaning | Cleaning | R950 | 240 min |
| Wash, Dry & Fold | Laundry | R180 | 180 min |
| Premium Car Wash | Car Wash | R250 | 45 min |
| Pest Control Service | Pest Control | R600 | 90 min |

- Services are configurable with base price, estimated duration, and required cleaner count.
- Services can be activated / deactivated by admins.
- Each service maps to a `ServiceCategory` enum (Cleaning, Laundry, CarWash, PestControl).

### 6.2a Identity Verification Flow ✅

**Customer registration (5 steps):**
1. Account details (name, email, phone, role, password)
2. Physical address
3. SA ID number (13-digit format, validated client-side; mock backend check)
4. **Live face / selfie capture** — camera stream → photo capture → confirm or retake → proceed
5. Review & submit

The submit button on Step 5 is disabled until both `idVerified` and `livenessVerified` flags are set, preventing account creation without completing verification.

**Provider onboarding (6 steps):**
1. Business details & membership plan
2. Services offered
3. Location & coverage / service radius
4. **Live face / selfie capture** — same camera flow as customer registration
5. Company registration verification (CIPC mock; real integration Phase 2)
6. Joining fee payment (Ozow EFT mock; real integration Phase 2)

---

### 6.3 Booking System ✅

**Customer-facing:**
- Create single-service or **multi-service bookings** (combo bookings via `BookingService` join entity).
- Book from a saved address or enter a one-time address inline.
- Specify scheduling, special instructions, access notes, pet information, and parking details.
- Recurring booking support with Weekly, BiWeekly, and Monthly frequencies, grouped by `RecurrenceGroupId`.
- View all booking history with status, price, and service details.
- Booking calendar view showing all bookings across the month.
- Real-time booking status notifications (in-app notification bell with unread count).

**Booking Status Lifecycle:**

```
Draft → PendingPayment → Confirmed → Assigned → CleanerEnRoute
  → InProgress → Completed
                         ↓
               Cancelled / Failed / Disputed / Refunded
```

**Provider-facing:**
- View all available bookings filtered by service category and geographical radius.
- Toggle to show bookings outside the provider's service radius.
- Accept bookings (single or all-in-series scope).
- View accepted / assigned bookings on a calendar.
- Booking detail page with full customer and service information.
- Live distance display (haversine calculation from provider base to booking address).

### 6.4 Provider Marketplace ✅

- Provider registration with company name, registration number, tax number.
- Multi-category capability (a single provider can offer Cleaning, Car Wash, Pest Control, etc.).
- Service radius configuration (default 10 km).
- Geographical filtering of available bookings by provider's coordinates + service radius.
- Joining fee workflow: pending → paid → waived, tracked per provider.
- Membership plan selection:
  - **Starter** — R500 joining fee, 10% commission, no recurring fee.
  - **Professional** — R1,000 joining fee, 8% commission, R299/month recurring.
- Provider status lifecycle: ApplicationStarted → Submitted → PendingJoiningFee → JoiningFeePaid → UnderReview → Approved → Rejected / Suspended / Inactive.
- `IsEligibleForBookings` flag gating marketplace access.
- Commission tracking per booking (gross amount, commission rate, net amount, status).
- Payout records with period start/end, deductions, net payout, and status.

### 6.5 Provider Staff Management ✅

- ProviderOwner can create and manage cleaner profiles under their company.
- Staff roles: Cleaner, Washer, Driver, Supervisor.
- Employment types: Internal Staff, Contractor, Provider Staff.
- Supervisor profiles for field team oversight.
- Team management dashboard for ProviderOwner users.

### 6.6 Job Operations ✅

- **Service Milestones** — timestamped audit trail of every status change on a booking.
- **Job Check-In / Check-Out** — GPS coordinates, photo capture (JSON array of URLs), and notes recorded on arrival and departure.
- **Cleaning Job Details** — cleaning type, room count, square metres, before/after photos, team dispatch and arrival times.
- **Laundry Job Details** — package type, estimated / actual weight, pickup/delivery windows, ironing and express options, full `LaundryStatus` tracking (12 states from `AwaitingCollection` → `DeliveryConfirmed`).
- **Car Wash Job Details** — vehicle type, make, model, registration, number of vehicles, interior cleaning and wax options, `CarWashStatus` tracking (6 states).
- **Job Completion Record** — check-in/out timestamps, completed checklist items, photos, cleaner notes, customer signature URL.
- **Post-Job Reports** — summary, issues found, recommendations, overall rating, before/after photo arrays.
- **Checklists** — service-linked task lists with required items and sort ordering.

### 6.7 Payments ✅

- Payment records linked to bookings: amount, currency (ZAR), payment method, gateway reference, status.
- Pay Onsite option — bookings flagged for cash/on-site payment displayed distinctly.
- Payment status lifecycle: Pending → Authorized → Paid → Failed → Refunded / PartiallyRefunded.
- Joining fee payment records with invoice numbers, due dates, waiver tracking.

### 6.8 Reviews ✅

- Customer reviews linked to bookings, targeting a cleaner profile or a provider.
- Star rating (1–5) and free-text comment.
- Rating aggregation on provider and cleaner profiles.

### 6.9 Notifications ✅

- In-app notification system for customers.
- Notifications generated automatically on booking status changes.
- Unread notification count displayed on the dashboard bell icon.
- Mark individual or all notifications as read.
- Notifications linked to specific bookings for deep linking.

### 6.10 Admin Portal ✅

- Admin dashboard with user management (list, create, update, roles, status).
- Business profile administration.
- Membership plan management (CRUD).
- Provider approval workflows accessible to Admin role.

### 6.11 Customer Booking Request Flow ✅

- Customers can raise a **Cleaning Request** (preferred date/time/service/address) without an immediate booking.
- Platform notifies eligible providers.
- Providers respond (Accept / Reject / Expire).
- Accepted request converts to a confirmed booking.
- Full request status lifecycle: Requested → ProvidersNotified → Accepted → Rejected / Cancelled / Expired.

### 6.12 Provider Business Profile ✅

- ProviderOwner can set up a full business profile: company name, service categories, base location, service radius.
- Business profile status displayed on provider dashboard.
- Business profile setup wizard (`/setup-business` route) before marketplace access is granted.

### 6.13 Booking Payment Page ✅

- Dedicated `/dashboard/payment` route for processing booking payments.
- Booking confirmation page (`/dashboard/booking-confirmation`).

### 6.14 Booking Reports ✅

- Post-job report view accessible at `/dashboard/booking-report`.
- Supervisor report compilation with photo galleries and checklist results.

---

### 6.15 Feature Completion Matrix

The table below lists every feature across all phases with its current implementation status.

**Legend:**

| Icon | Meaning |
|---|---|
| ✅ **Complete** | Fully implemented — backend, frontend, and (where applicable) integration |
| ⚠️ **Partial** | Core functionality built; one or more layers use a mock, stub, or limited UI |
| 🔧 **Backend Only** | API endpoints and data model implemented; no frontend UI yet |
| 📋 **Planned** | On the roadmap — not yet started |

---

| # | Feature | Backend | Frontend | Integration | Status |
|---|---|:---:|:---:|:---:|---|
| 1 | User Registration & Authentication | ✅ | ✅ | ✅ | ✅ Complete |
| 2 | SA ID Number Verification | ✅ | ✅ | ⚠️ | ⚠️ Partial — client-side format validation done; backend ID check mocked |
| 3 | Face / Selfie Verification | ✅ | ✅ | ⚠️ | ⚠️ Partial — live `getUserMedia` camera UI complete; third-party liveness API Phase 2 |
| 4 | Service Catalogue | ✅ | ✅ | N/A | ✅ Complete |
| 5 | Single-Service Bookings | ✅ | ✅ | N/A | ✅ Complete |
| 6 | Multi-Service (Combo) Bookings | ✅ | ✅ | N/A | ✅ Complete |
| 7 | Recurring Bookings | ✅ | ✅ | N/A | ✅ Complete |
| 8 | Booking Calendar View | ✅ | ✅ | N/A | ✅ Complete |
| 9 | Provider Marketplace (Available Bookings) | ✅ | ✅ | N/A | ✅ Complete |
| 10 | Provider Onboarding Wizard | ✅ | ✅ | ⚠️ | ⚠️ Partial — CIPC company check and Ozow payment mocked |
| 11 | Provider Staff Management | ✅ | ⚠️ | N/A | ⚠️ Partial — full API done; dashboard UI is basic |
| 12 | Job Check-In / Check-Out | ✅ | ❌ | N/A | 🔧 Backend Only |
| 13 | Cleaning / Laundry / Car Wash Job Details | ✅ | ❌ | N/A | 🔧 Backend Only |
| 14 | Checklists & Job Completion Records | ✅ | ❌ | N/A | 🔧 Backend Only |
| 15 | Payment Records & Lifecycle | ✅ | ⚠️ | ❌ | ⚠️ Partial — data model and status lifecycle done; no live payment gateway |
| 16 | Provider Commission & Payouts | ✅ | ❌ | ❌ | 🔧 Backend Only |
| 17 | Reviews & Ratings | ✅ | ❌ | N/A | 🔧 Backend Only — entity, API, and aggregation done; no submission UI |
| 18 | In-App Notifications | ✅ | ✅ | N/A | ✅ Complete |
| 19 | Admin Portal | ✅ | ✅ | N/A | ✅ Complete |
| 20 | Booking Request Flow | ✅ | ❌ | N/A | 🔧 Backend Only — full API and status lifecycle done; no customer UI |
| 21 | Provider Business Profile Setup | ✅ | ✅ | N/A | ✅ Complete |
| 22 | Booking Payment Page | ✅ | ✅ | ⚠️ | ⚠️ Partial — route and UI exist; gateway integration mocked |
| 23 | Post-Job Reports | ✅ | ⚠️ | N/A | ⚠️ Partial — report viewer route exists; supervisor compilation UI limited |
| 24 | Payment Gateway Integration | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 25 | Liveness API Integration (Face Match) | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 26 | Mobile App (React Native) | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 27 | Push Notifications (Firebase FCM) | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 28 | Provider Payout Automation | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 29 | Review & Rating Submission UI | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 30 | Address Geocoding | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 31 | Booking Recurrence Management UI | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 32 | Real-Time Job Tracking (GPS / SignalR) | ❌ | ❌ | ❌ | 📋 Planned — Phase 3 |
| 33 | Customer Mobile Wallet | ❌ | ❌ | ❌ | 📋 Planned — Phase 3 |
| 34 | Dynamic Pricing Engine | ❌ | ❌ | N/A | 📋 Planned — Phase 3 |
| 35 | B2B / Hospitality Dashboard | ❌ | ❌ | N/A | 📋 Planned — Phase 3 |
| 36 | Supplier / Consumables Module | ❌ | ❌ | N/A | 📋 Planned — Phase 3 |
| 37 | Automated Checklist Scoring (AI/ML) | ❌ | ❌ | ❌ | 📋 Planned — Phase 3 |
| 38 | WhatsApp Booking Bot | ❌ | ❌ | ❌ | 📋 Planned — Phase 3 |
| 39 | Multi-Country Expansion | ❌ | ❌ | ❌ | 📋 Planned — Phase 4 |
| 40 | Franchise / White-Label Portal | ❌ | ❌ | N/A | 📋 Planned — Phase 4 |
| 41 | AI Route Optimisation | ❌ | ❌ | ❌ | 📋 Planned — Phase 4 |
| 42 | Carbon Footprint Tracking | ❌ | ❌ | N/A | 📋 Planned — Phase 4 |
| 43 | Marketplace Advertising | ❌ | ❌ | N/A | 📋 Planned — Phase 4 |
| 44 | Employee Vetting | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 45 | Staff Images | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 46 | Dispatched Vehicle Details | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 47 | Blacklist / Block / Suspend Companies | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 48 | Area Availability Check | ❌ | ❌ | ❌ | 📋 Planned — Phase 2 |
| 49 | Bundle Service Discounts | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |
| 50 | Service Catalog — Full Listing & Pricing | ✅ | ❌ | N/A | 🔧 Backend Only — seeded data exists; no customer-facing catalog page |
| 51 | Provider Whitelist / Direct Booking | ❌ | ❌ | N/A | 📋 Planned — Phase 2 |

**Summary:**

| Status | Count | Share |
|---|---|---|
| ✅ Complete | 10 | 20% |
| ⚠️ Partial | 7 | 14% |
| 🔧 Backend Only | 7 | 14% |
| 📋 Planned | 27 | 53% |
| **Total** | **51** | |

> **MVP Delivery Status:** 23 of 43 features (53%) have at least partial implementation. 10 features (23%) are fully complete end-to-end. The primary gaps before commercial launch are: payment gateway, live liveness/face-match API, review submission UI, and job operations frontend (check-in/out, checklists).

---

## 7. Roadmap — Future Features

### Phase 2 — Q3 2026

| Feature | Priority | Description |
|---|---|---|
| **Payment Gateway Integration** | High | Integrate PayFast or Peach Payments for card, EFT, and instant EFT. Real-time payment confirmation webhooks. |
| **Liveness API Integration** | High | Replace selfie capture with a verified liveness + face-match check via Smile Identity, Onfido, or similar (SA-compliant). Store verification reference and status on the `User` record. |
| **Mobile App (React Native)** | High | Native iOS and Android app for customers and providers. |
| **Push Notifications** | High | Firebase Cloud Messaging for real-time booking alerts to mobile devices. |
| **Provider Payout Automation** | High | Automated weekly/monthly payout calculations and bank transfer initiation. |
| **Review & Rating System — UI** | Medium | Customer-facing review submission form post-job. Provider and cleaner public profiles with aggregate ratings. |
| **Address Geocoding** | Medium | Auto-populate latitude/longitude on address save using Google Maps Geocoding API. |
| **Booking Recurrence UI** | Medium | Full recurring booking management — pause, cancel single occurrence, cancel series. |
| **Employee Vetting** | High | Background check workflow for cleaners and provider staff. Status tracking: `NotVetted` → `InProgress` → `Vetted` / `Failed`. Integration with MIE or Afiswitch. |
| **Staff Images** | Medium | Upload and display staff profile photos. Store as CDN / blob URLs on `CleanerProfile` and `SupervisorProfile`. |
| **Dispatched Vehicle Details** | Medium | Track vehicle make, model, registration, and colour assigned to a dispatched team. Display to customer in booking details. |
| **Blacklist / Block / Suspend Companies** | High | Admin and customer ability to blacklist providers. Blocked providers are excluded from marketplace and search results. |
| **Area Availability Check** | High | Customer enters address before booking; platform returns whether any provider covers that area (within service radius). |
| **Bundle Service Discounts** | Medium | Automatic discount calculation when a customer books 2+ services in one combo booking. Configurable discount % per bundle in admin. |
| **Provider Whitelist / Direct Booking** | Medium | Customers can save favourite providers to a whitelist and re-book them directly without marketplace search. |
| **Service Catalog Page** | Medium | Public, customer-facing service listing page with full descriptions, pricing, and estimated durations. |

### Phase 3 — Q4 2026

| Feature | Priority | Description |
|---|---|---|
| **Real-Time Job Tracking** | High | Live GPS tracking of en-route cleaner on a map. SignalR / WebSocket push to customer. |
| **Customer Mobile Wallet** | Medium | Store card details and allow one-click re-booking. |
| **Dynamic Pricing Engine** | Medium | Surge pricing during peak demand, discount logic for recurring customers. |
| **B2B / Hospitality Dashboard** | Medium | Multi-property management for hotels and guesthouses with bulk booking and reporting. |
| **Supplier / Consumables Module** | Low | Track cleaning product inventory for internal teams. |
| **Automated Checklist Scoring** | Medium | Machine-learning-assisted quality scoring from post-job photo analysis. |
| **WhatsApp Booking Bot** | Medium | Allow booking via WhatsApp using a chatbot integrated with the booking API. |

### Phase 4 — 2027+

| Feature | Priority | Description |
|---|---|---|
| **Multi-Country Expansion** | High | Localisation for Zimbabwe, Zambia, Kenya, Nigeria (currency, language, compliance). |
| **Franchise / White-Label Portal** | Medium | Allow large cleaning companies to white-label the platform. |
| **AI Route Optimisation** | Medium | Optimise multi-job assignment routing for provider fleets. |
| **Carbon Footprint Tracking** | Low | Eco-cleaning product tracking and carbon footprint reporting per booking. |
| **Marketplace Advertising** | Low | Promoted provider listings and featured service slots. |

---

## 8. Go-to-Market Strategy

### 8.1 Target Market

**Primary:**
- Gauteng-based residential homeowners and renters in LSM 7–10 (middle to upper income).
- Airbnb / short-stay hosts requiring consistent turnaround cleaning.

**Secondary:**
- SME offices (5–50 employees) needing regular cleaning without a full-time employee.
- Car dealerships, fleet operators, and corporate parking facilities for car wash services.
- Property management companies managing residential complexes.

### 8.2 Revenue Model

| Revenue Stream | Mechanism |
|---|---|
| **Marketplace Commission** | 8–10% of every completed booking (deducted from provider payout) |
| **Provider Joining Fee** | Once-off R500–R1,000 onboarding fee per provider |
| **Professional Subscription** | R299/month recurring fee for Professional plan providers |
| **Featured Listings** | *(Phase 4)* Paid placement for providers in search results |

### 8.3 Launch Strategy — "Warm Market First"

**Pre-Launch (Month 1–2)**

1. **Seed provider supply** — Recruit 20–30 vetted cleaning companies in Sandton, Johannesburg via direct outreach, WhatsApp groups, and existing networks. Waive the joining fee for the first 50 providers.
2. **Build a waitlist** — Landing page with a "Get notified" form. Target 500 waitlist sign-ups via social media (Instagram, Facebook) and referral incentives.
3. **Seed content** — Before/after cleaning photo series, "how it works" videos for both customers and providers.

**Launch (Month 3)**

1. Activate waitlist customers with a **first-booking discount** (R100 off).
2. **PR push** — target South African property and lifestyle media (Property24 editorial, Neighbourhood, Joburg lifestyle blogs).
3. **Facebook / Instagram targeted ads** — Target Sandton, Fourways, Randburg, Rosebank, Midrand homeowners aged 28–50.
4. **Google Ads** — Capture high-intent search: "cleaning service Johannesburg", "car wash at home Sandton", "pest control Johannesburg".

**Growth (Month 4–12)**

1. **Referral programme** — Customers earn R50 credit per referred friend who completes a booking.
2. **Corporate accounts** — Direct sales to property management groups and estate agents for recurring contracts.
3. **Provider acquisition** — Commission any cleaning business owner who refers another provider (R200 credit per approved provider).
4. **Airbnb host targeting** — Partner with Airbnb co-host networks and list on Airbnb's "experiences" ecosystem.
5. **Employer Portals** — Approach HR managers at large corporates to offer CleanConnect as an employee benefit (subsidised home cleaning).

### 8.4 Pricing Strategy

**Customer pricing:**
- Transparent per-service pricing published on the booking form.
- No subscription required for customers.
- Loyalty programme in Phase 3 (credits for recurring bookings).

**Provider pricing:**
- Joining fee (once-off): R500 (Starter) / R1,000 (Professional).
- Commission: 10% (Starter) / 8% (Professional).
- Monthly subscription: R0 (Starter) / R299 (Professional).
- Providers on Professional benefit from lower commission and priority placement.

### 8.5 Key Partnerships

| Partner Type | Examples |
|---|---|
| **Payment** | PayFast, Peach Payments, Ozow (instant EFT) |
| **Mapping / Geocoding** | Google Maps Platform |
| **Push Notifications** | Firebase Cloud Messaging |
| **Background Checks** | MIE (Managed Integrity Evaluation), Afiswitch (fingerprint) |
| **Insurance** | Discovery Insure, Hollard — provider liability cover |
| **Property Portals** | Property24, Private Property — co-marketing |
| **Hospitality** | Airbnb co-host networks, FEDHASA |

### 8.6 KPIs & Success Metrics

| Metric | Target (Month 6) | Target (Month 12) |
|---|---|---|
| Registered providers | 50 | 200 |
| Active (approved) providers | 30 | 150 |
| Monthly bookings | 300 | 2,000 |
| Customer registrations | 500 | 3,000 |
| Monthly GMV (Gross Merchandise Value) | R90,000 | R750,000 |
| Provider NPS | ≥ 40 | ≥ 50 |
| Customer CSAT | ≥ 4.0 / 5.0 | ≥ 4.3 / 5.0 |
| Booking repeat rate | 20% | 40% |

---

## 9. Technical Specification

### 9.1 Architecture Overview

CleanConnect Africa follows **Clean Architecture** with **CQRS** (Command Query Responsibility Segregation) via MediatR.

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend  (Next.js 15 / React / TypeScript / Tailwind CSS) │
│  Admin Portal  (same codebase, /admin routes)                │
└─────────────────────────┬────────────────────────────────────┘
                          │  HTTP REST
┌─────────────────────────▼────────────────────────────────────┐
│  CleanConnect.Api  (.NET 10 Web API)                         │
│  API Versioning (v1) · OpenAPI / Swagger · Scalar UI         │
│  Controllers → MediatR → Application Layer                   │
└──────────┬────────────────────────┬─────────────────────────┘
           │                        │
┌──────────▼──────────┐  ┌──────────▼──────────────────────┐
│ CleanConnect.       │  │ CleanConnect.Infrastructure      │
│ Application         │  │ EF Core · PostgreSQL             │
│ Commands / Queries  │  │ Redis (caching)                  │
│ DTOs / Validators   │  │ Migrations                       │
└─────────────────────┘  └──────────────────────────────────┘
           │
┌──────────▼──────────────────────────────┐
│ CleanConnect.Worker  (.NET Background   │
│ Service — recurring jobs, milestones)   │
└─────────────────────────────────────────┘

Orchestration: .NET Aspire (AppHost)
Observability: OpenTelemetry → Aspire Dashboard
```

### 9.2 Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | .NET 10 (C#) |
| **API style** | REST (versioned via `Asp.Versioning`, default v1) |
| **Architecture** | Clean Architecture + CQRS (MediatR) |
| **ORM** | Entity Framework Core 9 |
| **Database** | PostgreSQL (schema: `cleanconnect`) |
| **Caching** | Redis |
| **Background Jobs** | .NET Worker Service |
| **Orchestration** | .NET Aspire |
| **API Docs** | OpenAPI (Swagger UI + Scalar) |
| **Frontend** | Next.js 15, React, TypeScript |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **State** | React `useState` / `useEffect` (no global store yet) |
| **Auth** | JWT (Bearer token, client-stored in `localStorage`) |
| **Observability** | OpenTelemetry, Aspire Dashboard |

### 9.3 Data Model Summary

**Core Entities:**

| Entity | Purpose |
|---|---|
| `User` | Identity record for every person on the platform |
| `CustomerProfile` | Extended profile for booking customers (Residential / Hospitality / Commercial) |
| `Address` | Saved service location with GPS coordinates |
| `Service` | Catalogue item (name, category, base price, duration, required cleaners) |
| `Booking` | Central booking record linking customer, service, address, and schedule |
| `BookingService` | Join entity enabling multi-service (combo) bookings |
| `Assignment` | Links a booking to a cleaner or provider |
| `Provider` | Registered service company with categories, radius, fee, and membership plan |
| `CleanerProfile` | Field staff profile (skills, zones, rating) |
| `SupervisorProfile` | Supervisor with team oversight capability |
| `ProviderMembershipPlan` | Tiered plans (Starter / Professional) with joining fee and commission rates |
| `Payment` | Payment transaction record |
| `Payout` | Provider net payout record (gross − commission − fees) |
| `ProviderCommission` | Per-booking commission calculation |
| `Review` | Customer rating and comment post-job |
| `Notification` | In-app notification for customers |
| `ServiceMilestone` | Audit trail of booking status changes |
| `JobCompletion` | Checklist completion, photos, and signature |
| `JobCheckIn` / `JobCheckOut` | GPS-tagged on-site arrival and departure records |
| `PostJobReport` | Supervisor-compiled post-job summary |
| `CleaningJobDetail` | Cleaning-specific metadata |
| `LaundryJobDetail` | Laundry workflow tracking (12 status states) |
| `CarWashJobDetail` | Car wash workflow tracking (6 status states) |
| `CleaningRequest` | Pre-booking customer service request with provider invitation workflow |
| `Checklist` / `ChecklistItem` | Service-linked task lists for field quality assurance |

### 9.4 API Endpoint Groups

| Controller | Base Route | Responsibilities |
|---|---|---|
| `AuthController` | `/api/v1/auth` | Login, register |
| `UsersController` | `/api/v1/users` | User CRUD, profile updates |
| `CleaningBookingsController` | `/api/v1/cleaning-bookings` | Create/manage bookings, accept, check-in/out |
| `CustomerBookingsController` | `/api/v1/customer-bookings` | Customer booking queries |
| `ProviderBookingsController` | `/api/v1/provider-bookings` | Provider marketplace and accepted booking queries |
| `CarWashBookingsController` | `/api/v1/carwash-bookings` | Car wash specific booking operations |
| `LaundryBookingsController` | `/api/v1/laundry-bookings` | Laundry specific booking operations |
| `CleaningRequestsController` | `/api/v1/cleaning-requests` | Customer requests and provider response workflow |
| `BusinessProfilesController` | `/api/v1/business-profiles` | Provider business profile setup and management |
| `ProvidersController` | `/api/v1/providers` | Provider CRUD and approval |
| `CleanersController` | `/api/v1/cleaners` | Cleaner profile management |
| `StaffController` | `/api/v1/staff` | Provider staff management |
| `SupervisorsController` | `/api/v1/supervisors` | Supervisor management |
| `ServicesController` | `/api/v1/services` | Service catalogue |
| `NotificationsController` | `/api/v1/notifications` | In-app notifications |
| `PaymentsController` | `/api/v1/payments` | Payment creation and status |
| `MembershipPlansController` | `/api/v1/membership-plans` | Plan listing |
| `AdminController` | `/api/v1/admin` | Admin-only governance operations |

### 9.5 Frontend Route Structure

| Route | Role | Purpose |
|---|---|---|
| `/` | Public | Landing page (service showcase) |
| `/register` | Public | Customer / Provider registration |
| `/login` | Public | Authentication |
| `/setup-business` | ProviderOwner | Business profile setup wizard |
| `/dashboard` | All authenticated | Main dashboard (role-adaptive UI) |
| `/dashboard/provider-booking/[id]` | ProviderOwner | Booking detail + accept action |
| `/dashboard/booking-confirmation` | Customer | Post-booking confirmation screen |
| `/dashboard/payment` | Customer | Payment processing |
| `/dashboard/booking-report` | Supervisor / ProviderOwner | Post-job report viewer |
| `/dashboard/team` | ProviderOwner | Staff management |
| `/dashboard/supervisors` | ProviderOwner | Supervisor management |
| `/dashboard/business-profile` | ProviderOwner | Business profile editing |
| `/admin/dashboard` | Admin | Admin control panel |
| `/admin/users` | Admin | User management |
| `/admin/business-profiles` | Admin | Provider profile administration |
| `/admin/membership-plans` | Admin | Membership plan management |
| `/change-password` | All | Forced password change flow |

### 9.6 Security

- All API routes require a valid Bearer JWT token except `/auth/login` and `/auth/register`.
- Role-based access enforced at controller level.
- Password hashing enforced at rest.
- CORS policy configured to allow frontend origin.
- HTTPS enforced in non-development environments.
- Sensitive IDs use GUIDs (not sequential integers) to prevent enumeration attacks.

### 9.7 Database Migrations

EF Core code-first migrations are applied automatically at startup via `db.Database.Migrate()`. All migrations are tracked in `src/CleanConnect.Infrastructure/Migrations/`.

Key migrations to date:
- Initial schema (users, bookings, providers, services, assignments, payments, reviews, payouts, commissions).
- Laundry and car wash job detail extensions.
- Job check-in / check-out and post-job reports.
- Cleaning requests and provider response workflow.
- Supervisor profiles and staff role enhancements.
- `BookingServices` join table for multi-service combo bookings.

### 9.8 Development Environment

| Component | Detail |
|---|---|
| **Backend** | .NET Aspire AppHost starts API + Worker + PostgreSQL + Redis |
| **PostgreSQL** | Docker container (port configurable in `appsettings.json`) |
| **Frontend** | `next dev` on port 3000 |
| **Seeding** | `seed-all.ps1` PowerShell script — creates users, providers, services, and bookings including multi-service combos |
| **API Docs** | Scalar UI at `/scalar`, Swagger UI at `/swagger` |
| **Startup Script** | `start-dev.ps1` — launches all services, polls for API readiness, then optionally runs seed |

---

## 10. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | 99.5% uptime SLA for production API |
| **Response Time** | API P95 response time < 300 ms for read queries, < 600 ms for write commands |
| **Scalability** | Horizontal scaling of API via container orchestration (Docker / Kubernetes ready via Aspire) |
| **Data Residency** | All data stored within South Africa (POPIA compliance) |
| **Data Privacy** | POPIA-compliant data handling — customer data encrypted at rest, limited data retention periods for deleted accounts |
| **Auditability** | All booking status changes recorded as `ServiceMilestone` events with timestamps |
| **Observability** | Structured logging, distributed tracing via OpenTelemetry, Aspire dashboard for dev |
| **Mobile Responsiveness** | Frontend fully responsive down to 320px viewport width |
| **Browser Support** | Latest 2 versions of Chrome, Firefox, Safari, Edge |
| **Dark Mode** | Full dark / light mode toggle supported across all UI pages |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low provider supply at launch | Medium | High | Waive joining fee for first 50 providers; direct sales team |
| Payment gateway integration delays | Medium | High | Mock payment flow for MVP; parallel integration track |
| Provider no-shows / quality issues | Medium | High | Review system, provider suspension workflow, replacement booking SLA |
| POPIA non-compliance | Low | Very High | Legal review of data handling; privacy policy; DPO appointment |
| Scalability at 10x booking volume | Low | Medium | Stateless API, connection pooling, Redis caching, horizontal scaling |
| Fraud — fake provider registrations | Medium | Medium | Manual admin approval gate, background check integration (Phase 2) |
| Competition from SweepSouth | High | Medium | Differentiate on pest control, car wash, multi-service combos, B2B focus |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **Booking** | A confirmed request from a customer for one or more services at a specific date, time, and address |
| **Combo Booking** | A booking containing two or more services (e.g. Deep Spring Cleaning + Car Wash) |
| **Provider** | An independent registered service company operating on the CleanConnect marketplace |
| **Joining Fee** | A once-off onboarding fee charged to providers for marketplace access |
| **Commission** | Percentage of booking revenue retained by CleanConnect Africa from each provider payout |
| **Payout** | Net payment transferred from CleanConnect Africa to a provider after commission and fee deductions |
| **Service Milestone** | An immutable timestamped record of a booking status change |
| **GMV** | Gross Merchandise Value — total value of all bookings transacted through the platform |
| **CSAT** | Customer Satisfaction Score |
| **NPS** | Net Promoter Score |
| **POPIA** | Protection of Personal Information Act (South Africa) — equivalent of GDPR |
| **LSM** | Living Standards Measure — South African market segmentation tool |
| **RecurrenceGroup** | A set of related recurring bookings sharing a common `RecurrenceGroupId` |

---

*Document prepared by CleanConnect Africa Engineering Team. For updates or corrections contact the product owner.*
