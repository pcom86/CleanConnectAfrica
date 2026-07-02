# CleanConnect Africa — MVP Cost Breakdown

> One-pager for stakeholders and investors. Full details in [`mvp-cost-breakdown.md`](./mvp-cost-breakdown.md).

---

## Monthly Operating Costs

### Scenario A: Azure MVP (Recommended)
Production-ready on Microsoft Azure. Required for Microsoft Marketplace listing.

| Service | SKU | Monthly Cost |
|---------|-----|--------------|
| API (Container Apps) | 1–3 replicas, 1 vCPU / 2 GB | R 800 – 2,400 |
| Worker (Container Apps) | 1 replica, 0.5 vCPU / 1 GB | R 400 |
| Database (PostgreSQL) | Flexible Server, Burstable B1ms, 32 GB | R 1,200 |
| Cache (Redis) | Basic C0, 250 MB | R 300 |
| Container Registry | Basic | R 200 |
| Monitoring (App Insights + Logs) | 5 GB ingestion | R 700 |
| Frontend (Static Web Apps) | Free tier, custom domain | R 0 |
| **Subtotal** | | **R 3,600 – 5,200** |
| Domain (.co.za) | — | R 20 |
| **Azure MVP Total** | | **R 3,620 – 5,220** |

---

### Scenario B: Full MVP (With Notifications)
Add email and SMS for live customer engagement.

| Add-on | Provider | Monthly Cost |
|--------|----------|--------------|
| Email | AWS SES / SendGrid | R 0 – 150 |
| SMS | Africa's Talking | R 100 – 200 |
| **Full MVP Total** | | **R 3,720 – 5,570** |

---

### Scenario C: Ultra-Lean (Pre-Revenue)
Single VM, self-managed. Not eligible for Microsoft Marketplace.

| Component | Monthly Cost |
|-----------|--------------|
| Hetzner CPX31 (4 vCPU, 8 GB) | R 800 – 1,200 |
| Domain (.co.za) | R 20 |
| Backups (snapshots) | R 100 – 200 |
| **Ultra-Lean Total** | **R 920 – 1,420** |

---

## One-Time Setup Costs

| Item | Cost |
|------|------|
| Company registration & legal | R 5,000 – 15,000 |
| Ozow merchant account setup | R 0 – 2,500 |
| Branding & logo design | R 2,000 – 10,000 |
| SSL certificate (if paid wildcard) | R 0 – 3,000 |
| **Total One-Time** | **R 7,000 – 30,500** |

---

## Revenue-Deducted Costs (Not Fixed)

| Item | Rate |
|------|------|
| Ozow transaction fee | 1.5% – 2.5% per transaction |

---

## Scaling Roadmap

| Stage | Users | Infra Cost | Key Upgrade |
|-------|-------|-----------|-------------|
| MVP | 0 – 1,000 | R 3,600 – 5,200 | Burstable DB, 1–3 replicas |
| Growth | 1,000 – 10,000 | R 10,000 – 25,000 | General Purpose DB, 3–6 replicas |
| Scale | 10,000 – 100,000 | R 40,000 – 100,000 | Read replicas, Premium Redis |

---

## Currency

- **ZAR 18.30** ≈ 1 USD
- All figures rounded to nearest R 10

---

*Reconciled 2026-07-02. Source: `infra/main.bicep` + Azure South Africa North pricing.*
