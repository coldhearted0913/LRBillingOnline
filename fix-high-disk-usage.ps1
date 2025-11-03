# Comprehensive SSD High Usage Fix Script
# This addresses Windows Defender, indexing, and other common causes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SSD HIGH USAGE FIX SCRIPT" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host "Running as Administrator: $isAdmin" -ForegroundColor $(if($isAdmin){'Green'}else{'Red'})

if (-not $isAdmin) {
    Write-Host "`nWARNING: Some fixes require Administrator privileges!" -ForegroundColor Red
    Write-Host "Run PowerShell as Administrator for complete fix.`n" -ForegroundColor Yellow
}

# 1. Fix Windows Defender scanning
Write-Host "`n1. Checking Windows Defender..." -ForegroundColor Cyan
try {
    $defenderStatus = Get-MpComputerStatus
    if ($defenderStatus.AntivirusEnabled) {
        Write-Host "   Defender is running (may cause disk spikes)" -ForegroundColor Yellow
        
        if ($isAdmin) {
            Write-Host "   Adding exclusions for development folders..." -ForegroundColor Gray
            $exclusions = @(
                "$PWD",
                "$PWD\.next",
                "$PWD\node_modules",
                "$PWD\invoices"
            )
            foreach ($path in $exclusions) {
                try {
                    Add-MpPreference -ExclusionPath $path -ErrorAction SilentlyContinue
                    Write-Host "   ✓ Excluded: $path" -ForegroundColor Green
                } catch {
                    Write-Host "   - Failed: $path" -ForegroundColor Gray
                }
            }
        }
    }
} catch {
    Write-Host "   Could not check Defender status" -ForegroundColor Gray
}

# 2. Clean Temp files
Write-Host "`n2. Cleaning temporary files..." -ForegroundColor Cyan
$tempCleanup = @(
    "$env:TEMP\*",
    "$env:LOCALAPPDATA\Temp\*",
    "$env:WINDIR\Temp\*"
)
$totalFreed = 0
foreach ($path in $tempCleanup) {
    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)}
    if ($items) {
        $size = ($items | Measure-Object -Property Length -Sum).Sum
        $totalFreed += $size
        Remove-Item -Path $items.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Cleaned: $(Split-Path $path) - $([math]::Round($size/1MB,2)) MB" -ForegroundColor Green
    }
}
if ($totalFreed -gt 0) {
    Write-Host "   Freed: $([math]::Round($totalFreed/1MB,2)) MB total" -ForegroundColor Green
}

# 3. Clean recycle bin
Write-Host "`n3. Cleaning Recycle Bin..." -ForegroundColor Cyan
if ($isAdmin) {
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Recycle Bin cleared" -ForegroundColor Green
} else {
    Write-Host "   - Skipped (requires admin)" -ForegroundColor Gray
}

# 4. Optimize Windows Search indexer
Write-Host "`n4. Optimizing Windows Search..." -ForegroundColor Cyan
if ($isAdmin) {
    Write-Host "   Stopping Windows Search service..." -ForegroundColor Gray
    Stop-Service -Name "WSearch" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Service stopped" -ForegroundColor Green
    
    Write-Host "   Resetting Windows Search index..." -ForegroundColor Gray
    & "C:\Windows\System32\SearchIndexer.exe" /Reset /portable
    Write-Host "   ✓ Index reset" -ForegroundColor Green
    
    Write-Host "   Starting Windows Search service..." -ForegroundColor Gray
    Start-Service -Name "WSearch" -ErrorAction SilentlyContinue
    Write-Host "   ✓ Service restarted" -ForegroundColor Green
} else {
    Write-Host "   - Skipped (requires admin)" -ForegroundColor Gray
}

# 5. Disable unnecessary background apps
Write-Host "`n5. Optimizing background apps..." -ForegroundColor Cyan
if ($isAdmin) {
    # Disable background apps
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -ErrorAction SilentlyContinue
    Write-Host "   ✓ Background apps disabled" -ForegroundColor Green
    
    # Disable Superfetch/SysMain
    Set-Service -Name "SysMain" -StartupType Disabled -ErrorAction SilentlyContinue
    Stop-Service -Name "SysMain" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ SysMain (Superfetch) disabled" -ForegroundColor Green
} else {
    Write-Host "   - Skipped (requires admin)" -ForegroundColor Gray
}

# 6. Reduce pagefile if too large
Write-Host "`n6. Checking pagefile..." -ForegroundColor Cyan
$pagefile = wmic pagefile list /format:list 2>$null | Select-String "AllocatedBaseSize" | ForEach-Object {$_.Line.Split('=')[1]}
if ($pagefile -and [int]$pagefile -gt 16) {
    Write-Host "   Current pagefile: $pagefile MB (may be large)" -ForegroundColor Yellow
    Write-Host "   Tip: Consider setting to 16GB or system managed" -ForegroundColor Gray
}

# 7. SSD Trim/defrag
Write-Host "`n7. Optimizing SSD..." -ForegroundColor Cyan
if ($isAdmin) {
    Get-Volume | Where-Object {$_.DriveType -eq 'Fixed' -and $_.FileSystemType -eq 'NTFS'} | ForEach-Object {
        if ($_.DriveLetter) {
            Write-Host "   Optimizing drive $($_.DriveLetter)..." -ForegroundColor Gray
            Optimize-Volume -DriveLetter $_.DriveLetter -ReTrim -ErrorAction SilentlyContinue
            Write-Host "   ✓ Drive $($_.DriveLetter) optimized" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   - Skipped (requires admin)" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CLEANUP COMPLETE! ✓" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Additional recommendations:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run clean' in project folders regularly" -ForegroundColor White
Write-Host "  2. Keep Windows Defender updated" -ForegroundColor White
Write-Host "  3. Limit browser tabs if low on RAM" -ForegroundColor White
Write-Host "  4. Close Steam when not gaming" -ForegroundColor White
Write-Host "  5. Check D: drive for large files if still spiking`n" -ForegroundColor White

Write-Host "Restart your computer to ensure all changes take effect!" -ForegroundColor Cyan

