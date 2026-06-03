# PowerShell script to commit and push CleanConnectAfrica changes
# Run from the repo root directory

$ErrorActionPreference = "Stop"

$repoPath = "C:\Users\Public\pcom86\repos\CleanConnectAfrica"
Set-Location $repoPath

# Try to locate git.exe if it's not in PATH
function Find-Git {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) { return $gitCmd.Source }

    $candidates = @(
        "C:\Program Files\Git\bin\git.exe"
        "C:\Program Files\Git\cmd\git.exe"
        "C:\Program Files (x86)\Git\bin\git.exe"
        "C:\Program Files (x86)\Git\cmd\git.exe"
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Git\bin\git.exe"
        "C:\Git\bin\git.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$gitPath = Find-Git
if (-not $gitPath) {
    Write-Host "ERROR: git.exe was not found on this system." -ForegroundColor Red
    Write-Host "Please install Git for Windows from https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Or add your existing git installation to the system PATH." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using git: $gitPath" -ForegroundColor Gray

function Invoke-Git {
    & $gitPath @args
    if ($LASTEXITCODE -ne 0) { throw "git command failed: $args" }
}

Write-Host "Checking git status..." -ForegroundColor Cyan

$status = Invoke-Git status --short
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Nothing to commit. Working tree is clean." -ForegroundColor Green
    exit 0
}

Write-Host "Staged/unstaged files found:" -ForegroundColor Yellow
Write-Host $status

$commitMessage = @"
feat: configurable joining fee, admin membership plans, payment activation

Backend:
- Add MembershipPlanDto and ListMembershipPlansQuery for public plan listing
- Add MembershipPlansController with GET endpoint
- Add full membership plan CRUD commands (Create, Update, Delete) with validation
- Add admin membership plan CRUD endpoints under /api/v1/admin/membership-plans
- Seed default Starter (R500) and Professional (R1000) membership plans
- Update CreateBusinessProfileCommand to activate user account and mark
  provider eligible when joining fee is paid
- Add company verification endpoint and update business profile flow

Frontend:
- Fetch and display selectable membership plans in onboarding step 1
- Use selected plan's joiningFeeAmount and defaultCommissionRate dynamically
- Pass membershipPlanId to backend during profile creation
- Add admin membership plans management page with full CRUD table/modal
- Add membership plans nav link to admin sidebar
- Add verifyCompany API and update business profile creation flow
- Redesign setup-business page with 6-step flow (details, services, location,
  verification, Ozow payment, result)
"@

Write-Host "Adding all changes..." -ForegroundColor Cyan
Invoke-Git add -A

Write-Host "Committing..." -ForegroundColor Cyan
Invoke-Git commit -m $commitMessage

$remoteExists = Invoke-Git remote
if ([string]::IsNullOrWhiteSpace($remoteExists)) {
    Write-Host "No remote configured. Skipping push." -ForegroundColor Yellow
    Write-Host "To add a remote, run: Invoke-Git remote add origin <url>" -ForegroundColor Gray
    exit 0
}

$branch = Invoke-Git rev-parse --abbrev-ref HEAD

Write-Host "Pushing to origin/$branch..." -ForegroundColor Cyan
Invoke-Git push origin $branch

Write-Host "Done!" -ForegroundColor Green
