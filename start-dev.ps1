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

# Start Aspire backend in a new terminal window
Write-Host ""
Write-Host "Starting Aspire backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$RepoRoot'; Write-Host 'Starting Aspire AppHost...' -ForegroundColor Cyan; dotnet run --project src\CleanConnect.AppHost"
) -WindowStyle Normal

# Wait for Aspire to begin initialising before launching frontend
Write-Host "Waiting for Aspire to initialise..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

# Start Next.js frontend in a new terminal window
Write-Host "Starting Next.js frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$RepoRoot\frontend'; Write-Host 'Starting Next.js dev server...' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services launching!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend   -> http://localhost:3000" -ForegroundColor White
Write-Host "  API        -> http://localhost:5000" -ForegroundColor White
Write-Host "  Scalar     -> http://localhost:5000/scalar/v1" -ForegroundColor White
Write-Host "  Dashboard  -> https://localhost:17131" -ForegroundColor White
Write-Host ""
Write-Host "Close the two terminal windows to stop." -ForegroundColor Gray
