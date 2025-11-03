# Cleanup script for LR Billing Online
# Removes Next.js cache, Prisma temp files, and other build artifacts

Write-Host "Cleaning Next.js build cache..." -ForegroundColor Cyan
if (Test-Path .\.next) {
    Remove-Item -Path .\.next -Recurse -Force
    Write-Host "✓ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "✓ .next directory not found (already clean)" -ForegroundColor Green
}

Write-Host "`nCleaning Prisma temp files..." -ForegroundColor Cyan
$prismaTempFiles = Get-ChildItem -Path node_modules\@prisma -Recurse -Filter "*.tmp*" -ErrorAction SilentlyContinue
if ($prismaTempFiles) {
    $prismaTempFiles | Remove-Item -Force
    Write-Host "✓ Removed $($prismaTempFiles.Count) Prisma temp file(s)" -ForegroundColor Green
} else {
    Write-Host "✓ No Prisma temp files found" -ForegroundColor Green
}

Write-Host "`nCleaning node_modules cache..." -ForegroundColor Cyan
if (Test-Path node_modules\.cache) {
    Remove-Item -Path node_modules\.cache -Recurse -Force
    Write-Host "✓ Removed node_modules cache" -ForegroundColor Green
} else {
    Write-Host "✓ node_modules cache not found" -ForegroundColor Green
}

Write-Host "`nChecking for large log files..." -ForegroundColor Cyan
$logFiles = Get-ChildItem -Path . -Recurse -Include "*.log", "npm-debug.log*", "yarn-debug.log*", "yarn-error.log*" -File -ErrorAction SilentlyContinue | Where-Object {$_.Length -gt 10MB}
if ($logFiles) {
    $totalSizeMB = [math]::Round(($logFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    $logFiles | Remove-Item -Force
    Write-Host "✓ Removed large log files (freed $totalSizeMB MB)" -ForegroundColor Green
} else {
    Write-Host "✓ No large log files found" -ForegroundColor Green
}

Write-Host "`nCleanup complete! 🎉" -ForegroundColor Green

