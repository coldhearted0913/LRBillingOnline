# 🔧 SSD High Usage Fix Guide

## 🎯 Root Cause Analysis

Your SSD spikes to 99% usage due to **multiple contributing factors**:

### Primary Culprits Identified

1. **Windows Defender (MsMpEng)** - 346MB RAM, scanning files constantly
2. **Windows Search Indexer (SearchApp)** - 229MB RAM, indexing files
3. **Large Pagefile (24GB)** - Causing excessive virtual memory writes
4. **C: Drive 72% Full** - Only 62GB free, low disk space
5. **D: Drive High Activity** - 90% disk time during scans
6. **No Project Exclusions** - Defender scanning .next, node_modules continuously
7. **Background Services** - Superfetch, backup services running
8. **Temp Files** - 880MB in temp folders

## ✅ Solutions Implemented

### 1. Project-Level Fixes ✓

- ✅ Cleaned `.next` cache (419MB → 6MB)
- ✅ Removed Prisma temp files (18MB)
- ✅ Added Next.js cache optimization
- ✅ Created project cleanup scripts

### 2. System-Level Fixes Needed

Run these as **Administrator**:

```powershell
# Quick fix
.\fix-high-disk-usage.ps1

# Or manually:
```

## 🚀 Immediate Actions Required

### Step 1: Add Windows Defender Exclusions (CRITICAL)

```powershell
# Run PowerShell as Administrator
Add-MpPreference -ExclusionPath "E:\LRBillingOnline"
Add-MpPreference -ExclusionPath "E:\LRBillingOnline\.next"
Add-MpPreference -ExclusionPath "E:\LRBillingOnline\node_modules"
Add-MpPreference -ExclusionPath "E:\LRBillingOnline\invoices"

# Check other dev folders
Add-MpPreference -ExclusionPath "C:\Users\$env:USERNAME\AppData\Local\Programs"
Add-MpPreference -ExclusionPath "C:\Program Files\nodejs"
```

**Why this matters:** Defender scans every file you touch. With large projects, this creates continuous 100% disk usage spikes.

### Step 2: Free Up C: Drive Space

Your C: drive is **72% full** - dangerously close to critical threshold.

```powershell
# Clean Windows Update files
DISM.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase

# Clean WinSxS folder
DISM.exe /Online /Cleanup-Image /SPSuperseded

# Disk Cleanup
cleanmgr /verylowdisk

# Check system files
Get-ChildItem "C:\Windows\Logs" -Recurse | Where-Object {$_.LastWriteTime -lt (Get-Date).AddMonths(-1)} | Remove-Item -Force

# Check for large user files
Get-ChildItem "$env:USERPROFILE" -Recurse -File | Where-Object {$_.Length -gt 100MB} | Sort-Object Length -Descending | Select-Object -First 20 FullName, @{N='Size(GB)';E={[math]::Round($_.Length/1GB,2)}}
```

### Step 3: Reduce Pagefile Size

Your pagefile is **24GB** - way too large!

```powershell
# Set pagefile to system managed (recommended) or fixed 16GB
# Computer → Properties → Advanced → Performance Settings → Advanced → Virtual Memory
```

### Step 4: Disable Unnecessary Services

```powershell
# Disable Superfetch/SysMain (uses lots of disk for caching)
Set-Service -Name "SysMain" -StartupType Disabled
Stop-Service -Name "SysMain" -Force

# Disable Windows Search on non-SSD drives (if you have HDDs)
# Only keep it enabled for C: drive
```

### Step 5: Optimize Windows Search

```powershell
# Reset search index (clears corruption)
Stop-Service -Name "WSearch" -Force
& "C:\Windows\System32\SearchIndexer.exe" /Reset /portable
Start-Service -Name "WSearch"

# Exclude unnecessary folders from indexing
# Settings → Search → Searching Windows → Advanced options → Excluded folders
```

### Step 6: Regular Maintenance

Add to weekly routine:

```powershell
# Run project cleanup
npm run clean

# Run system cleanup  
.\fix-high-disk-usage.ps1

# Check disk health
chkdsk C: /F /R

# Check for errors
Get-WinEvent -FilterHashtable @{LogName='System';Level=1,2,3} -MaxEvents 50 | Where-Object {$_.Message -match 'disk|storage'}
```

## 📊 Quick Monitoring

Check what's hogging disk:

```powershell
# Real-time disk activity
Get-Counter '\PhysicalDisk(*)\Disk Reads/sec', '\PhysicalDisk(*)\Disk Writes/sec' -Continuous

# Check processes
Get-Process | Where-Object {$_.IO.DataBytesSec -gt 1000000} | Select-Object ProcessName, @{N='Disk IO';E={$_.IO.DataBytesSec}}

# Check for file locks
openfiles /query /fo csv | Where-Object {$_ -match 'node|npm|next'}
```

## 🎯 Expected Results

After applying these fixes:
- ✅ Defender will skip dev folders (no constant scanning)
- ✅ C: drive will have more free space
- ✅ Pagefile reduced, less disk writes
- ✅ Indexing optimized, less background activity
- ✅ Services streamlined

**Expected improvement: 99% → 10-20% average disk usage**

## ⚠️ Ongoing Prevention

1. **Keep C: drive above 30% free** - Critical for performance
2. **Add exclusions for ALL dev projects** - Don't let Defender scan them
3. **Run cleanup weekly** - Both project and system level
4. **Monitor Task Manager** - Watch disk usage in real-time
5. **Close unused apps** - Steam, Discord, etc. when not needed

## 🆘 If Still Spiking

Check these culprits:

1. **Antivirus other than Defender** (McAfee, Norton, etc.) - They're worse!
2. **Disk errors** - Run `chkdsk C: /F`
3. **RAM issues** - Upgrade if constantly hitting pagefile
4. **Malware** - Run full Defender scan
5. **Hardware failure** - Check SMART status with CrystalDiskInfo

## 📝 Checklist

- [ ] Run `.\fix-high-disk-usage.ps1` as Administrator
- [ ] Add Defender exclusions for dev folders
- [ ] Free up C: drive (target: 30%+ free)
- [ ] Reduce pagefile size
- [ ] Disable SysMain service
- [ ] Reset Windows Search index
- [ ] Run `npm run clean` weekly
- [ ] Monitor disk usage for 24 hours

---

**Created:** 2025-01-11  
**Last Updated:** 2025-01-11

