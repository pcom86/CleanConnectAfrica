# CleanConnect Africa — MVP Cost Breakdown

> Document generated from codebase analysis. Covers all third-party integrations, hosting infrastructure, and tooling required to run the MVP in production.

---

## Executive Summary

Three recommended scenarios based on budget and go-to-market strategy:

| Scenario | Infrastructure | Monthly Cost (ZAR) | Monthly Cost (USD) | Best For |
|----------|---------------|----------------------|--------------------|----------|
| **Ultra-Lean** | Single VM (self-managed) | **R 920 – 1,420** | **$ 50 – 78** | Pre-revenue, testing product-market fit |
| **Azure MVP** | Azure Container Apps + managed services | **R 3,600 – 5,200** | **$ 197 – 284** | Microsoft Marketplace listing, production-ready |
| **Full MVP** | Azure MVP + ID Verification + Email + SMS + Domain | **R 4,620 – 9,270** | **$ 252 – 507** | Live marketplace with provider KYC |

> Costs are **MVP-tier estimates** for a South African market launch and scale with user volume. All figures in ZAR with USD equivalents at ~R 18.30/USD.

### Full MVP Cost Reconciliation

| Category | Azure MVP Range | Full MVP Range |
|----------|-----------------|----------------|
| Azure Infrastructure (compute, DB, Redis, registry, telemetry) | R 3,600 – 5,200 | R 3,600 – 5,200 |
| ID Verification & Liveness (Smile Identity) | — | R 900 – 3,700 |
| Email delivery (AWS SES / SendGrid) | — | R 0 – 150 |
| SMS notifications (Africa's Talking) | — | R 100 – 200 |
| Domain & SSL (.co.za + Let's Encrypt) | — | R 20 |
| Cloudflare (Free plan) | — | R 0 |
| Payment gateway (Ozow — revenue-deducted) | — | R 0* |
| DevOps / CI-CD (GitHub Actions free tier) | — | R 0 |
| **TOTAL** | **R 3,600 – 5,200** | **R 4,620 – 9,270** |

> *Ozow transaction fees (1.5% – 2.5%) are deducted from revenue, not a fixed monthly cost. Fixed platform fees may apply after negotiations.
>
> **Recommendation:** Start with **Azure MVP** for Microsoft Marketplace readiness. Add email and SMS only when you have active customers requiring them.

---

## 1. Cloud Infrastructure (Compute)

### 1.1 Azure Reference Architecture (Recommended for MVP)

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

### 1.2 Alternative Hosting Options

For teams not targeting Microsoft Marketplace, these are viable alternatives:

| Component | Technology | Sizing | Provider | Est. Monthly Cost |
|-----------|------------|--------|----------|-------------------|
| API Server | .NET 10 (Linux container) | 2 vCPU, 4 GB RAM | Azure App Service / AWS ECS / DigitalOcean | R 1,500 – 3,000 |
| Frontend (SSR) | Next.js 15 | 1 vCPU, 2 GB RAM | Vercel / AWS Amplify / Netlify | R 0 – 500 |
| Background Worker | .NET 10 Worker Service | 1 vCPU, 2 GB RAM | Same as API (shared or separate) | R 800 – 1,500 |
| Redis Cache | Redis 7+ | 1 GB | AWS ElastiCache / Self-hosted (Docker) | R 0 – 500 |
| Container Registry | — | — | Docker Hub / AWS ECR | R 0 – 200 |

### 1.3 Container Registry

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| Azure Container Registry | Store Docker images (included in Azure Total above) | R 200 |
| AWS ECR / Docker Hub | Alternative registries | R 0 – 200 |

---

## 2. Database & Storage

### 2.1 Included in Azure MVP Total

The following are **already included** in the Azure MVP cost of R 3,600 – 5,200/month:

| Component | Azure Service | Included Cost |
|-----------|-------------|---------------|
| PostgreSQL | Azure DB for PostgreSQL — Flexible Server (Burstable B1ms, 32 GB) | R 1,200 |
| Redis | Azure Cache for Redis (Basic C0, 250 MB) | R 300 |
| Automated backups | Built-in to Flexible Server (7-day retention) | R 0 |
| Registry | Azure Container Registry (Basic) | R 200 |

### 2.2 Optional Additions (Not in Azure Total)

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| Azure Blob Storage | Long-term database backups (> 7 days) or file uploads (ID docs, profile pics) | R 50 – 200 |
| Cloudflare R2 | Zero-egress-cost alternative to Azure Blob for public assets | R 0 – 100 |

> **Current state:** The codebase does not use external blob storage. Profile pictures and documents are stored as URLs. Blob storage only becomes relevant if you add direct file uploads later.

### 2.3 Alternative Database Options

If not using Azure, these are the database costs:

| Tier | Provider | Specs | Est. Monthly Cost |
|------|----------|-------|-------------------|
| **Managed** | AWS RDS PostgreSQL | 2 vCPU, 4 GB RAM, 100 GB SSD | R 1,500 – 3,000 |
| **Self-hosted (VM)** | Azure VM / AWS EC2 + PostgreSQL | Same specs, manual maintenance | R 1,000 – 2,000 |
| **Budget** | Hetzner / DigitalOcean managed PostgreSQL | 2 vCPU, 4 GB RAM, 50 GB | R 500 – 1,000 |

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

### 4.2 ID Verification & Liveness Detection

> **Not currently integrated. Critical for marketplace trust and safety.** Required for:
> - Provider onboarding KYC (Know Your Customer)
> - Identity fraud prevention
> - Regulatory compliance (FICA in South Africa)

#### Identity Verification Providers

| Provider | SA Coverage | Cost per Check | MVP Recommendation |
|----------|-------------|----------------|--------------------|
| **Smile Identity** | SA Smart ID, Passport, Driver's License + 15+ African countries | R 18 – 37 ($1 – $2) | Best for African markets, startup-friendly |
| **Onfido** | SA Smart ID, Passport, 2,500+ global documents | R 37 – 55 ($2 – $3) | Best accuracy, strong SA presence |
| **Jumio** | SA documents, global coverage | R 37 – 73 ($2 – $4) | Enterprise-grade compliance |
| **Veriff** | SA Smart ID, Passport, 11,000+ documents | R 37 – 55 ($2 – $3) | Fast verification, good UX |

#### Liveness Detection (Anti-Spoofing)

| Provider | Method | Cost per Check |
|----------|--------|----------------|
| Smile Identity (included) | Passive + active liveness | Included in ID check |
| Onfido (included) | Video selfie + photo-based | Included in ID check |
| iProov (standalone) | Genuine Presence Assurance | R 9 – 18 ($0.50 – $1) |
| Amazon Rekognition | Face liveness detection | R 0.55 – 1.10 ($0.03 – $0.06) |

#### Estimated Monthly Cost

| Scenario | Verifications / Month | Provider | Monthly Cost |
|----------|----------------------|----------|--------------|
| MVP (provider onboarding only) | 50 – 100 | Smile Identity | R 900 – 3,700 |
| Growth (providers + high-value customers) | 200 – 500 | Smile Identity | R 3,600 – 18,500 |
| Scale (all users + recurring checks) | 1,000+ | Onfido / Smile Identity | R 18,000+ (volume discounts) |

**MVP Recommendation:** Start with **Smile Identity** for best SA/African pricing. Most providers offer startup credits or first 100 checks free.

### 4.3 SMS Notifications

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

### 4.4 Maps / Geolocation

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

The application uses **Aspire 13**, which provides built-in dashboards for local development. In production, observability is handled by Azure Monitor.

### 5.1 Included in Azure MVP Total

| Component | Azure Service | Included Cost |
|-----------|-------------|---------------|
| APM + Distributed Tracing | Application Insights | R 400 |
| Centralized Logging | Log Analytics Workspace | R 300 |
| Container Logs | Container Apps → Log Analytics | R 0 |
| Health Probes | `/health` + `/alive` endpoints | R 0 |

### 5.2 Optional Additions (Not in Azure Total)

| Tool | Purpose | Free Tier | Paid Tier |
|------|---------|-----------|-----------|
| **Sentry** | Advanced error tracking + release health | 5,000 errors/mo | ~R 200 – 500 |
| **UptimeRobot** | External uptime monitoring | 50 monitors | R 0 – 200 |
| **Datadog** | Full observability platform | 14-day trial | R 2,000+ (overkill for MVP) |

> **Recommendation:** Start with Application Insights only. Add Sentry if you need more granular error tracking or release health metrics.

---

## 6. DevOps, CI/CD & Tooling

### 6.1 Source Control & CI/CD

The codebase includes a **GitHub Actions workflow** (`.github/workflows/azure-deploy.yml`) that builds, pushes containers to ACR, deploys Bicep infrastructure, and publishes the Next.js frontend.

| Tool | Purpose | Cost |
|------|---------|------|
| **GitHub** | Source control | Free (public repos) / R 200 – 400 (Teams, private repos) |
| **GitHub Actions** | CI/CD — build, test, deploy to Azure | 2,000 min/mo free; ~R 0 – 200 for MVP workloads |
| **Azure DevOps** | CI/CD alternative (if preferred) | 1,800 min/mo free; ~R 0 – 200 |

> **MVP cost:** R 0 — GitHub Actions free tier is sufficient for the build frequency of an MVP.

### 6.2 Code Quality & Security

| Tool | Purpose | Cost |
|------|---------|------|
| **GitHub Dependabot** | Automated dependency updates | Free |
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
| **Domain (.co.za)** | Any registrar (Afrihost, Xneelo, etc.) | R 150 – 250 | R 13 – 21 |
| **Domain (.com / .africa)** | Any registrar | R 200 – 400 | R 17 – 33 |
| **SSL Certificate** | Included with Azure Static Web Apps | R 0 | R 0 |
| **SSL (Wildcard, if needed)** | DigiCert / Cloudflare | R 1,500 – 3,000 | R 125 – 250 |
| **Cloudflare (Free Plan)** | CDN + DDoS + DNS management | R 0 | R 0 |
| **Cloudflare (Pro Plan)** | Advanced WAF + analytics | R 3,600/yr | R 300 |

**MVP Recommendation:**
- Domain: `.co.za` for local trust (~R 20/mo)
- SSL: Automatically provided by Azure Static Web Apps (free, auto-renewed)
- CDN/DNS: Cloudflare Free Plan (sufficient for MVP)
- Total: **R 20/month**

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

As the platform grows, expect these costs to increase from the Azure MVP baseline:

| Metric | MVP (0 – 1k users) | Growth (1k – 10k users) | Scale (10k – 100k users) |
|--------|--------------------|---------------------------|--------------------------|
| **Monthly infra cost** | R 3,600 – 5,200 | R 10,000 – 25,000 | R 40,000 – 100,000 |
| **Database** | Burstable B1ms, 32 GB | General Purpose D2s_v3, 256 GB | General Purpose D4s_v3, 1 TB + read replica |
| **API servers** | 1–3 Container App replicas | 3–6 replicas, auto-scale | 6–12 replicas + App Gateway |
| **Redis** | Basic C0 (250 MB) | Standard C1 (1 GB) | Premium P1 (6 GB) + clustering |
| **Payment throughput** | < R 100k/mo | R 100k – 1M/mo | R 1M+/mo |
| **Email volume** | < 5,000/mo | 5,000 – 50,000/mo | 50,000 – 500,000/mo |
| **SMS volume** | < 500/mo | 500 – 5,000/mo | 5,000 – 50,000/mo |

> **Note:** The MVP baseline (R 3,600 – 5,200) includes all Azure infrastructure. Growth costs are driven by compute scaling, database upgrades, and Redis tier increases.

---

## 11. Cost Optimization Tips for MVP

### Azure-specific optimizations
1. **Use the Azure free account** — R 3,000 credits for 30 days, sufficient to test the full architecture
2. **Start with Burstable SKU** (B1ms) for PostgreSQL — upgrade to General Purpose only when CPU consistently exceeds 60%
3. **Use Azure Static Web Apps free tier** — includes custom domains and 250 GB bandwidth, enough for MVP
4. **Keep Redis on Basic C0** — only upgrade when you need > 250 MB or clustering for HA
5. **Set Container Apps max replicas to 1** during initial launch — scale up only when you have traffic
6. **Use Log Analytics daily cap** — limit ingestion to 1 GB/day to control telemetry costs

### General optimizations
7. **Use Let's Encrypt** for free SSL certificates (included in Azure Static Web Apps automatically)
8. **Use Cloudflare Free** for CDN and basic DDoS protection
9. **Defer email/SMS integration** until after launch if budget is tight (in-app notifications are built in)
10. **Negotiate Ozow fees** once you have transaction volume data — fees are typically volume-dependent

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

*Document reconciled on 2026-07-02. All figures are estimates based on South African market rates and Azure pricing (South Africa North region). Actual costs may vary by provider, contract terms, and usage patterns. Azure infrastructure costs are derived from the Bicep template in `infra/main.bicep`.*
