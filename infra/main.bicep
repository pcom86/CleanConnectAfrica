@description('The name of the environment.')
param environmentName string = 'cleanconnect'

@description('The Azure region for all resources.')
param location string = resourceGroup().location

@description('The name of the PostgreSQL admin user.')
param postgresAdminUser string = 'cleanconnectadmin'

@description('The PostgreSQL admin password.')
@secure()
param postgresAdminPassword string

@description('The SKU for PostgreSQL Flexible Server.')
param postgresSku object = {
  name: 'Standard_B1ms'
  tier: 'Burstable'
}

@description('The SKU for Azure Cache for Redis.')
param redisSku object = {
  name: 'Basic'
  family: 'C'
  capacity: 0
}

@description('The SKU for Container Apps.')
param containerAppSku string = 'Consumption'

@description('Container image tag for the API.')
param apiImageTag string = 'latest'

@description('Container image tag for the Worker.')
param workerImageTag string = 'latest'

@description('Frontend base URL (e.g. https://cleanconnect.co.za).')
param frontendBaseUrl string

@description('API base URL (e.g. https://api.cleanconnect.co.za).')
param apiBaseUrl string

@description('Ozow Site Code.')
@secure()
param ozowSiteCode string = ''

@description('Ozow API Key.')
@secure()
param ozowApiKey string = ''

@description('Ozow Private Key.')
@secure()
param ozowPrivateKey string = ''

@description('Ozow IsTest mode.')
param ozowIsTest bool = false

var tags = {
  environment: environmentName
  application: 'cleanconnect-africa'
  managedBy: 'bicep'
}

var uniqueSuffix = uniqueString(resourceGroup().id)
var prefix = '${environmentName}-${uniqueSuffix}'

// Log Analytics Workspace for monitoring
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-law'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-appinsights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('${prefix}acr', '-', '')
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Container Apps Environment
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Azure Database for PostgreSQL - Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${prefix}-postgres'
  location: location
  tags: tags
  sku: postgresSku
  properties: {
    version: '15'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// PostgreSQL Firewall Rule (allow Azure services)
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// PostgreSQL Database
resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'cleanconnect'
}

// Azure Cache for Redis
resource redisCache 'Microsoft.Cache/redis@2024-03-01' = {
  name: '${prefix}-redis'
  location: location
  tags: tags
  sku: redisSku
  properties: {
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisVersion: '7.2'
  }
}

// API Container App
resource apiContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-api'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.name
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'postgres-password'
          value: postgresAdminPassword
        }
        {
          name: 'ozow-sitecode'
          value: ozowSiteCode
        }
        {
          name: 'ozow-apikey'
          value: ozowApiKey
        }
        {
          name: 'ozow-privatekey'
          value: ozowPrivateKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${containerRegistry.properties.loginServer}/cleanconnect-api:${apiImageTag}'
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ConnectionStrings__CleanConnectDatabase'
              value: 'Host=${postgresServer.properties.fullyQualifiedDomainName};Port=5432;Database=cleanconnect;Username=${postgresAdminUser};Password=${postgresAdminPassword};SslMode=Require;TrustServerCertificate=true'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
            {
              name: 'Ozow__SiteCode'
              secretRef: 'ozow-sitecode'
            }
            {
              name: 'Ozow__ApiKey'
              secretRef: 'ozow-apikey'
            }
            {
              name: 'Ozow__PrivateKey'
              secretRef: 'ozow-privatekey'
            }
            {
              name: 'Ozow__BaseUrl'
              value: 'https://api.ozow.com'
            }
            {
              name: 'Ozow__IsTest'
              value: string(ozowIsTest)
            }
            {
              name: 'Ozow__FrontendBaseUrl'
              value: frontendBaseUrl
            }
            {
              name: 'Ozow__ApiBaseUrl'
              value: apiBaseUrl
            }
          ]
          resources: {
            cpu: 1
            memory: '2Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/alive'
                port: 8080
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 5
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'cpu-scale'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
}

// Worker Container App
resource workerContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-worker'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        {
          name: 'postgres-password'
          value: postgresAdminPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: '${containerRegistry.properties.loginServer}/cleanconnect-worker:${workerImageTag}'
          env: [
            {
              name: 'DOTNET_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ConnectionStrings__CleanConnectDatabase'
              value: 'Host=${postgresServer.properties.fullyQualifiedDomainName};Port=5432;Database=cleanconnect;Username=${postgresAdminUser};Password=${postgresAdminPassword};SslMode=Require;TrustServerCertificate=true'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
          resources: {
            cpu: 0.5
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

// Outputs
output applicationInsightsConnectionString string = appInsights.properties.ConnectionString
output apiContainerAppFqdn string = apiContainerApp.properties.configuration.ingress.fqdn
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output redisHost string = redisCache.properties.hostName
