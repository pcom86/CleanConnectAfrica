# CleanConnect Africa — Azure Deployment Guide

> This guide covers deploying CleanConnect Africa to Microsoft Azure using Bicep infrastructure-as-code and GitHub Actions CI/CD.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| .NET SDK | 10.0+ | Build API, Worker, and Aspire AppHost |
| Azure CLI | 2.60+ | Deploy Bicep templates, manage Azure resources |
| Azure Developer CLI (`azd`) | 1.9+ | Optional: one-command deployment via Aspire publishing |
| Docker Desktop | 4.x+ | Local containerized development |
| Node.js | 20.x+ | Build Next.js frontend |

---

## Architecture Overview

```
Azure Resource Group
├── Container Registry (ACR)
│   └── cleanconnect-api, cleanconnect-worker images
├── Container Apps Environment
│   ├── API Container App (1–3 replicas, CPU autoscale)
│   └── Worker Container App (1 replica)
├── Azure Database for PostgreSQL (Flexible Server, Burstable)
│   └── cleanconnect database
├── Azure Cache for Redis (Basic C0)
├── Application Insights
│   └── Distributed tracing + metrics
├── Log Analytics Workspace
│   └── Centralized logging
└── Static Web App (Next.js frontend)
```

---

## 1. Azure Setup

### 1.1 Create an Azure Subscription

If you don't have one, sign up at [azure.microsoft.com/free](https://azure.microsoft.com/free). You receive ~R 3,000 in credits for 30 days.

### 1.2 Register Resource Providers

Run once per subscription:

```bash
az login
az account set --subscription "<your-subscription-name-or-id>"

az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.Cache
az provider register --namespace Microsoft.Insights
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.ContainerRegistry
```

### 1.3 Create a Resource Group

```bash
az group create \
  --name CleanConnectAfrica-RG \
  --location southafricanorth
```

> **Region recommendation:** `southafricanorth` (Johannesburg) for lowest latency to SA users. Alternative: `westeurope` for broader Azure service availability.

---

## 2. GitHub Repository Secrets

In your GitHub repo, go to **Settings > Secrets and variables > Actions** and add these secrets:

| Secret | How to obtain |
|--------|---------------|
| `AZURE_CLIENT_ID` | Service principal app ID (see §3) |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |
| `AZURE_RESOURCE_GROUP` | Name of your resource group, e.g. `CleanConnectAfrica-RG` |
| `AZURE_CONTAINER_REGISTRY` | ACR name, e.g. `cleanconnect12345acr` |
| `AZURE_STATIC_WEB_APPS_TOKEN` | Token from Azure Static Web Apps (see §5) |
| `POSTGRES_ADMIN_PASSWORD` | Strong password for PostgreSQL admin |
| `FRONTEND_BASE_URL` | `https://cleanconnect.co.za` |
| `API_BASE_URL` | `https://api.cleanconnect.co.za` |
| `OZOW_SITE_CODE` | From Ozow merchant dashboard |
| `OZOW_API_KEY` | From Ozow merchant dashboard |
| `OZOW_PRIVATE_KEY` | From Ozow merchant dashboard |
| `OZOW_IS_TEST` | `true` for staging, `false` for production |

---

## 3. Create a Service Principal for CI/CD

```bash
az ad sp create-for-rbac \
  --name "cleanconnect-github-actions" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/CleanConnectAfrica-RG \
  --sdk-auth
```

Copy the `clientId` and `tenantId` into your GitHub secrets. The command also outputs a JSON object you can use as `AZURE_CREDENTIALS` if needed.

---

## 4. Deploy Infrastructure (First Time)

### Option A: Bicep + Azure CLI (Manual)

```bash
cd infra

# Deploy the main Bicep template
az deployment group create \
  --resource-group CleanConnectAfrica-RG \
  --template-file main.bicep \
  --parameters \
    environmentName=cleanconnect \
    postgresAdminPassword='<strong-password>' \
    frontendBaseUrl='https://cleanconnect.co.za' \
    apiBaseUrl='https://api.cleanconnect.co.za' \
    ozowSiteCode='' \
    ozowApiKey='' \
    ozowPrivateKey='' \
    ozowIsTest=true
```

### Option B: Azure Developer CLI (Recommended for Aspire)

```bash
# Install azd if you haven't
winget install Microsoft.Azure.AZd

# From repo root
azd init --template CleanConnectAfrica
azd up
```

`azd up` will:
1. Provision all Azure resources
2. Build and push container images
3. Deploy container apps
4. Configure environment variables automatically

---

## 5. Deploy the Frontend (Static Web App)

### 5.1 Create a Static Web App

```bash
az staticwebapp create \
  --name cleanconnect-frontend \
  --resource-group CleanConnectAfrica-RG \
  --location southafricanorth \
  --source https://github.com/<org>/CleanConnectAfrica \
  --branch Development \
  --app-location frontend \
  --output-location out \
  --login-with-github
```

### 5.2 Get Deployment Token

```bash
az staticwebapp secrets list \
  --name cleanconnect-frontend \
  --resource-group CleanConnectAfrica-RG \
  --query properties.apiKey -o tsv
```

Save this as `AZURE_STATIC_WEB_APPS_TOKEN` in GitHub secrets.

---

## 6. Build & Push Containers Locally (Optional)

If you need to deploy manually or test images locally:

```bash
# Build API image
dotnet publish src/CleanConnect.Api/CleanConnect.Api.csproj \
  -c Release \
  -p:PublishProfile=DefaultContainer \
  -p:ContainerRegistry=<acr-name>.azurecr.io \
  -p:ContainerRepository=cleanconnect-api \
  -p:ContainerImageTag=latest

# Build Worker image
dotnet publish src/CleanConnect.Worker/CleanConnect.Worker.csproj \
  -c Release \
  -p:PublishProfile=DefaultContainer \
  -p:ContainerRegistry=<acr-name>.azurecr.io \
  -p:ContainerRepository=cleanconnect-worker \
  -p:ContainerImageTag=latest

# Push images (if not pushed automatically)
az acr login --name <acr-name>
docker push <acr-name>.azurecr.io/cleanconnect-api:latest
docker push <acr-name>.azurecr.io/cleanconnect-worker:latest
```

---

## 7. Running Migrations

After the first deployment, apply database migrations:

```bash
# Option 1: Run EF migrations from local machine against Azure PostgreSQL
export ConnectionStrings__CleanConnectDatabase="Host=<postgres-fqdn>;Port=5432;Database=cleanconnect;Username=<admin>;Password=<password>;SslMode=Require;TrustServerCertificate=true"

dotnet ef database update \
  --project src/CleanConnect.Infrastructure \
  --startup-project src/CleanConnect.Api

# Option 2: Use a one-off container job in Azure Container Apps
az containerapp job create \
  --name cleanconnect-migrate \
  --resource-group CleanConnectAfrica-RG \
  --environment <env-name> \
  --image <acr-name>.azurecr.io/cleanconnect-api:latest \
  --command "dotnet ef database update" \
  --env-vars "ConnectionStrings__CleanConnectDatabase=<connection-string>"
```

---

## 8. Monitoring & Observability

### 8.1 Application Insights

Open the Application Insights resource in the Azure portal:
- **Live Metrics** — real-time request/dependency flow
- **Failures** — exceptions and failed requests
- **Performance** — response times, dependency calls
- **Availability** — set up URL ping tests for `/health`

### 8.2 Log Analytics

Query container logs:

```kusto
ContainerAppConsoleLogs_CL
| where ContainerGroupName_s contains "cleanconnect"
| project TimeGenerated, Log_s, ContainerName_s
| order by TimeGenerated desc
```

### 8.3 Container App Metrics

In the Azure portal, monitor:
- Replica count (should autoscale between 1–3)
- CPU / memory utilization
- Restart count
- Ingress request volume

---

## 9. Scaling Configuration

The Bicep template configures the following scaling behavior:

| Resource | Min | Max | Trigger |
|----------|-----|-----|---------|
| API Container App | 1 | 3 | CPU > 70% |
| Worker Container App | 1 | 1 | — |
| PostgreSQL | — | — | Burstable B1ms (1 vCPU, 2 GB) |
| Redis | — | — | Basic C0 (250 MB) |

To scale up, modify the Bicep parameters:

```bash
az deployment group create \
  --resource-group CleanConnectAfrica-RG \
  --template-file infra/main.bicep \
  --parameters postgresSku='{"name":"Standard_D2s_v3","tier":"GeneralPurpose"}' \
  --parameters redisSku='{"name":"Standard","family":"C","capacity":1}'
```

---

## 10. Cost Estimate (Azure South Africa North)

| Resource | SKU | Monthly Cost (ZAR) |
|----------|-----|--------------------|
| Container Apps (API) | 1–3 replicas, 1 CPU / 2 GB | R 800 – 2,400 |
| Container Apps (Worker) | 1 replica, 0.5 CPU / 1 GB | R 400 |
| PostgreSQL Flexible Server | Burstable B1ms | R 1,200 |
| Redis Cache | Basic C0 | R 300 |
| Container Registry | Basic | R 200 |
| Application Insights | 5 GB ingestion | R 400 |
| Log Analytics | 10 GB retention | R 300 |
| Static Web App | Free tier | R 0 |
| **Total** | | **R 3,600 – 5,200** |

See `docs/mvp-cost-breakdown.md` for the full analysis.

---

## 11. Troubleshooting

### Container App won't start

```bash
az containerapp logs show \
  --name <api-container-app-name> \
  --resource-group CleanConnectAfrica-RG \
  --follow
```

### PostgreSQL connection refused

- Check firewall rule: `AllowAllAzureServices` must be present
- Verify connection string includes `SslMode=Require;TrustServerCertificate=true`
- Ensure database `cleanconnect` exists: `az postgres flexible-server db list ...`

### Redis connection errors

- Ensure `minimumTlsVersion` is `1.2`
- Use SSL port (6380) with TLS enabled

### Application Insights not receiving telemetry

- Verify `APPLICATIONINSIGHTS_CONNECTION_STRING` is set in Container App environment variables
- Check that `Azure.Monitor.OpenTelemetry.AspNetCore` package is referenced

---

## 12. Next Steps for Microsoft Marketplace

1. **Register as a Microsoft Partner** at [partner.microsoft.com](https://partner.microsoft.com)
2. **Enroll in Azure ISV Accelerate** for co-sell benefits
3. **Complete technical validation** (Azure Well-Architected Review)
4. **Submit your SaaS offer** via [Partner Center](https://partner.microsoft.com/dashboard)
5. **Configure SaaS fulfillment API** for marketplace-driven provisioning

---

*Last updated: 2026-07-02*
