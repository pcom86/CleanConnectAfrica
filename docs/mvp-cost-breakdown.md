# CleanConnect Africa — MVP Cost Breakdown

> Document generated from codebase analysis. Covers all third-party integrations, hosting infrastructure, and tooling required to run the MVP in production.

---

## Executive Summary

| Category | Estimated Monthly Cost (ZAR) | Estimated Monthly Cost (USD) |
|----------|------------------------------|------------------------------|
| **Cloud Infrastructure** | R 3,500 – 6,500 | $ 190 – 350 |
| **Database & Storage** | R 1,800 – 3,500 | $ 100 – 190 |
| **Payment Gateway** | R 0 – 500 (variable) | $ 0 – 27 |
| **Monitoring & Observability** | R 0 – 1,000 | $ 0 – 55 |
| **DevOps & Tooling** | R 500 – 1,500 | $ 27 – 82 |
| **Domains, SSL & Misc** | R 200 – 400 | $ 11 – 22 |
| **TOTAL MVP** | **R 6,000 – 13,400** | **$ 330 – 730** |

> These are **MVP-tier estimates** for a South African market launch. Costs scale with user volume.

---

## 1. Cloud Infrastructure (Compute)

### 1.1 Application Hosting

The backend uses **.NET 10 + ASP.NET Core** with **Aspire 13** for orchestration. The frontend is **Next.js 15** (React 19).

| Component | Technology | Sizing | Provider | Est. Monthly Cost |
|-----------|------------|--------|----------|-------------------|
| API Server | .NET 10 (Linux container) | 2 vCPU, 4 GB RAM | Azure App Service / AKS / AWS ECS | R 1,500 – 3,000 |
| Frontend (SSR) | Next.js 15 | 1 vCPU, 2 GB RAM | Azure Static Web Apps + Functions / Vercel / AWS Amplify | R 500 – 1,500 |
| Background Worker | .NET 10 Worker Service | 1 vCPU, 2 GB RAM | Same as API (shared or separate) | R 800 – 1,500 |
| Redis Cache | Redis 7+ | 1 GB | Azure Cache for Redis / AWS ElastiCache / Self-hosted | R 500 – 1,000 |

**Recommended South-Africa-friendly providers:**
- **Microsoft Azure** (South Africa North / South Africa West regions)
- **AWS** (South Africa — af-south-1)
- **Hetzner Cloud** (EU-based, cost-effective)
- **DigitalOcean** (Simple, predictable pricing)

### 1.2 Container Registry

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| Azure Container Registry / AWS ECR / Docker Hub | Store Docker images | R 200 – 400 |

### 1.3 Azure Reference Architecture (Recommended)

The codebase now includes Bicep infrastructure-as-code targeting **Azure Container Apps**, **Azure Database for PostgreSQL Flexible Server**, and **Azure Cache for Redis**. This is the architecture to deploy for Microsoft Marketplace listing.

| Component | Azure Service | SKU / Config | Est. Monthly Cost |
|-----------|-------------|--------------|-------------------|
| API | Azure Container Apps | 1–3 replicas, 1 vCPU, 2 GB | R 800 – 2,400 |
| Worker | Azure Container Apps | 1 replica, 0.5 vCPU, 1 GB | R 400 |
| Frontend | Azure Static Web Apps | Free tier (custom domain) | R 0 |
| Database | Azure DB for PostgreSQL — Flexible Server | Burstable B1ms, 32 GB | R 1,200 |
| Cache | Azure Cache for Redis | Basic C0 (250 MB) | R 300 |
| Registry | Azure Container Registry | Basic | R 200 |
| Telemetry | Application Insights + Log Analytics | 5 GB ingestion, 30-day retention | R 700 |
| **Azure Total** | | | **R 3,600 – 5,200** |

> **Region:** `southafricanorth` (Johannesburg) for SA users. `westeurope` as a fallback for broader SKU availability.

---

## 2. Database & Storage

### 2.1 Primary Database — PostgreSQL

The application uses **Entity Framework Core 10 with Npgsql** (PostgreSQL).

| Tier | Provider | Specs | Est. Monthly Cost |
|------|----------|-------|-------------------|
| **Managed (Recommended)** | Azure Database for PostgreSQL / AWS RDS | 2 vCPU, 4 GB RAM, 100 GB SSD | R 1,500 – 3,000 |
| **Self-hosted (VM)** | Azure VM / AWS EC2 + PostgreSQL | Same specs, manual maintenance | R 1,000 – 2,000 |
| **Budget (Hetzner/DigitalOcean)** | Managed PostgreSQL | 2 vCPU, 4 GB RAM, 50 GB | R 500 – 1,000 |

**MVP Recommendation:** Start with a **managed database** to avoid operational overhead. Azure Database for PostgreSQL Flexible Server or AWS RDS.

### 2.2 Database Backup Storage

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| Azure Blob Storage / AWS S3 / Backblaze B2 | Automated daily backups (retention: 30 days) | R 100 – 300 |

### 2.3 File / Asset Storage

The codebase does not currently use external blob storage for file uploads. Profile pictures and documents are stored as URLs.

> **If adding file uploads later:**

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| Azure Blob Storage / AWS S3 | User uploads (ID docs, profile pics) | R 100 – 500 |
| Cloudflare R2 | Zero-egress-cost alternative to S3 | R 0 – 200 |

---

## 3. Payment Gateway — Ozow

The application integrates **Ozow** for Instant EFT payments.

### 3.1 Ozow Pricing (South Africa)

| Item | Cost |
|------|------|
| **Setup Fee** | R 0 – 2,500 (one-time, depending on negotiation) |
| **Monthly Platform Fee** | R 0 – 500 |
| **Per-Transaction Fee** | 1.5% – 2.5% of transaction value (negotiable based on volume) |
| **Minimum Monthly** | Often waived for startups |

**MVP Estimate:**
- Low volume (< R 100,000/month throughput): R 0 – 500/month in fixed fees
- Transaction fees are **revenue-deducted**, not an infrastructure cost

### 3.2 Alternative / Backup Gateways (Future)

| Gateway | Use Case | Transaction Fee |
|---------|----------|-----------------|
| **Stripe** | Cards, international | 2.9% + R 1.50 |
| **PayFast** | SA cards, EFT, crypto | 1.5% – 3.5% |
| **Yoco** | In-person card payments | 2.6% – 2.95% |

> For MVP, **Ozow-only is sufficient** for the SA market.

---

## 4. Third-Party Services & APIs

### 4.1 Email Delivery

> **The codebase does not currently integrate an email provider.** Notifications are in-app only. For MVP, an email service is **highly recommended** for:
> - User registration verification
> - Booking confirmations
> - Payment receipts
> - Password resets

| Provider | Free Tier | Paid Tier (1,000 emails/mo) |
|----------|-----------|----------------------------|
| **SendGrid** | 100/day | ~R 150 – 300 |
| **AWS SES** | 62,000/mo (from EC2) | ~R 10 – 20 |
| **Mailgun** | 5,000/mo (3 months) | ~R 150 – 250 |
| **Postmark** | 100/mo | ~R 150 – 300 |

**MVP Recommendation:** AWS SES (cheapest at scale) or SendGrid (best developer experience).

### 4.2 SMS Notifications

> **Not currently integrated.** Recommended for:
> - OTP / Two-factor authentication
> - Booking reminders
> - Dispatch notifications

| Provider | Cost per SMS (SA) | Est. Monthly (500 SMS) |
|----------|-------------------|------------------------|
| **Africa's Talking** | R 0.25 – 0.40 | R 125 – 200 |
| **Twilio** | R 0.30 – 0.50 | R 150 – 250 |
| **Clickatell** | R 0.20 – 0.35 | R 100 – 175 |
| **BulkSMS** | R 0.18 – 0.30 | R 90 – 150 |

**MVP Recommendation:** Africa's Talking (best SA coverage and pricing).

### 4.3 Maps / Geolocation

> **The codebase includes address and location fields but no active map integration.** For MVP, basic geocoding may be needed for:
> - Provider service radius calculations
> - Route optimization for teams

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| **Google Maps Platform** | $ 200/mo credit | Pay-as-you-go |
| **Mapbox** | 50,000 loads/mo | ~R 300 – 1,000 |
| **OpenStreetMap (Nominatim)** | Free (with limits) | Self-host: R 500 – 1,000 |

**MVP Recommendation:** Use the Google Maps free tier initially, or Mapbox for better pricing.

### 4.4 Push Notifications (Mobile App)

> Not applicable for web-only MVP. If a mobile app is added later:

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| **Firebase Cloud Messaging (FCM)** | Unlimited | Free |
| **OneSignal** | 10,000 subscribers | R 0 – 500 |

---

## 5. Monitoring, Logging & Observability

The application uses **Aspire 13**, which provides built-in dashboards for local development. In production, you need external observability.

### 5.1 Application Performance Monitoring (APM)

| Tool | Free Tier | Paid Tier (MVP) |
|------|-----------|-----------------|
| **Azure Application Insights** | 5 GB/mo data | R 0 – 800 |
| **Datadog** | 14-day trial | R 2,000+ (overkill for MVP) |
| **New Relic** | 100 GB/mo | R 0 – 1,000 |
| **Grafana Cloud** | 10,000 metrics, 50 GB logs | R 0 – 500 |
| **UptimeRobot** | 50 monitors | R 0 – 200 |

**MVP Recommendation:** Azure Application Insights (if on Azure) or Grafana Cloud (multi-cloud friendly).

### 5.2 Error Tracking

| Tool | Free Tier | Paid Tier |
|------|-----------|-----------|
| **Sentry** | 5,000 errors/mo | ~R 200 – 500 |
| **Raygun** | 14-day trial | ~R 500 – 1,000 |
| **Azure Application Insights** | Built-in | Included above |

**MVP Recommendation:** Sentry (best error tracking for .NET).

---

## 6. DevOps, CI/CD & Tooling

### 6.1 Source Control & CI/CD

| Tool | Purpose | Cost |
|------|---------|------|
| **GitHub** | Source control | Free (public) / R 200 – 400 (Teams, private repos) |
| **GitHub Actions** | CI/CD | 2,000 min/mo free; ~R 100 – 500 thereafter |
| **Azure DevOps** | CI/CD alternative | 1,800 min/mo free; ~R 100 – 500 |

### 6.2 Code Quality & Security

| Tool | Purpose | Cost |
|------|---------|------|
| **GitHub Advanced Security** | Dependency scanning, secrets detection | R 400 – 800/user (skip for MVP) |
| **Snyk** | Vulnerability scanning | Free for open-source; ~R 300 – 600 |
| **SonarCloud** | Code quality gates | Free for public repos; ~R 200 – 400 |

### 6.3 Collaboration

| Tool | Purpose | Cost |
|------|---------|------|
| **Notion / Linear** | Project management | R 0 – 300 |
| **Figma** | UI/UX design | Free tier sufficient for MVP |

---

## 7. Domain, SSL & Security

| Item | Provider | Est. Annual Cost | Est. Monthly |
|------|----------|------------------|--------------|
| **Domain (.co.za)** | Any registrar | R 150 – 250 | R 13 – 21 |
| **Domain (.com / .africa)** | Any registrar | R 200 – 400 | R 17 – 33 |
| **SSL Certificate (Let's Encrypt)** | Free | R 0 | R 0 |
| **SSL Certificate (Wildcard)** | DigiCert / Cloudflare | R 1,500 – 3,000 | R 125 – 250 |
| **Cloudflare (Pro Plan)** | CDN + WAF + DDoS | R 300/mo | R 300 |

**MVP Recommendation:**
- Domain: `.co.za` for local trust + `.com` for brand protection
- SSL: Let's Encrypt (free, auto-renewed)
- CDN/WAF: Cloudflare Free Plan (sufficient for MVP)

---

## 8. Development Environment Costs

| Tool / Service | Purpose | Cost |
|----------------|---------|------|
| **Docker Desktop** | Local containerization | Free for individuals / R 300 – 600 (Teams) |
| **JetBrains Rider / VS Code** | IDE | Free (VS Code) / R 1,200/yr (Rider) |
| **Azure Free Account** | Dev/test resources | R 0 (R 3,000 credit, 12 months) |
| **AWS Free Tier** | Dev/test resources | R 0 (12 months) |
| **PostgreSQL (local)** | Docker Desktop | R 0 |
| **Redis (local)** | Docker Desktop | R 0 |

---

## 9. One-Time Setup Costs

| Item | Estimated Cost (ZAR) | Estimated Cost (USD) |
|------|----------------------|----------------------|
| Company registration & legal | R 5,000 – 15,000 | $ 270 – 820 |
| Ozow merchant account setup | R 0 – 2,500 | $ 0 – 135 |
| Initial cloud architecture design | R 5,000 – 20,000 | $ 270 – 1,090 |
| SSL certificate (if paid) | R 0 – 3,000 | $ 0 – 165 |
| Branding & logo design | R 2,000 – 10,000 | $ 110 – 550 |
| **TOTAL ONE-TIME** | **R 12,000 – 50,500** | **$ 650 – 2,760** |

---

## 10. Scaling Projections

As the platform grows, expect these costs to increase:

| Metric | MVP (0 – 1k users) | Growth (1k – 10k users) | Scale (10k – 100k users) |
|--------|--------------------|---------------------------|--------------------------|
| **Monthly infra cost** | R 6,000 – 13,000 | R 15,000 – 35,000 | R 50,000 – 120,000 |
| **Database** | 100 GB, 2 vCPU | 500 GB, 4 vCPU | 2 TB, 8 vCPU + read replicas |
| **API servers** | 1 instance | 2 – 3 instances + load balancer | 5+ instances, auto-scaling |
| **Payment throughput** | < R 100k/mo | R 100k – 1M/mo | R 1M+/mo |
| **Email volume** | < 5,000/mo | 5,000 – 50,000/mo | 50,000 – 500,000/mo |
| **SMS volume** | < 500/mo | 500 – 5,000/mo | 5,000 – 50,000/mo |

---

## 11. Cost Optimization Tips for MVP

1. **Use the Azure/AWS free tier** for the first 12 months
2. **Start with a single VM** (e.g., Azure B2s or Hetzner CPX21) and run both API + PostgreSQL on it — downgrade later
3. **Use Let's Encrypt** for free SSL certificates
4. **Use Cloudflare Free** for CDN and basic DDoS protection
5. **Defer email/SMS integration** until after launch if budget is tight (in-app notifications are built in)
6. **Use Aspire's local dashboard** for monitoring during MVP; add APM only after product-market fit
7. **Negotiate Ozow fees** once you have transaction volume data

---

## 12. Minimum Viable Infrastructure (Ultra-Lean)

If capital is constrained, this is the **absolute minimum** production setup:

| Component | Provider / Tool | Monthly Cost |
|-----------|-----------------|--------------|
| Single VM (4 vCPU, 8 GB RAM) | Hetzner Cloud CPX31 | R 800 – 1,200 |
| PostgreSQL (same VM, Docker) | Self-managed | R 0 |
| Redis (same VM, Docker) | Self-managed | R 0 |
| Next.js frontend (same VM, PM2) | Self-hosted | R 0 |
| Domain (.co.za) | Any registrar | R 20 |
| SSL (Let's Encrypt) | Certbot | R 0 |
| Cloudflare | Free plan | R 0 |
| Ozow | Transaction fees only | R 0 (fixed) |
| Monitoring | Aspire dashboard + UptimeRobot free | R 0 |
| Backups | Hetzner snapshot / rsync | R 100 – 200 |
| **ULTRA-LEAN TOTAL** | | **R 920 – 1,420** |

> **Trade-off:** You take on operational responsibility for database backups, updates, and scaling. This is acceptable for an MVP but should be migrated to managed services before scaling.
>
> **Microsoft Marketplace:** If your goal is listing on the Microsoft Marketplace, you **must** use Azure (see §1.3). The ultra-lean path above will not qualify for co-sell or Azure Marketplace SaaS listings.

---

## Appendix: Currency Reference

| Item | Value |
|------|-------|
| 1 USD | ~R 18.30 (as of mid-2026 estimate) |
| 1 EUR | ~R 19.80 |
| 1 GBP | ~R 23.50 |

---

*Document generated from codebase analysis on 2026-07-02. Prices are estimates based on South African market rates and may vary by provider and contract terms.*
