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
    if ($resp.succeeded -and $resp.data) {
        # Handle both paginated { items: [] } and flat array responses
        $list = if ($resp.data.items) { $resp.data.items } else { $resp.data }
        return @($list) | Where-Object { $_.email -eq $Email } | Select-Object -First 1
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
    if ($customerRes.succeeded) {
        $customer = $customerRes.data
        Write-Host "Created Customer  : $($customer.firstName) $($customer.lastName) | ID: $($customer.id)" -ForegroundColor Green
    } elseif ($customerRes.error -like "*already exists*") {
        $customer = Get-UserByEmail "alice@example.com"
        if ($customer) {
            Write-Host "Customer already exists (re-found): $($customer.firstName) $($customer.lastName)" -ForegroundColor Yellow
        } else {
            Write-Host "Failed to create or locate customer." -ForegroundColor Red; exit 1
        }
    } else {
        Write-Host "Failed to create customer: $($customerRes.error)" -ForegroundColor Red
        exit 1
    }
}
$customerProfileId = $customer.customerProfile.id
$addressId = Get-AddressFromDb $customerProfileId
if (-not $addressId) {
    Write-Host "WARN: Could not fetch address from DB. Using fallback." -ForegroundColor Yellow
    $addressId = "61886cb6-ef5d-45e1-9408-4d22fafcc9a9"
}

# ------------------------------------------------------------------
# 1b. Create / verify Admin User
# ------------------------------------------------------------------
$adminUser = Get-UserByEmail "admin@example.com"
if ($adminUser) {
    Write-Host "Admin user already exists: $($adminUser.firstName) $($adminUser.lastName) | ID: $($adminUser.id)" -ForegroundColor Yellow
} else {
    $adminPayload = @{
        firstName    = "System"
        lastName     = "Admin"
        email        = "admin@example.com"
        phoneNumber  = "0790000000"
        passwordHash = "Password123"
        role         = 5   # Admin
        status       = 1   # Active
    }
    $adminRes = Invoke-ApiPost "/api/v1/users" $adminPayload
    if ($adminRes.succeeded) {
        $adminUser = $adminRes.data
        Write-Host "Created Admin User  : $($adminUser.firstName) $($adminUser.lastName) | ID: $($adminUser.id)" -ForegroundColor Green
    } elseif ($adminRes.error -like "*already exists*") {
        $adminUser = Get-UserByEmail "admin@example.com"
        if ($adminUser) {
            Write-Host "Admin user already exists (re-found): $($adminUser.firstName) $($adminUser.lastName)" -ForegroundColor Yellow
        } else {
            Write-Host "Failed to create or locate admin user." -ForegroundColor Red
        }
    } else {
        Write-Host "Failed to create admin user: $($adminRes.error)" -ForegroundColor Red
    }
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
    if ($ownerRes.succeeded) {
        $owner = $ownerRes.data
        Write-Host "Created Provider  : $($owner.firstName) $($owner.lastName) | ID: $($owner.id)" -ForegroundColor Green
    } elseif ($ownerRes.error -like "*already exists*") {
        $owner = Get-UserByEmail "bob@example.com"
        if ($owner) {
            Write-Host "Provider already exists (re-found): $($owner.firstName) $($owner.lastName)" -ForegroundColor Yellow
        } else {
            Write-Host "Failed to create or locate provider owner." -ForegroundColor Red; exit 1
        }
    } else {
        Write-Host "Failed to create business owner: $($ownerRes.error)" -ForegroundColor Red
        exit 1
    }
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

# ------------------------------------------------------------------
# 4.5. Register Supervisor (idempotent)
# ------------------------------------------------------------------
function Register-Supervisor($FirstName, $LastName, $Email, $Phone, $ProviderId, $EmploymentType, $Skills, $ServiceZones) {
    $existing = Get-UserByEmail $Email
    if ($existing) {
        Write-Host "Supervisor already exists: $FirstName $LastName | $Email" -ForegroundColor Yellow
        return $existing
    }
    $payload = @{
        firstName      = $FirstName
        lastName       = $LastName
        email          = $Email
        phoneNumber    = $Phone
        passwordHash   = "Password123"
        providerId     = $ProviderId
        employmentType = $EmploymentType
        skills         = $Skills
        serviceZones   = $ServiceZones
    }
    $res = Invoke-ApiPost "/api/v1/supervisors" $payload
    if ($res.succeeded) {
        Write-Host "Registered Supervisor: $FirstName $LastName | $Email | ID: $($res.data.id)" -ForegroundColor Green
        return $res.data
    } else {
        Write-Host "Failed to register supervisor $Email`: $($res.error)" -ForegroundColor Red
        return $null
    }
}

# Get Bob's provider ID from business profile
$bpCheck = Invoke-ApiGet "/api/v1/business-profiles/me?contactUserId=$($owner.id)"
$providerId = if ($bpCheck.succeeded -and $bpCheck.data) { $bpCheck.data.id } else { $owner.id }

$cleaner1 = Register-Cleaner "Thabo" "Mokoena" "cleaner1@spotless.co.za" "0731112222" $providerId 1 "Standard Cleaning, Window Cleaning" "Claremont, Rondebosch"
$cleaner2 = Register-Cleaner "Lerato" "Dlamini" "cleaner2@spotless.co.za" "0732223333" $providerId 2 "Deep Cleaning, Carpet Cleaning" "Newlands, Observatory"
$supervisor = Register-Supervisor "Sipho" "Ndlovu" "supervisor1@spotless.co.za" "0733334444" $providerId 1 "Team Leadership, Quality Control, Deep Cleaning" "Claremont, Rondebosch, Newlands, Observatory"

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
    Write-Host "Created EFT Booking    : ID=$($eftRes.data[0].id) | Status=$($eftRes.data[0].status) | PayOnsite=$($eftRes.data[0].payOnsite)" -ForegroundColor Green
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
    Write-Host "Created PayOnsite Booking: ID=$($onsiteRes.data[0].id) | Status=$($onsiteRes.data[0].status) | PayOnsite=$($onsiteRes.data[0].payOnsite)" -ForegroundColor Green
} else {
    Write-Host "Failed to create Pay Onsite booking: $($onsiteRes.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 8. Create Accepted & Assigned Booking (for supervisor testing)
# ------------------------------------------------------------------
$today = (Get-Date).Date.AddHours(10).ToUniversalTime()
$scheduledStart3 = $today.ToString("yyyy-MM-ddTHH:mm:ssZ")
$scheduledEnd3 = $today.AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$assignedPayload = @{
    CustomerProfileId = $customerProfileId
    ServiceId         = $serviceId
    AddressId         = $addressId
    ScheduledStart    = $scheduledStart3
    ScheduledEnd      = $scheduledEnd3
    SpecialInstructions = "Team assignment test booking"
    AccessNotes       = "Main entrance, code 1234"
    HasPets           = $false
    ParkingInformation = "Driveway available"
    PayOnsite         = $true
}
$assignedRes = Invoke-ApiPost "/api/v1/cleaning-bookings" $assignedPayload
if ($assignedRes.succeeded) {
    $assignedBookingId = $assignedRes.data[0].id
    Write-Host "Created Assigned Booking: ID=$assignedBookingId | Status=$($assignedRes.data[0].status)" -ForegroundColor Green

    # Accept the booking
    $acceptPayload = @{ ProviderId = $providerId }
    $acceptRes = Invoke-ApiPost "/api/v1/cleaning-bookings/$assignedBookingId/accept" $acceptPayload
    if ($acceptRes.succeeded) {
        Write-Host "Accepted Booking: ID=$assignedBookingId" -ForegroundColor Green

        # Assign team (cleaners + supervisor)
        if ($cleaner1 -and $cleaner2 -and $supervisor) {
            $teamPayload = @{
                CleanerProfileIds = @($cleaner1.cleanerProfile.id, $cleaner2.cleanerProfile.id)
                SupervisorProfileId = $supervisor.supervisorProfile.id
            }
            $teamRes = Invoke-ApiPost "/api/v1/cleaning-bookings/$assignedBookingId/assign-team" $teamPayload
            if ($teamRes.succeeded) {
                Write-Host "Assigned Team to Booking: ID=$assignedBookingId | Cleaners: $($cleaner1.cleanerProfile.id), $($cleaner2.cleanerProfile.id) | Supervisor: $($supervisor.supervisorProfile.id)" -ForegroundColor Green
            } else {
                Write-Host "Failed to assign team: $($teamRes.error)" -ForegroundColor Red
            }
        } else {
            Write-Host "Skipping team assignment - missing cleaner or supervisor data" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Failed to accept booking: $($acceptRes.error)" -ForegroundColor Red
    }
} else {
    Write-Host "Failed to create assigned booking: $($assignedRes.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 8b. Create two extra bookings with one-time addresses outside range
# ------------------------------------------------------------------
$day3 = (Get-Date).AddDays(3).Date.AddHours(10).ToUniversalTime()
$scheduledStart4 = $day3.ToString("yyyy-MM-ddTHH:mm:ssZ")
$scheduledEnd4 = (Get-Date $day3).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$outside1Payload = @{
    CustomerProfileId = $customerProfileId
    ServiceId         = $serviceId
    AddressId         = $null
    OneTimeAddress    = @{
        streetAddress = "456 Church Street"
        suburb        = "Arcadia"
        city          = "Pretoria"
        province      = "Gauteng"
        postalCode    = "0083"
        label         = "Pretoria Office"
    }
    ScheduledStart      = $scheduledStart4
    ScheduledEnd        = $scheduledEnd4
    SpecialInstructions = "Outside-range test booking - Pretoria"
    AccessNotes         = "Front desk"
    HasPets             = $false
    ParkingInformation  = "Underground parking"
    PayOnsite           = $true
}
$outside1Res = Invoke-ApiPost "/api/v1/cleaning-bookings" $outside1Payload
if ($outside1Res.succeeded) {
    Write-Host "Created Outside-Range Booking 1: ID=$($outside1Res.data[0].id) | Status=$($outside1Res.data[0].status) | City=Pretoria" -ForegroundColor Green
} else {
    Write-Host "Failed to create outside-range booking 1: $($outside1Res.error)" -ForegroundColor Red
}

$day4 = (Get-Date).AddDays(4).Date.AddHours(14).ToUniversalTime()
$scheduledStart5 = $day4.ToString("yyyy-MM-ddTHH:mm:ssZ")
$scheduledEnd5 = (Get-Date $day4).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$outside2Payload = @{
    CustomerProfileId = $customerProfileId
    ServiceId         = $serviceId
    AddressId         = $null
    OneTimeAddress    = @{
        streetAddress = "78 Marine Parade"
        suburb        = "North Beach"
        city          = "Durban"
        province      = "KwaZulu-Natal"
        postalCode    = "4006"
        label         = "Durban Beachfront"
    }
    ScheduledStart      = $scheduledStart5
    ScheduledEnd        = $scheduledEnd5
    SpecialInstructions = "Outside-range test booking - Durban"
    AccessNotes         = "Reception"
    HasPets             = $true
    ParkingInformation  = "Street parking"
    PayOnsite           = $false
}
$outside2Res = Invoke-ApiPost "/api/v1/cleaning-bookings" $outside2Payload
if ($outside2Res.succeeded) {
    Write-Host "Created Outside-Range Booking 2: ID=$($outside2Res.data[0].id) | Status=$($outside2Res.data[0].status) | City=Durban" -ForegroundColor Green
} else {
    Write-Host "Failed to create outside-range booking 2: $($outside2Res.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 8c. Create Recurring Booking (weekly, 4 occurrences)
# ------------------------------------------------------------------
$day5 = (Get-Date).AddDays(5).Date.AddHours(9).ToUniversalTime()
$recurringStart = $day5.ToString("yyyy-MM-ddTHH:mm:ssZ")
$recurringEnd = (Get-Date $day5).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$recurringPayload = @{
    CustomerProfileId  = $customerProfileId
    ServiceId          = $serviceId
    AddressId          = $addressId
    ScheduledStart     = $recurringStart
    ScheduledEnd       = $recurringEnd
    SpecialInstructions = "Weekly recurring cleaning service"
    AccessNotes        = "Please use the side entrance"
    HasPets            = $false
    ParkingInformation = "Driveway"
    PayOnsite          = $false
    RecurrenceFrequency = "Weekly"
    RecurrenceCount    = 4
}
$recurringRes = Invoke-ApiPost "/api/v1/cleaning-bookings" $recurringPayload
if ($recurringRes.succeeded) {
    $recurringIds = $recurringRes.data | ForEach-Object { $_.id }
    Write-Host "Created Recurring Booking: $($recurringRes.data.Length) occurrences | IDs=$($recurringIds -join ', ') | Frequency=Weekly" -ForegroundColor Green
} else {
    Write-Host "Failed to create recurring booking: $($recurringRes.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 8d. Create Multi-Service Booking (requires provider to offer both categories)
# ------------------------------------------------------------------
$multiServiceId1 = $services.id[0]
$multiServiceName1 = $services.name[0]
$multiServiceId2 = if ($services.id.Length -gt 1) { $services.id[1] } else { $services.id[0] }
$multiServiceName2 = if ($services.name.Length -gt 1) { $services.name[1] } else { $services.name[0] }
$day6 = (Get-Date).AddDays(6).Date.AddHours(10).ToUniversalTime()
$multiStart = $day6.ToString("yyyy-MM-ddTHH:mm:ssZ")
$multiEnd = (Get-Date $day6).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")

$multiServicePayload = @{
    CustomerProfileId  = $customerProfileId
    ServiceIds         = @($multiServiceId1, $multiServiceId2)
    AddressId          = $addressId
    ScheduledStart     = $multiStart
    ScheduledEnd       = $multiEnd
    SpecialInstructions = "Multi-service booking test - both $multiServiceName1 and $multiServiceName2"
    AccessNotes        = "Multiple services requested"
    HasPets            = $false
    ParkingInformation = "Visitor parking"
    PayOnsite          = $false
}
$multiServiceRes = Invoke-ApiPost "/api/v1/cleaning-bookings" $multiServicePayload
if ($multiServiceRes.succeeded) {
    Write-Host "Created Multi-Service Booking: ID=$($multiServiceRes.data[0].id) | Services=$multiServiceName1 + $multiServiceName2 | Price=R$($multiServiceRes.data[0].price)" -ForegroundColor Green
} else {
    Write-Host "Failed to create multi-service booking: $($multiServiceRes.error)" -ForegroundColor Red
}

# ------------------------------------------------------------------
# 9. Final Summary
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

if ($adminUser) {
    Write-Host "`n🔐 ADMIN USER" -ForegroundColor Cyan
    Write-Host "   Name     : $($adminUser.firstName) $($adminUser.lastName)" -ForegroundColor White
    Write-Host "   Email    : $($adminUser.email)" -ForegroundColor White
    Write-Host "   Password : Password123" -ForegroundColor White
    Write-Host "   Role     : Admin" -ForegroundColor White
    Write-Host "   ID       : $($adminUser.id)" -ForegroundColor White
}

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

Write-Host "`n👷 SUPERVISOR (registered under Spotless Solutions)" -ForegroundColor Cyan
Write-Host "   Supervisor: Sipho Ndlovu  |  supervisor1@spotless.co.za  |  Password123" -ForegroundColor White

if ($eftRes.succeeded) {
    Write-Host "`n💳 EFT PAYMENT BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($eftRes.data[0].id)" -ForegroundColor White
    Write-Host "   Service    : $($eftRes.data[0].serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($eftRes.data[0].status)" -ForegroundColor White
    Write-Host "   PayOnsite  : $($eftRes.data[0].payOnsite)" -ForegroundColor White
    Write-Host "   Price      : R$($eftRes.data[0].price) $($eftRes.data[0].currency)" -ForegroundColor White
}

if ($onsiteRes.succeeded) {
    Write-Host "`n💰 PAY ONSITE BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($onsiteRes.data[0].id)" -ForegroundColor White
    Write-Host "   Service    : $($onsiteRes.data[0].serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($onsiteRes.data[0].status)" -ForegroundColor White
    Write-Host "   PayOnsite  : $($onsiteRes.data[0].payOnsite)" -ForegroundColor White
    Write-Host "   Price      : R$($onsiteRes.data[0].price) $($onsiteRes.data[0].currency)" -ForegroundColor White
}

if ($assignedRes.succeeded) {
    Write-Host "`n👷 ASSIGNED TEAM BOOKING (for supervisor testing)" -ForegroundColor Cyan
    Write-Host "   Booking ID : $assignedBookingId" -ForegroundColor White
    Write-Host "   Service    : $serviceName" -ForegroundColor White
    Write-Host "   Status     : Accepted & Assigned" -ForegroundColor White
    Write-Host "   Team       : 2 Cleaners + 1 Supervisor" -ForegroundColor White
}

if ($outside1Res.succeeded) {
    Write-Host "`n🌍 OUTSIDE-RANGE BOOKING 1" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($outside1Res.data[0].id)" -ForegroundColor White
    Write-Host "   Service    : $($outside1Res.data[0].serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($outside1Res.data[0].status)" -ForegroundColor White
    Write-Host "   City       : Pretoria (outside 25 km radius)" -ForegroundColor White
}

if ($outside2Res.succeeded) {
    Write-Host "`n🌍 OUTSIDE-RANGE BOOKING 2" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($outside2Res.data[0].id)" -ForegroundColor White
    Write-Host "   Service    : $($outside2Res.data[0].serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($outside2Res.data[0].status)" -ForegroundColor White
    Write-Host "   City       : Durban (outside 25 km radius)" -ForegroundColor White
}

if ($recurringRes.succeeded) {
    Write-Host "`n🔄 RECURRING BOOKING (Weekly, 4 occurrences)" -ForegroundColor Cyan
    foreach ($b in $recurringRes.data) {
        Write-Host "   Booking ID : $($b.id) | $($b.scheduledStart) | Status=$($b.status)" -ForegroundColor White
    }
}

if ($multiServiceRes.succeeded) {
    $multiId = $multiServiceRes.data[0].id
    $multiPrice = $multiServiceRes.data[0].price
    Write-Host "`nMULTI-SERVICE BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $multiId" -ForegroundColor White
    Write-Host "   Services   : $multiServiceName1 + $multiServiceName2" -ForegroundColor White
    Write-Host "   Price      : R$multiPrice" -ForegroundColor White
}

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "Done. Log in with any of the above accounts." -ForegroundColor Green
Write-Host ""
