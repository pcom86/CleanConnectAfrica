# Fix large files that were accidentally committed
# Run this from the repo root

$ErrorActionPreference = "Stop"

$repoPath = "C:\Users\Public\pcom86\repos\CleanConnectAfrica"
Set-Location $repoPath

function Find-Git {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) { return $gitCmd.Source }

    $candidates = @(
        "C:\Program Files\Git\bin\git.exe"
        "C:\Program Files\Git\cmd\git.exe"
        "C:\Program Files (x86)\Git\bin\git.exe"
        "C:\Program Files (x86)\Git\cmd\git.exe"
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Git\bin\git.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$gitPath = Find-Git
if (-not $gitPath) {
    Write-Host "ERROR: git.exe not found." -ForegroundColor Red
    exit 1
}

function Invoke-Git {
    & $gitPath @args
    if ($LASTEXITCODE -ne 0) { throw "git command failed: $args" }
}

Write-Host "Removing large files from the last commit..." -ForegroundColor Cyan

# Remove the large binary files from git index (keep locally)
Invoke-Git rm --cached "frontend/node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node"
Invoke-Git rm --cached "src/CleanConnect.Api/migrate.exe"

Write-Host "Amending the commit without the large files..." -ForegroundColor Cyan
Invoke-Git commit --amend --no-edit

Write-Host "Force-pushing to origin..." -ForegroundColor Cyan
Invoke-Git push origin HEAD --force

Write-Host "Done! Large files removed from commit." -ForegroundColor Green
