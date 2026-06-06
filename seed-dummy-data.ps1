#requires -Version 5.1
<#
.SYNOPSIS
    Seeds 1 dummy customer and 1 dummy business owner into the CleanConnect database via API.
.DESCRIPTION
    Creates a customer user with address and a provider-owner user with business profile,
    then prints their login credentials. Skips if users already exist.
.NOTES
    Run this while the API is running (default: http://localhost:5000).
#>

$ErrorActionPreference = "Stop"
$ApiBase = "http://localhost:5000"

function Invoke-ApiPost($Path, $Body) {
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    Write-Host "POST $Path => $json" -ForegroundColor DarkGray
    try {
        $resp = Invoke-RestMethod -Uri "$ApiBase$Path" -Method POST -ContentType "application/json" -Body $json
        return $resp
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
            $reader.Close()
            Write-Host "ERROR $Path ($($_.Exception.Response.StatusCode)): $errBody" -ForegroundColor Red
        } else {
            Write-Host "ERROR $Path`: API unreachable ($($_.Exception.Message))" -ForegroundColor Red
        }
        throw
    } catch {
        $msg = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        Write-Host "ERROR $Path`: $msg" -ForegroundColor Red
        throw
    }
}

function Get-UserByEmail($Email) {
    try {
        $resp = Invoke-RestMethod -Uri "$ApiBase/api/v1/users?page=1&pageSize=50" -Method GET -ContentType "application/json"
        if ($resp.succeeded -and $resp.data) {
            foreach ($item in $resp.data.items) {
                if ($item.email -eq $Email) { return $item }
            }
        }
    } catch { <# ignore #> }
    return $null
}

Write-Host "`nSeeding dummy data into CleanConnect API at $ApiBase ..." -ForegroundColor Cyan

# ------------------------------------------------------------------
# 1. Create Customer (idempotent)
# ------------------------------------------------------------------
$customer = Get-UserByEmail "alice@example.com"
if ($customer) {
    Write-Host "Customer already exists: $($customer.firstName) $($customer.lastName) | ID: $($customer.id)" -ForegroundColor Yellow
} else {
    $customerPayload = @{
        firstName   = "Alice"
        lastName    = "Customer"
        email       = "alice@example.com"
        phoneNumber = "0712345678"
        passwordHash= "Password123"
        role        = 1      # Customer
        status      = 1      # Active
        customerProfile = @{
            customerType = 1      # Residential
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
    Write-Host "Created Customer  : $($customer.firstName) $($customer.lastName)  |  ID: $($customer.id)" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 2. Create Business Owner (ProviderOwner) (idempotent)
# ------------------------------------------------------------------
# NOTE: UserRole enum values: Customer=1, BusinessCustomer=2, Cleaner=3, Supervisor=4, Admin=5,
#       OperationsManager=6, FinanceManager=7, ProviderOwner=8, ProviderStaff=9
$owner = Get-UserByEmail "bob@example.com"
if ($owner) {
    Write-Host "Provider owner already exists: $($owner.firstName) $($owner.lastName) | ID: $($owner.id) | Role: $($owner.role)" -ForegroundColor Yellow
    # Fix role if it was previously created as Supervisor (4) instead of ProviderOwner (8)
    if ($owner.role -eq "Supervisor") {
        Write-Host "  → Updating role from Supervisor to ProviderOwner..." -ForegroundColor Cyan
        $updatePayload = @{
            firstName   = $owner.firstName
            lastName    = $owner.lastName
            email       = $owner.email
            phoneNumber = $owner.phoneNumber
            role        = 8   # ProviderOwner
            status      = 1   # Active
        }
        try {
            $json = $updatePayload | ConvertTo-Json -Depth 10 -Compress
            $resp = Invoke-RestMethod -Uri "$ApiBase/api/v1/users/$($owner.id)" -Method PUT -ContentType "application/json" -Body $json
            if ($resp.succeeded) {
                $owner = $resp.data
                Write-Host "  → Role updated to ProviderOwner." -ForegroundColor Green
            }
        } catch {
            Write-Host "  → Could not update role: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    $ownerPayload = @{
        firstName   = "Bob"
        lastName    = "Provider"
        email       = "bob@example.com"
        phoneNumber = "0723456789"
        passwordHash= "Password123"
        role        = 8      # ProviderOwner
        status      = 1      # Active
    }
    $ownerRes = Invoke-ApiPost "/api/v1/users" $ownerPayload
    if (-not $ownerRes.succeeded) {
        Write-Host "Failed to create business owner: $($ownerRes.error)" -ForegroundColor Red
        exit 1
    }
    $owner = $ownerRes.data
    Write-Host "Created Provider  : $($owner.firstName) $($owner.lastName)  |  ID: $($owner.id)" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 3. Create Business Profile for the owner
# ------------------------------------------------------------------
$existingProfile = $null
if ($owner.id) {
    try {
        $bp = Invoke-RestMethod -Uri "$ApiBase/api/v1/business-profiles/me?contactUserId=$($owner.id)" -Method GET -ContentType "application/json"
        if ($bp.succeeded -and $bp.data) { $existingProfile = $bp.data }
    } catch { <# ignore #> }
}

if ($existingProfile) {
    Write-Host "Business profile already exists: $($existingProfile.companyName) | ID: $($existingProfile.id)" -ForegroundColor Yellow
    $biz = $existingProfile
} else {
    $bizPayload = @{
        contactUserId      = $owner.id
        companyName        = "Spotless Solutions"
        registrationNumber = "2023/123456/07"
        taxNumber          = "9123456789"
        serviceCategories  = @(1, 3)     # Cleaning, CarWash
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
        membershipPlanId   = $null
        verificationPassed = $true
        paymentCompleted   = $true
    }
    $bizRes = Invoke-ApiPost "/api/v1/business-profiles" $bizPayload
    if (-not $bizRes.succeeded) {
        Write-Host "Failed to create business profile: $($bizRes.error)" -ForegroundColor Red
        exit 1
    }
    $biz = $bizRes.data
    Write-Host "Created Business  : $($biz.companyName)  |  ProviderID: $($biz.id)" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 4. Register Cleaners for the Provider (idempotent)
# ------------------------------------------------------------------
$cleaner1 = Get-UserByEmail "cleaner1@spotless.co.za"
if (-not $cleaner1) {
    $c1Payload = @{
        firstName       = "Thabo"
        lastName        = "Mokoena"
        email           = "cleaner1@spotless.co.za"
        phoneNumber     = "0731112222"
        passwordHash    = "Password123"
        providerId      = $biz.id
        employmentType  = 1      # FullTime
        skills          = "Deep cleaning, carpet shampoo, window washing"
        serviceZones    = "Claremont,Rondebosch,Newlands"
    }
    $c1Res = Invoke-ApiPost "/api/v1/cleaners" $c1Payload
    if ($c1Res.succeeded) {
        $cleaner1 = $c1Res.data
        Write-Host "Registered Cleaner: $($cleaner1.firstName) $($cleaner1.lastName) | ID: $($cleaner1.id)" -ForegroundColor Green
    } else {
        Write-Host "Cleaner1 skipped: $($c1Res.error)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Cleaner1 already exists: $($cleaner1.firstName) $($cleaner1.lastName)" -ForegroundColor Yellow
}

$cleaner2 = Get-UserByEmail "cleaner2@spotless.co.za"
if (-not $cleaner2) {
    $c2Payload = @{
        firstName       = "Lerato"
        lastName        = "Dlamini"
        email           = "cleaner2@spotless.co.za"
        phoneNumber     = "0732223333"
        passwordHash    = "Password123"
        providerId      = $biz.id
        employmentType  = 2      # PartTime
        skills          = "Office cleaning, sanitization, floor polishing"
        serviceZones    = "Woodstock,Observatory,City Bowl"
    }
    $c2Res = Invoke-ApiPost "/api/v1/cleaners" $c2Payload
    if ($c2Res.succeeded) {
        $cleaner2 = $c2Res.data
        Write-Host "Registered Cleaner: $($cleaner2.firstName) $($cleaner2.lastName) | ID: $($cleaner2.id)" -ForegroundColor Green
    } else {
        Write-Host "Cleaner2 skipped: $($c2Res.error)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Cleaner2 already exists: $($cleaner2.firstName) $($cleaner2.lastName)" -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# 5. Print Credentials
# ------------------------------------------------------------------
Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "                    DUMMY LOGIN CREDENTIALS                " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

Write-Host "`n👤 CUSTOMER" -ForegroundColor Cyan
Write-Host "   Email    : alice@example.com" -ForegroundColor White
Write-Host "   Password : Password123" -ForegroundColor White
Write-Host "   Role     : Customer" -ForegroundColor White
Write-Host "   Address  : 123 Main Street, Sandton, Johannesburg" -ForegroundColor White

Write-Host "`n🏢 BUSINESS OWNER" -ForegroundColor Cyan
Write-Host "   Email    : bob@example.com" -ForegroundColor White
Write-Host "   Password : Password123" -ForegroundColor White
Write-Host "   Role     : ProviderOwner" -ForegroundColor White
Write-Host "   Company  : Spotless Solutions" -ForegroundColor White
Write-Host "   Tax No   : 9123456789" -ForegroundColor White
Write-Host "   Services : Cleaning, CarWash" -ForegroundColor White
Write-Host "   Areas    : Claremont, Rondebosch, Newlands, Observatory, Woodstock" -ForegroundColor White
Write-Host "   Status   : Approved, Eligible for bookings" -ForegroundColor White

Write-Host "`n🧹 CLEANERS (registered under Spotless Solutions)" -ForegroundColor Cyan
Write-Host "   Cleaner 1: Thabo Mokoena  |  cleaner1@spotless.co.za  |  Password123" -ForegroundColor White
Write-Host "   Cleaner 2: Lerato Dlamini  |  cleaner2@spotless.co.za  |  Password123" -ForegroundColor White

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "Done. You can now log in with any account." -ForegroundColor Green
Write-Host ""
