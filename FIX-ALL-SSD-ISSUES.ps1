#Requires -RunAsAdministrator
# Complete SSD High Usage Fix Script

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  COMPLETE SSD HIGH USAGE FIX" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "SilentlyContinue"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Running as Administrator: YES`n" -ForegroundColor Green

# 1. Add Windows Defender exclusions
Write-Host "[1/8] Adding Windows Defender exclusions..." -ForegroundColor Cyan
$exclusions = @(
    "E:\LRBillingOnline",
    "E:\LRBillingOnline\.next",
    "E:\LRBillingOnline\node_modules",
    "E:\LRBillingOnline\invoices",
    "C:\Program Files\nodejs",
    "$env:USERPROFILE\AppData\Local\Programs"
)
foreach ($path in $exclusions) {
    Add-MpPreference -ExclusionPath $path -ErrorAction SilentlyContinue | Out-Null
}
Write-Host "  ✓ Exclusions added`n" -ForegroundColor Green

# 2. Disable Superfetch/SysMain
Write-Host "[2/8] Disabling Superfetch (SysMain)..." -ForegroundColor Cyan
Set-Service -Name "SysMain" -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service -Name "SysMain" -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Superfetch disabled`n" -ForegroundColor Green

# 3. Reset Windows Search
Write-Host "[3/8] Resetting Windows Search index..." -ForegroundColor Cyan
Stop-Service -Name "WSearch" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$null = & "C:\Windows\System32\SearchIndexer.exe" /Reset /portable
Start-Service -Name "WSearch" -ErrorAction SilentlyContinue
Write-Host "  ✓ Search index reset`n" -ForegroundColor Green

# 4. Disable background apps
Write-Host "[4/8] Disabling background apps..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Background apps disabled`n" -ForegroundColor Green

# 5. Optimize SSD drives
Write-Host "[5/8] Optimizing SSD drives..." -ForegroundColor Cyan
Get-Volume | Where-Object {$_.DriveType -eq 'Fixed'} | ForEach-Object {
    if ($_.DriveLetter) {
        Optimize-Volume -DriveLetter $_.DriveLetter -ReTrim -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  ✓ Drive $($_.DriveLetter) optimized" -ForegroundColor Gray
    }
}
Write-Host "`n  ✓ All drives optimized`n" -ForegroundColor Green

# 6. Clean temp files
Write-Host "[6/8] Cleaning temporary files..." -ForegroundColor Cyan
$tempFolders = @(
    $env:TEMP,
    "$env:LOCALAPPDATA\Temp",
    "$env:WINDIR\Temp"
)
$totalFreed = 0
foreach ($folder in $tempFolders) {
    $items = Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)}
    if ($items) {
        $size = ($items | Measure-Object -Property Length -Sum).Sum
        $totalFreed += $size
        $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}
if ($totalFreed -gt 0) {
    Write-Host "  ✓ Freed $([math]::Round($totalFreed/1MB,2)) MB`n" -ForegroundColor Green
} else {
    Write-Host "  ✓ No old temp files found`n" -ForegroundColor Green
}

# 7. Clear recycle bin
Write-Host "[7/8] Clearing Recycle Bin..." -ForegroundColor Cyan
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Recycle bin cleared`n" -ForegroundColor Green

# 8. Check pagefile
Write-Host "[8/8] Checking pagefile..." -ForegroundColor Cyan
$pagefile = wmic pagefile list /format:list 2>$null | Select-String "AllocatedBaseSize" | ForEach-Object {$_.Line.Split('=')[1]}
if ($pagefile -and [int]$pagefile -gt 16384) {
    Write-Host "  ⚠  Pagefile is $pagefile MB (24GB) - too large!" -ForegroundColor Yellow
    Write-Host "  → Manually reduce to 16GB via System Properties → Advanced → Virtual Memory" -ForegroundColor Gray
} else {
    Write-Host "  ✓ Pagefile size OK`n" -ForegroundColor Green
}

# Summary
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  ALL FIXES COMPLETE! ✓" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. RESTART your computer now" -ForegroundColor White
Write-Host "  2. Reduce pagefile to 16GB manually (if needed)" -ForegroundColor White
Write-Host "  3. Run 'npm run clean' weekly in project folders" -ForegroundColor White
Write-Host "  4. Monitor disk usage in Task Manager for 24 hours`n" -ForegroundColor White
Write-Host "Expected: Disk usage should drop from 99% to 10-20%" -ForegroundColor Cyan
Write-Host ""
pause

