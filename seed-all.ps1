#requires -Version 5.1
<#
.SYNOPSIS
    Single consolidated seed script for CleanConnect dummy data.
.DESCRIPTION
    Creates:
      1. Customer (Alice) with address
      2. Business Owner (Bob) with full business profile
      3. Two cleaners linked to the provider
      4. Two bookings for Alice: one EFT, one Pay Onsite
.NOTES
    API default: http://localhost:5000
    UserRole enum: Customer=1, BusinessCustomer=2, Cleaner=3, Supervisor=4,
                   Admin=5, OperationsManager=6, FinanceManager=7,
                   ProviderOwner=8, ProviderStaff=9
#>

$ErrorActionPreference = "Stop"
$ApiBase = "http://localhost:5000"

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
function Invoke-ApiPost($Path, $Body) {
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    try {
        $resp = Invoke-WebRequest -Uri "$ApiBase$Path" -Method POST -ContentType "application/json" -Body $json -UseBasicParsing
        return $resp.Content | ConvertFrom-Json
    } catch {
        $errBody = "{}"
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $stream.Position = 0
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
            $reader.Close()
        }
        Write-Host "ERROR $Path ($($_.Exception.Response.StatusCode)): $errBody" -ForegroundColor Red
        return @{ succeeded = $false; error = $errBody; data = $null }
    }
}

function Invoke-ApiGet($Path) {
    try {
        $resp = Invoke-WebRequest -Uri "$ApiBase$Path" -Method GET -ContentType "application/json" -UseBasicParsing
        return $resp.Content | ConvertFrom-Json
    } catch {
        return @{ succeeded = $false }
    }
    try {
        $resp = Invoke-WebRequest -Uri "$ApiBase$Path" -Method PUT -ContentType "application/json" -Body $json -UseBasicParsing
        return $resp.Content | ConvertFrom-Json
    } catch {
        return @{ succeeded = $false }
    }
}

function Get-UserByEmail($Email) {
    $resp = Invoke-ApiGet "/api/v1/users?page=1&pageSize=50"
    if ($resp.succeeded -and $resp.data -and $resp.data.items) {
        return $resp.data.items | Where-Object { $_.email -eq $Email }
    }
    return $null
}

function Get-AddressFromDb($CustomerProfileId) {
    $pgContainer = docker ps --format "{{.Names}}" | Select-String "postgres" | Select-Object -First 1
    if (-not $pgContainer) { return $null }
    $env:PGPASSWORD = "postgres"
    $sqlFile = "C:\Users\Public\pcom86\tmp-addr.sql"
    'SELECT "Id" FROM "cleanconnect"."addresses" WHERE "CustomerProfileId" = ''' + $CustomerProfileId + ''' LIMIT 1;' |
        Set-Content -Path $sqlFile -Encoding UTF8
    docker cp $sqlFile ${pgContainer}:/tmp/addr.sql 2>$null
    $result = docker exec -e PGPASSWORD=postgres $pgContainer psql -U postgres -d cleanconnect -t -f /tmp/addr.sql 2>$null
    $match = [regex]::Match($result, "[a-f0-9-]{36}")
    if ($match.Success) { return $match.Value }
    return $null
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "         CleanConnect Africa - Complete Seed Script       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------
# 1. Create / verify Customer (Alice)
# ------------------------------------------------------------------
$customer = Get-UserByEmail "alice@example.com"
if ($customer) {
    Write-Host "Customer already exists: $($customer.firstName) $($customer.lastName) | ID: $($customer.id)" -ForegroundColor Yellow
} else {
    $customerPayload = @{
        firstName    = "Alice"
        lastName     = "Customer"
        email        = "alice@example.com"
        phoneNumber  = "0712345678"
        passwordHash = "Password123"
        role         = 1   # Customer
        status       = 1   # Active
        customerProfile = @{
            customerType = 1   # Residential
            companyName  = $null
            vatNumber    = $null
            billingAddress = $null
            defaultPaymentMethodReference = $null
            address = @{
                streetAddress = "123 Main Street"
                suburb        = "Sandton"
                city          = "Johannesburg"
                province      = "Gauteng"
                postalCode    = "2196"
                label         = "Home"
            }
        }
    }
    $customerRes = Invoke-ApiPost "/api/v1/users" $customerPayload
    if (-not $customerRes.succeeded) {
        Write-Host "Failed to create customer: $($customerRes.error)" -ForegroundColor Red
        exit 1
    }
    $customer = $customerRes.data
    Write-Host "Created Customer  : $($customer.firstName) $($customer.lastName) | ID: $($customer.id)" -ForegroundColor Green
}
$customerProfileId = $customer.customerProfile.id
$addressId = Get-AddressFromDb $customerProfileId
if (-not $addressId) {
    Write-Host "WARN: Could not fetch address from DB. Using fallback." -ForegroundColor Yellow
    $addressId = "61886cb6-ef5d-45e1-9408-4d22fafcc9a9"
}

# ------------------------------------------------------------------
# 2. Create / verify Business Owner (Bob)
# ------------------------------------------------------------------
$owner = Get-UserByEmail "bob@example.com"
if ($owner) {
    Write-Host "Provider owner already exists: $($owner.firstName) $($owner.lastName) | ID: $($owner.id) | Role: $($owner.role)" -ForegroundColor Yellow
    if ($owner.role -eq "Supervisor") {
        Write-Host "  -> Updating role from Supervisor to ProviderOwner..." -ForegroundColor Cyan
        $updatePayload = @{
            firstName   = $owner.firstName
            lastName    = $owner.lastName
            email       = $owner.email
            phoneNumber = $owner.phoneNumber
            role        = 8   # ProviderOwner
            status      = 1   # Active
        }
        $updateRes = Invoke-ApiPut "/api/v1/users/$($owner.id)" $updatePayload
        if ($updateRes.succeeded) {
            $owner = $updateRes.data
            Write-Host "  -> Role updated to ProviderOwner." -ForegroundColor Green
        }
    }
} else {
    $ownerPayload = @{
        firstName    = "Bob"
        lastName     = "Provider"
        email        = "bob@example.com"
        phoneNumber  = "0723456789"
        passwordHash = "Password123"
        role         = 8   # ProviderOwner
        status       = 1   # Active
    }
    $ownerRes = Invoke-ApiPost "/api/v1/users" $ownerPayload
    if (-not $ownerRes.succeeded) {
        Write-Host "Failed to create business owner: $($ownerRes.error)" -ForegroundColor Red
        exit 1
    }
    $owner = $ownerRes.data
    Write-Host "Created Provider  : $($owner.firstName) $($owner.lastName) | ID: $($owner.id)" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 3. Create / verify Business Profile
# ------------------------------------------------------------------
$bpResp = Invoke-ApiGet "/api/v1/business-profiles/me?contactUserId=$($owner.id)"
if ($bpResp.succeeded -and $bpResp.data) {
    Write-Host "Business profile already exists for Bob." -ForegroundColor Yellow
} else {
    $bizPayload = @{
        contactUserId      = $owner.id
        companyName        = "Spotless Solutions"
        registrationNumber = "2023/123456/07"
        taxNumber          = "9123456789"
        serviceCategories  = @(1, 3)   # Cleaning, CarWash
        baseLocation       = "Cape Town, Western Cape"
        streetAddress      = "45 Cleaning Avenue"
        suburb             = "Claremont"
        city               = "Cape Town"
        province           = "Western Cape"
        postalCode         = "7708"
        serviceAreas       = @("Claremont", "Rondebosch", "Newlands", "Observatory", "Woodstock")
        latitude           = -33.9249
        longitude          = 18.4241
        serviceRadiusKm    = 25
        joiningFeeAmount   = 500
        commissionRate     = 0.10
        verificationPassed = $true
        paymentCompleted   = $true
    }
    $bpRes = Invoke-ApiPost "/api/v1/business-profiles" $bizPayload
    if ($bpRes.succeeded) {
        Write-Host "Created Business Profile: $($bpRes.data.companyName) | Status: $($bpRes.data.status)" -ForegroundColor Green
    } else {
        Write-Host "Failed to create business profile: $($bpRes.error)" -ForegroundColor Red
    }
}

# ------------------------------------------------------------------
# 4. Register Cleaners (idempotent)
# ------------------------------------------------------------------
function Register-Cleaner($FirstName, $LastName, $Email, $Phone, $ProviderId, $EmploymentType, $Skills, $ServiceZones) {
    $existing = Get-UserByEmail $Email
    if ($existing) {
        Write-Host "Cleaner already exists: $FirstName $LastName | $Email" -ForegroundColor Yellow
        return $existing
    }
    $payload = @{
        firstName      = $FirstName
        lastName       = $LastName
        email          = $Email
        phoneNumber    = $Phone
        passwordHash   = "Password123"
        role           = 3   # Cleaner
        status         = 1   # Active
        providerId     = $ProviderId
        employmentType = $EmploymentType
        skills         = $Skills
        serviceZones   = $ServiceZones
    }
    $res = Invoke-ApiPost "/api/v1/cleaners" $payload
    if ($res.succeeded) {
        Write-Host "Registered Cleaner: $FirstName $LastName | $Email | ID: $($res.data.id)" -ForegroundColor Green
        return $res.data
    } else {
        Write-Host "Failed to register cleaner $Email`: $($res.error)" -ForegroundColor Red
        return $null
    }
}

# Get Bob's provider ID from business profile
$bpCheck = Invoke-ApiGet "/api/v1/business-profiles/me?contactUserId=$($owner.id)"
$providerId = if ($bpCheck.succeeded -and $bpCheck.data) { $bpCheck.data.id } else { $owner.id }

Register-Cleaner "Thabo" "Mokoena" "cleaner1@spotless.co.za" "0731112222" $providerId 1 @("Standard Cleaning", "Window Cleaning") @("Claremont", "Rondebosch")
Register-Cleaner "Lerato" "Dlamini" "cleaner2@spotless.co.za" "0732223333" $providerId 2 @("Deep Cleaning", "Carpet Cleaning") @("Newlands", "Observatory")

# ------------------------------------------------------------------
# 5. Fetch a Service for bookings
# ------------------------------------------------------------------
$servicesRaw = Invoke-WebRequest -Uri "$ApiBase/api/v1/services" -Method GET -UseBasicParsing
$services = @($servicesRaw.Content | ConvertFrom-Json)
$serviceId = $services.id[0]
$serviceName = $services.name[0]
$servicePrice = $services.basePrice[0]
Write-Host "Found Service    : $serviceName | ID: $serviceId | Price: R$servicePrice" -ForegroundColor Green

# ------------------------------------------------------------------
# 6. Create EFT Booking (payOnsite = false => PendingPayment)
# ------------------------------------------------------------------
$tomorrow = (Get-Date).AddDays(1).Date.AddHours(9).ToUniversalTime()
$scheduledStart = $tomorrow.ToString("yyyy-MM-ddTHH:mm:ssZ")
$scheduledEnd = $tomorrow.AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$eftPayload = @{
    CustomerProfileId = $customerProfileId
    ServiceId         = $serviceId
    AddressId         = $addressId
    ScheduledStart    = $scheduledStart
    ScheduledEnd      = $scheduledEnd
    SpecialInstructions = "EFT test booking - please use side gate"
    AccessNotes       = "Ring intercom, unit 12"
    HasPets           = $true
    ParkingInformation = "Visitor bay B3"
    PayOnsite         = $false
}
$eftRes = Invoke-ApiPost "/api/v1/cleaning-bookings" $eftPayload
if ($eftRes.succeeded) {
    Write-Host "Created EFT Booking    : ID=$($eftRes.data.id) | Status=$($eftRes.data.status) | PayOnsite=$($eftRes.data.payOnsite)" -ForegroundColor Green
} else {
    Write-Host "Failed to create EFT booking: $($eftRes.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 7. Create Pay Onsite Booking (payOnsite = true => Confirmed)
# ------------------------------------------------------------------
$dayAfter = (Get-Date).AddDays(2).Date.AddHours(14).ToUniversalTime()
$scheduledStart2 = $dayAfter.ToString("yyyy-MM-ddTHH:mm:ssZ")
$scheduledEnd2 = $dayAfter.AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$onsitePayload = @{
    CustomerProfileId = $customerProfileId
    ServiceId         = $serviceId
    AddressId         = $addressId
    ScheduledStart    = $scheduledStart2
    ScheduledEnd      = $scheduledEnd2
    SpecialInstructions = "Pay onsite test booking - cash preferred"
    AccessNotes       = "Reception desk, ask for Alice"
    HasPets           = $false
    ParkingInformation = "Street parking available"
    PayOnsite         = $true
}
$onsiteRes = Invoke-ApiPost "/api/v1/cleaning-bookings" $onsitePayload
if ($onsiteRes.succeeded) {
    Write-Host "Created PayOnsite Booking: ID=$($onsiteRes.data.id) | Status=$($onsiteRes.data.status) | PayOnsite=$($onsiteRes.data.payOnsite)" -ForegroundColor Green
} else {
    Write-Host "Failed to create Pay Onsite booking: $($onsiteRes.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 8. Final Summary
# ------------------------------------------------------------------
Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "                      SEED SUMMARY                         " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

Write-Host "`n👤 CUSTOMER" -ForegroundColor Cyan
Write-Host "   Name     : Alice Customer" -ForegroundColor White
Write-Host "   Email    : alice@example.com" -ForegroundColor White
Write-Host "   Password : Password123" -ForegroundColor White
Write-Host "   Role     : Customer" -ForegroundColor White
Write-Host "   Profile  : $customerProfileId" -ForegroundColor White

Write-Host "`n🏢 PROVIDER OWNER" -ForegroundColor Cyan
Write-Host "   Name     : Bob Provider" -ForegroundColor White
Write-Host "   Email    : bob@example.com" -ForegroundColor White
Write-Host "   Password : Password123" -ForegroundColor White
Write-Host "   Role     : ProviderOwner" -ForegroundColor White
Write-Host "   Company  : Spotless Solutions" -ForegroundColor White
Write-Host "   Reg No   : 2023/123456/07" -ForegroundColor White
Write-Host "   Tax No   : 9123456789" -ForegroundColor White
Write-Host "   Services : Cleaning, CarWash" -ForegroundColor White
Write-Host "   Areas    : Claremont, Rondebosch, Newlands, Observatory, Woodstock" -ForegroundColor White

Write-Host "`n🧹 CLEANERS (registered under Spotless Solutions)" -ForegroundColor Cyan
Write-Host "   Cleaner 1: Thabo Mokoena  |  cleaner1@spotless.co.za  |  Password123" -ForegroundColor White
Write-Host "   Cleaner 2: Lerato Dlamini  |  cleaner2@spotless.co.za  |  Password123" -ForegroundColor White

if ($eftRes.succeeded) {
    Write-Host "`n💳 EFT PAYMENT BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($eftRes.data.id)" -ForegroundColor White
    Write-Host "   Service    : $($eftRes.data.serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($eftRes.data.status)" -ForegroundColor White
    Write-Host "   PayOnsite  : $($eftRes.data.payOnsite)" -ForegroundColor White
    Write-Host "   Price      : R$($eftRes.data.price) $($eftRes.data.currency)" -ForegroundColor White
}

if ($onsiteRes.succeeded) {
    Write-Host "`n💰 PAY ONSITE BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($onsiteRes.data.id)" -ForegroundColor White
    Write-Host "   Service    : $($onsiteRes.data.serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($onsiteRes.data.status)" -ForegroundColor White
    Write-Host "   PayOnsite  : $($onsiteRes.data.payOnsite)" -ForegroundColor White
    Write-Host "   Price      : R$($onsiteRes.data.price) $($onsiteRes.data.currency)" -ForegroundColor White
}

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "Done. Log in with any of the above accounts." -ForegroundColor Green
Write-Host ""
