#Requires -Version 5.1
<#
.SYNOPSIS
    Backs up the CleanConnect PostgreSQL database to a timestamped .sql file.

.DESCRIPTION
    Uses pg_dump to create a plain SQL backup of the cleanconnect database.
    Requires PostgreSQL client tools (pg_dump) to be installed and on PATH.
    The connection details are read from appsettings.json.
#>

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

# Parse key=value pairs from the connection string
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
# Verify pg_dump is available
# ---------------------------------------------------------------------------
$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Host "ERROR: pg_dump not found on PATH." -ForegroundColor Red
    Write-Host "       Install PostgreSQL client tools or add them to your PATH." -ForegroundColor Yellow
    Write-Host "       Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# Create backup directory and filename
# ---------------------------------------------------------------------------
$BackupDir = Join-Path $PSScriptRoot "backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile  = Join-Path $BackupDir "cleanconnect_backup_${timestamp}.sql"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " CleanConnect Database Backup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Host     : $pgHost" -ForegroundColor Gray
Write-Host "Port     : $pgPort" -ForegroundColor Gray
Write-Host "Database : $pgDatabase" -ForegroundColor Gray
Write-Host "User     : $pgUser" -ForegroundColor Gray
Write-Host "Output   : $backupFile" -ForegroundColor Gray
Write-Host ""

# ---------------------------------------------------------------------------
# Run pg_dump
# ---------------------------------------------------------------------------
$env:PGPASSWORD = $pgPassword

try {
    & pg_dump `
        --host=$pgHost `
        --port=$pgPort `
        --username=$pgUser `
        --dbname=$pgDatabase `
        --format=plain `
        --verbose `
        --file="$backupFile"

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump exited with code $LASTEXITCODE"
    }

    $fileSize = (Get-Item $backupFile).Length
    Write-Host "Backup completed successfully." -ForegroundColor Green
    Write-Host "File size: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Green
    Write-Host "Location : $backupFile" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Backup failed — $_" -ForegroundColor Red
    if (Test-Path $backupFile) { Remove-Item $backupFile -Force }
    exit 1
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`nTo restore, run:" -ForegroundColor Yellow
Write-Host "  .\restore-data.ps1 -BackupFile `"$backupFile`"" -ForegroundColor White
