#requires -Version 5.1
<#
.SYNOPSIS
    Seeds 2 sample bookings: one EFT payment and one Pay Onsite.
.DESCRIPTION
    Creates a Standard Home Cleaning booking (EFT) and a Deep Cleaning booking (Pay Onsite).
    Requires the API to be running and the dummy customer to exist.
.NOTES
    API default: http://localhost:5000
#>

$ErrorActionPreference = "Stop"
$ApiBase = "http://localhost:5000"

function Invoke-ApiPost($Path, $Body) {
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    Write-Host "POST $Path => $json" -ForegroundColor DarkGray
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
    $resp = Invoke-WebRequest -Uri "$ApiBase$Path" -Method GET -ContentType "application/json" -UseBasicParsing
    return $resp.Content | ConvertFrom-Json
}

Write-Host "`nSeeding sample bookings into CleanConnect API at $ApiBase ..." -ForegroundColor Cyan

# ------------------------------------------------------------------
# 1. Find Customer (Alice)
# ------------------------------------------------------------------
$usersResp = Invoke-ApiGet "/api/v1/users?page=1&pageSize=50"
if (-not $usersResp.succeeded) {
    Write-Host "Failed to fetch users. Is the API running?" -ForegroundColor Red
    exit 1
}
$customer = $usersResp.data.items | Where-Object { $_.email -eq "alice@example.com" }
if (-not $customer) {
    Write-Host "Customer 'alice@example.com' not found. Run .\seed-dummy-data.ps1 first." -ForegroundColor Red
    exit 1
}
$customerProfileId = $customer.customerProfile.id
Write-Host "Found Customer   : $($customer.firstName) $($customer.lastName) | Profile: $customerProfileId" -ForegroundColor Green

# ------------------------------------------------------------------
# 2. Get Alice's address from DB
# ------------------------------------------------------------------
$pgContainer = docker ps --format "{{.Names}}" | Select-String "postgres" | Select-Object -First 1
$addressId = $null
if ($pgContainer) {
    $env:PGPASSWORD = "postgres"
    $sqlFile = "C:\Users\Public\pcom86\tmp-addr.sql"
    'SELECT "Id" FROM "cleanconnect"."addresses" WHERE "CustomerProfileId" = ''' + $customerProfileId + ''' LIMIT 1;' | Set-Content -Path $sqlFile -Encoding UTF8
    docker cp $sqlFile ${pgContainer}:/tmp/addr.sql 2>$null
    $addrResult = docker exec -e PGPASSWORD=postgres $pgContainer psql -U postgres -d cleanconnect -t -f /tmp/addr.sql 2>$null
    $addrMatch = [regex]::Match($addrResult, "[a-f0-9-]{36}")
    if ($addrMatch.Success) {
        $addressId = $addrMatch.Value
    }
}
if (-not $addressId) {
    Write-Host "WARN: Could not fetch address from DB. Using fallback." -ForegroundColor Yellow
    $addressId = "61886cb6-ef5d-45e1-9408-4d22fafcc9a9"
}

# ------------------------------------------------------------------
# 3. Find a Service
# ------------------------------------------------------------------
$servicesRaw = Invoke-WebRequest -Uri "$ApiBase/api/v1/services" -Method GET -UseBasicParsing
$services = @($servicesRaw.Content | ConvertFrom-Json)
$serviceId = $services.id[0]
$serviceName = $services.name[0]
$servicePrice = $services.basePrice[0]
Write-Host "Found Service    : $serviceName | ID: $serviceId | Price: R$servicePrice" -ForegroundColor Green

# ------------------------------------------------------------------
# 4. Create EFT Booking (payOnsite = false => PendingPayment)
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
# 5. Create Pay Onsite Booking (payOnsite = true => Confirmed)
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
# 6. Summary
# ------------------------------------------------------------------
Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "                    BOOKING SUMMARY                        " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

if ($eftRes.succeeded) {
    Write-Host "`n?? EFT PAYMENT BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($eftRes.data.id)" -ForegroundColor White
    Write-Host "   Service    : $($eftRes.data.serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($eftRes.data.status)" -ForegroundColor White
    Write-Host "   Payment    : $($eftRes.data.paymentStatus)" -ForegroundColor White
    Write-Host "   PayOnsite  : $($eftRes.data.payOnsite)" -ForegroundColor White
    Write-Host "   Scheduled  : $tomorrow" -ForegroundColor White
    Write-Host "   Price      : R$($eftRes.data.price) $($eftRes.data.currency)" -ForegroundColor White
}

if ($onsiteRes.succeeded) {
    Write-Host "`n?? PAY ONSITE BOOKING" -ForegroundColor Cyan
    Write-Host "   Booking ID : $($onsiteRes.data.id)" -ForegroundColor White
    Write-Host "   Service    : $($onsiteRes.data.serviceName)" -ForegroundColor White
    Write-Host "   Status     : $($onsiteRes.data.status)" -ForegroundColor White
    Write-Host "   Payment    : $($onsiteRes.data.paymentStatus)" -ForegroundColor White
    Write-Host "   PayOnsite  : $($onsiteRes.data.payOnsite)" -ForegroundColor White
    Write-Host "   Scheduled  : $dayAfter" -ForegroundColor White
    Write-Host "   Price      : R$($onsiteRes.data.price) $($onsiteRes.data.currency)" -ForegroundColor White
}

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "Done. Log in as Bob (ProviderOwner) to view and accept jobs." -ForegroundColor Green
Write-Host ""
