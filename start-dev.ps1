# CleanConnect Africa - Dev Environment Startup
# Usage: .\start-dev.ps1

$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CleanConnect Africa - Dev Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop any existing CleanConnect processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Stop-Process -Name "CleanConnect.Api","CleanConnect.AppHost","CleanConnect.Worker" -Force -ErrorAction SilentlyContinue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -eq "" 
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Done." -ForegroundColor Green

# Start Aspire backend in a new terminal window (output captured to log)
$aspireLog = "$env:TEMP\aspire-output-$(Get-Random).log"
Write-Host ""
Write-Host "Starting Aspire backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$RepoRoot'; Write-Host 'Starting Aspire AppHost...' -ForegroundColor Cyan; dotnet run --project src\CleanConnect.AppHost 2>&1 | Tee-Object -FilePath '$aspireLog'"
) -WindowStyle Normal

# Start Next.js frontend in a new terminal window (Aspire is already starting)
Write-Host "Starting Next.js frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$RepoRoot\frontend'; Write-Host 'Starting Next.js dev server...' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

# ------------------------------------------------------------------
# Poll for Aspire Dashboard (up to 30 seconds)
# ------------------------------------------------------------------
Write-Host "Waiting for Aspire Dashboard to start..." -ForegroundColor Yellow
$dashboardUrl = $null
$dashboardToken = $null
$maxWait = 30
$elapsed = 0

while ($elapsed -lt $maxWait -and -not $dashboardUrl) {
    Start-Sleep -Seconds 1
    $elapsed++

    # 1. Try reading the AppHost log for the dashboard URL
    $logContent = Get-Content $aspireLog -ErrorAction SilentlyContinue
    if ($logContent) {
        $match = $logContent | Select-String "Login to the dashboard at (.+)" | Select-Object -First 1
        if ($match) {
            $dashboardUrl = $match.Matches.Groups[1].Value
            $tokenMatch = [regex]::Match($dashboardUrl, "t=([a-zA-Z0-9_-]+)")
            if ($tokenMatch.Success) { $dashboardToken = $tokenMatch.Groups[1].Value }
            break
        }
    }

    # 2. Fallback: discover dashboard port from running Aspire.Dashboard process
    $dashProc = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        $cmd -like "*Aspire.Dashboard.dll*"
    } | Select-Object -First 1

    if ($dashProc) {
        $ports = Get-NetTCPConnection | Where-Object {
            $_.OwningProcess -eq $dashProc.Id -and $_.State -eq "Listen" -and
            ($_.LocalAddress -eq "127.0.0.1" -or $_.LocalAddress -eq "::1")
        } | Select-Object -ExpandProperty LocalPort | Sort-Object | Get-Unique
        $uiPort = $ports | Select-Object -First 1
        if ($uiPort) {
            $dashboardUrl = "http://localhost:$uiPort/login"
            # Try to extract token from the live page redirect
            try {
                $r = Invoke-WebRequest -Uri "http://localhost:$uiPort/" -Method GET -UseBasicParsing -TimeoutSec 3 -MaximumRedirection 0
            } catch {
                if ($_.Exception.Response -and $_.Exception.Response.Headers["Location"]) {
                    $loc = $_.Exception.Response.Headers["Location"]
                    $tokenMatch = [regex]::Match($loc, "t=([a-zA-Z0-9_-]+)")
                    if ($tokenMatch.Success) { $dashboardToken = $tokenMatch.Groups[1].Value }
                }
            }
            break
        }
    }
}

if ($dashboardUrl) {
    Write-Host "Dashboard ready in ${elapsed}s." -ForegroundColor Green
} else {
    Write-Host "Dashboard not detected within ${maxWait}s." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services launching!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend   -> http://localhost:3000" -ForegroundColor White
Write-Host "  API        -> http://localhost:5000" -ForegroundColor White
Write-Host "  Scalar     -> http://localhost:5000/scalar/v1" -ForegroundColor White
if ($dashboardUrl) {
    Write-Host "  Dashboard  -> $dashboardUrl" -ForegroundColor White
    if ($dashboardToken) {
        Write-Host "  Token      -> $dashboardToken" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Dashboard  -> (still starting...)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Close the two terminal windows to stop." -ForegroundColor Gray
