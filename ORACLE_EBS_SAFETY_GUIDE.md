# Oracle EBS Automation Safety Guide

## ⚠️ Important: Account Protection Measures

This guide explains the safety measures implemented to prevent your Oracle EBS account from being blocked due to automated access.

## 🛡️ Safety Features Implemented

### 1. **Rate Limiting**
- **Minimum 15 minutes** between syncs per user
- Prevents rapid successive syncs that could trigger security alerts
- API returns `429 Too Many Requests` if you try to sync too soon

### 2. **Human-Like Behavior**
- **Randomized delays** between actions (±30% variance)
- **Typing delays** (80-120ms per character) to simulate human typing
- **Action delays**: 2-5 seconds between page actions
- **Voucher processing**: 5+ seconds between clicking vouchers

### 3. **Browser Fingerprinting Evasion**
- Hides automation indicators (`navigator.webdriver`)
- Sets realistic browser properties (plugins, languages)
- Uses standard viewport size (1920x1080)
- Disables automation detection flags

### 4. **Limited Processing**
- **Maximum 20 vouchers** processed per sync (configurable)
- Prevents excessive clicking that looks suspicious
- Processes most important records first

### 5. **Session Management**
- Proper browser cleanup after each sync
- No persistent sessions that could be flagged
- Fresh browser instance for each sync

## ⚠️ Risks Still Present

Even with these safeguards, there are still risks:

1. **Oracle EBS Detection**: Enterprise systems may detect automation patterns
2. **Account Policies**: Your organization may have policies against automation
3. **IP Blocking**: Multiple failed attempts could block your IP
4. **User Account Lockout**: Repeated logins might trigger account lockout

## ✅ Best Practices

### Recommended Usage:
- ✅ **Sync once per day** (or less frequently)
- ✅ **Use during off-peak hours** if possible
- ✅ **Monitor for errors** - if you see login failures, stop and investigate
- ✅ **Use manual CSV upload** as a fallback if automation fails

### Avoid:
- ❌ **Rapid testing** - don't test sync multiple times quickly
- ❌ **Multiple users syncing simultaneously** - coordinate with team
- ❌ **Ignoring error messages** - if Oracle EBS blocks you, stop immediately
- ❌ **Using production credentials** for testing

## 🔧 Configuration Options

You can adjust safety settings when initializing the Oracle EBS integration:

```typescript
const oracleEBS = new OracleEBSIntegration({
  credentials: { username, password },
  csvExportUrl: '...',
  // Safety settings
  minDelayBetweenActions: 3000,      // 3 seconds (default: 2000)
  minDelayBetweenVouchers: 8000,     // 8 seconds (default: 5000)
  maxVouchersPerSync: 10,            // Process only 10 (default: 20)
  enableHumanLikeBehavior: true,     // Enable randomization (default: true)
});
```

## 🚨 Warning Signs

If you see these, **STOP** and investigate:

1. **Login failures** after successful logins
2. **"Account locked"** messages
3. **CAPTCHA challenges** appearing
4. **IP blocked** errors
5. **"Suspicious activity"** emails from Oracle EBS

## 📊 Monitoring

The system logs all sync attempts in `PaymentSyncLog` table:
- Check sync frequency
- Monitor success/failure rates
- Review error messages

## 🔄 Fallback Options

If automation becomes risky:

1. **Manual CSV Upload**: Download CSV from Oracle EBS manually and upload via API
2. **Scheduled Manual Sync**: Set reminder to sync weekly/monthly
3. **Oracle EBS API**: Check if Oracle provides official API access

## 📝 Recommendations

1. **Start Conservative**: Use default settings first
2. **Monitor Closely**: Watch for any security warnings
3. **Communicate**: Inform your IT team about automation usage
4. **Have Backup Plan**: Always have manual CSV upload as backup

## ⚖️ Legal & Policy Considerations

- Check your organization's IT policies regarding automation
- Some companies prohibit automated access to enterprise systems
- Get approval from IT/security team before using automation
- Consider using a dedicated service account instead of personal credentials

## 🆘 If Account Gets Blocked

1. **Stop all automation immediately**
2. **Contact Oracle EBS administrator** to unlock account
3. **Explain legitimate business use case**
4. **Switch to manual CSV upload** until resolved
5. **Review and adjust automation settings** before retrying

---

**Remember**: The goal is to automate payment tracking, not to trigger security alerts. When in doubt, use manual methods.

