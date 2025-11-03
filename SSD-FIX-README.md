# 🔧 SSD High Usage Fix - Complete Guide

## ⚠️ Quick Start

**You MUST run these fixes as Administrator!**

### Option 1: One-Click Fix (Recommended)
```powershell
# Right-click PowerShell → Run as Administrator, then:
.\FIX-ALL-SSD-ISSUES.ps1
```

### Option 2: Batch File
```batch
# Right-click → Run as Administrator:
fix-ssd-admin.bat
```

### Option 3: Manual Commands
See `APPLY-FIXES-MANUALLY.txt` for copy-paste instructions

---

## 📋 What These Fixes Do

### ✅ 1. Windows Defender Exclusions (CRITICAL)
Stops Defender from scanning your dev folders constantly.
- Adds exclusions for E:\LRBillingOnline
- Adds exclusions for .next, node_modules, invoices
- Adds exclusions for Node.js installations

**Impact:** Reduces 99% disk spikes from real-time scanning

### ✅ 2. Disable Superfetch (SysMain)
Stops background preloading of frequently used files.
- Disables the service
- Stops background disk activity

**Impact:** Reduces unnecessary background disk reads

### ✅ 3. Reset Windows Search Index
Clears corrupted search index that causes high virtual memory usage.
- Stops the service
- Resets index database
- Restarts fresh

**Impact:** Reduces 2TB virtual memory usage to normal

### ✅ 4. Disable Background Apps
Stops unnecessary background processes.
- Disables Windows Store background apps
- Reduces system load

**Impact:** Lower CPU/RAM/disk usage overall

### ✅ 5. Optimize SSD Drives
Runs TRIM on all SSD drives.
- Clears unused blocks
- Improves performance

**Impact:** Better SSD performance, less wear

### ✅ 6. Clean Temp Files
Removes old temporary files.
- Cleans user temp folders
- Cleans system temp folders
- Removes files older than 7 days

**Impact:** Frees disk space, reduces clutter

### ✅ 7. Clear Recycle Bin
Empties all recycle bins.
- Frees up deleted file space

**Impact:** Immediate disk space recovery

### ✅ 8. Pagefile Warning
Checks if pagefile is too large (currently 24GB).

**Manual fix required:**
1. Right-click "This PC" → Properties
2. Advanced system settings
3. Performance → Settings
4. Advanced tab → Virtual memory → Change
5. Uncheck "Automatically manage"
6. Custom size: Initial 8192 MB, Maximum 16384 MB
7. Set → OK → Restart

**Impact:** Reduces excessive disk writes

---

## 📁 Files Created

### Scripts
- `FIX-ALL-SSD-ISSUES.ps1` - Main fix script (run as admin)
- `fix-ssd-admin.bat` - Batch wrapper for admin execution
- `clean-cache.ps1` - Project-only cleanup
- `fix-high-disk-usage.ps1` - Comprehensive system fix (backup)

### Guides
- `SSD-USAGE-FIX-GUIDE.md` - Detailed technical guide
- `APPLY-FIXES-MANUALLY.txt` - Manual commands
- `SSD-FIX-SUMMARY.txt` - Quick reference
- `SSD-FIX-README.md` - This file

---

## 🚀 Execution Steps

### Step 1: Run Fix Script
```powershell
# Open PowerShell as Administrator
.\FIX-ALL-SSD-ISSUES.ps1
```

### Step 2: Restart Computer
Some changes require a restart to take effect.

### Step 3: Reduce Pagefile (Manual)
Follow instructions in the script output or see Section 8 above.

### Step 4: Verify
- Open Task Manager → Performance → Disk
- Monitor for 24 hours
- Should see 10-20% average usage instead of 99%

### Step 5: Regular Maintenance
```powershell
# Weekly in your project folders:
npm run clean

# Monthly system cleanup:
.\FIX-ALL-SSD-ISSUES.ps1
```

---

## ⚙️ Project-Level Fixes (Already Done)

These are already applied to your LR Billing project:
- ✅ `.next` cache cleaned (419MB → 6MB)
- ✅ Prisma temp files removed
- ✅ Next.js config optimized
- ✅ Cleanup scripts added to package.json

Run these regularly:
```bash
npm run clean        # Quick cleanup
npm run clean:all    # Full cleanup with temp files
```

---

## 🔍 Troubleshooting

### Still seeing 99% disk usage?

1. **Check if Defender is scanning:**
   ```powershell
   Get-Process MsMpEng | Select-Object CPU, WorkingSet
   ```
   If CPU is high, exclusions didn't apply. Re-run as admin.

2. **Check what's using disk:**
   ```powershell
   # See top disk I/O
   Get-Counter '\Process(*)\Disk Read Bytes/sec' -Continuous
   ```

3. **Check search indexer:**
   ```powershell
   Get-Process SearchApp | Select-Object CPU, WorkingSet
   ```
   If high, restart Windows Search service.

4. **Check for other antivirus:**
   - McAfee, Norton, Avast can be worse than Defender
   - Consider uninstalling if you have Defender active

5. **Disk health check:**
   ```powershell
   Get-WmiObject Win32_DiskDrive | Select-Object Status, Model
   ```

### Need more space on C: drive?

Run these as admin:
```powershell
# Clean Windows Update files
DISM.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase

# Clean WinSxS
DISM.exe /Online /Cleanup-Image /SPSuperseded

# Disk cleanup
cleanmgr /verylowdisk
```

---

## 📊 Expected Results

| Issue | Before | After |
|-------|--------|-------|
| Disk usage spikes | 99% constantly | 10-20% average |
| Windows Defender | Scanning all files | Excluded folders |
| Search Indexer | 2TB virtual memory | Normal levels |
| Superfetch | Background activity | Disabled |
| Pagefile writes | Excessive (24GB) | Reduced (16GB) |
| Temp files | Accumulating | Cleaned regularly |

---

## 🆘 Support

If issues persist after applying all fixes:

1. Check `APPLY-FIXES-MANUALLY.txt` for manual commands
2. Review Windows Event Viewer for disk errors
3. Check disk health with CrystalDiskInfo
4. Consider running `chkdsk C: /F` (requires restart)
5. Check for malware with full Defender scan

---

## ✅ Post-Fix Checklist

- [ ] Ran `FIX-ALL-SSD-ISSUES.ps1` as Administrator
- [ ] Restarted computer
- [ ] Reduced pagefile to 16GB manually
- [ ] Verified Defender exclusions are active
- [ ] Monitored Task Manager for 24 hours
- [ ] Set up weekly project cleanup reminders
- [ ] Set up monthly system cleanup reminders
- [ ] Disk usage is now 10-20% average

---

**Created:** 2025-01-11  
**Last Updated:** 2025-01-11  
**Status:** Ready for execution

