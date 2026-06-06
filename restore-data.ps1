#Requires -Version 5.1
<#
.SYNOPSIS
    Restores the CleanConnect PostgreSQL database from a .sql backup file.

.DESCRIPTION
    Uses psql to restore a plain SQL backup of the cleanconnect database.
    Requires PostgreSQL client tools (psql) to be installed and on PATH.
    WARNING: This drops and recreates the target database. All current data will be lost.

.PARAMETER BackupFile
    Path to the .sql backup file to restore. If omitted, lists available backups.
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Parse connection string from appsettings.json
# ---------------------------------------------------------------------------
$AppSettingsPath = Join-Path $PSScriptRoot "src\CleanConnect.Api\appsettings.json"
if (-not (Test-Path $AppSettingsPath)) {
    Write-Host "ERROR: appsettings.json not found at $AppSettingsPath" -ForegroundColor Red
    exit 1
}

$settings = Get-Content $AppSettingsPath -Raw | ConvertFrom-Json
$conn = $settings.ConnectionStrings.CleanConnectDatabase

$parts = @{}
$conn.Split(';') | ForEach-Object {
    if ($_.Trim()) {
        $kv = $_.Split('=', 2)
        if ($kv.Length -eq 2) { $parts[$kv[0].Trim()] = $kv[1].Trim() }
    }
}

$pgHost     = $parts['Host']     ?? $parts['Server']   ?? 'localhost'
$pgPort     = $parts['Port']    ?? '5432'
$pgDatabase = $parts['Database'] ?? $parts['Database Name'] ?? 'cleanconnect'
$pgUser     = $parts['Username'] ?? $parts['User Id']   ?? 'postgres'
$pgPassword = $parts['Password'] ?? ''

# ---------------------------------------------------------------------------
# Verify psql is available
# ---------------------------------------------------------------------------
$psql = Get-Command "psql" -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "ERROR: psql not found on PATH." -ForegroundColor Red
    Write-Host "       Install PostgreSQL client tools or add them to your PATH." -ForegroundColor Yellow
    Write-Host "       Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# List available backups if no file was provided
# ---------------------------------------------------------------------------
$BackupDir = Join-Path $PSScriptRoot "backups"
if (-not $BackupFile) {
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " CleanConnect Database Restore" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\restore-data.ps1 -BackupFile `"<path-to-backup.sql>`"" -ForegroundColor White
    Write-Host ""

    if (-not (Test-Path $BackupDir)) {
        Write-Host "No backups folder found. Run .\backup-data.ps1 first." -ForegroundColor Yellow
        exit 0
    }

    $backups = Get-ChildItem $BackupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending
    if ($backups.Count -eq 0) {
        Write-Host "No .sql backup files found in $BackupDir" -ForegroundColor Yellow
        exit 0
    }

    Write-Host "Available backups:" -ForegroundColor Cyan
    $idx = 1
    foreach ($b in $backups) {
        $size = [math]::Round($b.Length / 1KB, 2)
        Write-Host "  [$idx] $($b.Name)  ($size KB, $($b.LastWriteTime))" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    Write-Host "Run with:" -ForegroundColor Yellow
    Write-Host "  .\restore-data.ps1 -BackupFile `"$($backups[0].FullName)`"" -ForegroundColor White
    exit 0
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Confirm destructive operation
# ---------------------------------------------------------------------------
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " CleanConnect Database Restore" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "WARNING: This will DROP and RECREATE the database '$pgDatabase'." -ForegroundColor Red
Write-Host "         All existing data will be permanently lost." -ForegroundColor Red
Write-Host ""
Write-Host "Host     : $pgHost" -ForegroundColor Gray
Write-Host "Port     : $pgPort" -ForegroundColor Gray
Write-Host "Database : $pgDatabase" -ForegroundColor Gray
Write-Host "User     : $pgUser" -ForegroundColor Gray
Write-Host "Source   : $BackupFile" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Type 'RESTORE' to confirm and proceed"
if ($confirm -ne 'RESTORE') {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------------
# Terminate existing connections, drop and recreate the database
# ---------------------------------------------------------------------------
$env:PGPASSWORD = $pgPassword

try {
    Write-Host "Terminating existing connections to '$pgDatabase'..." -ForegroundColor DarkGray
    & psql `
        --host=$pgHost `
        --port=$pgPort `
        --username=$pgUser `
        --dbname=postgres `
        --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$pgDatabase' AND pid <> pg_backend_pid();"
    <# ignore exit code — some backends may not exist #>

    Write-Host "Dropping database '$pgDatabase'..." -ForegroundColor DarkGray
    & psql `
        --host=$pgHost `
        --port=$pgPort `
        --username=$pgUser `
        --dbname=postgres `
        --command="DROP DATABASE IF EXISTS \"$pgDatabase\";"
    if ($LASTEXITCODE -ne 0) { throw "Failed to drop database (exit $LASTEXITCODE)" }

    Write-Host "Creating database '$pgDatabase'..." -ForegroundColor DarkGray
    & psql `
        --host=$pgHost `
        --port=$pgPort `
        --username=$pgUser `
        --dbname=postgres `
        --command="CREATE DATABASE \"$pgDatabase\";"
    if ($LASTEXITCODE -ne 0) { throw "Failed to create database (exit $LASTEXITCODE)" }

    # ---------------------------------------------------------------------------
    # Restore from backup file
    # ---------------------------------------------------------------------------
    Write-Host "Restoring from $BackupFile ..." -ForegroundColor DarkGray
    Get-Content $BackupFile -Raw | & psql `
        --host=$pgHost `
        --port=$pgPort `
        --username=$pgUser `
        --dbname=$pgDatabase

    if ($LASTEXITCODE -ne 0) { throw "psql restore exited with code $LASTEXITCODE" }

    Write-Host "`nRestore completed successfully." -ForegroundColor Green
    Write-Host "Database '$pgDatabase' is ready on $pgHost`:$pgPort" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Restore failed — $_" -ForegroundColor Red
    exit 1
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
