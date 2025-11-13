/**
 * Check environment variables for Twilio configuration
 * This script reads from process.env which Next.js populates from .env.local
 */

// Check if we're in a Next.js context or need to manually load
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔍 Checking Twilio Environment Variables...\n');

// Check if .env.local exists
if (fs.existsSync(envLocalPath)) {
  console.log('✅ .env.local file found\n');
  
  // Read and parse .env.local (basic parsing)
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const lines = envContent.split('\n');
  
  const twilioVars = {
    TWILIO_ACCOUNT_SID: null,
    TWILIO_AUTH_TOKEN: null,
    TWILIO_WHATSAPP_FROM: null,
  };
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) return;
    
    // Parse KEY=VALUE format
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      
      if (key in twilioVars) {
        twilioVars[key] = value;
      }
    }
  });
  
  console.log('📋 Found Twilio Variables:');
  console.log(`  TWILIO_ACCOUNT_SID: ${twilioVars.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
  if (twilioVars.TWILIO_ACCOUNT_SID) {
    console.log(`    Value: ${twilioVars.TWILIO_ACCOUNT_SID.substring(0, 10)}...${twilioVars.TWILIO_ACCOUNT_SID.substring(twilioVars.TWILIO_ACCOUNT_SID.length - 4)}`);
  }
  
  console.log(`  TWILIO_AUTH_TOKEN: ${twilioVars.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  if (twilioVars.TWILIO_AUTH_TOKEN) {
    console.log(`    Value: ${twilioVars.TWILIO_AUTH_TOKEN.substring(0, 10)}...${twilioVars.TWILIO_AUTH_TOKEN.substring(twilioVars.TWILIO_AUTH_TOKEN.length - 4)}`);
  }
  
  console.log(`  TWILIO_WHATSAPP_FROM: ${twilioVars.TWILIO_WHATSAPP_FROM ? '✅ Set' : '❌ Missing'}`);
  if (twilioVars.TWILIO_WHATSAPP_FROM) {
    console.log(`    Value: ${twilioVars.TWILIO_WHATSAPP_FROM}`);
    
    // Validate format
    if (!twilioVars.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')) {
      console.log(`    ⚠️  Warning: Should start with 'whatsapp:' prefix`);
      console.log(`    Expected format: whatsapp:+1234567890`);
    } else {
      console.log(`    ✅ Format looks correct`);
    }
  }
  
  console.log('\n');
  
  // Summary
  const allSet = Object.values(twilioVars).every(v => v !== null);
  if (allSet) {
    console.log('✅ All required Twilio variables are set!');
    console.log('\n📝 Next steps:');
    console.log('  1. Start your dev server: npm run dev');
    console.log('  2. Test configuration: http://localhost:3000/api/whatsapp/test-config');
    console.log('  3. Test sending: Use the dashboard WhatsApp section');
  } else {
    console.log('❌ Some Twilio variables are missing!');
    console.log('\nRequired variables:');
    Object.entries(twilioVars).forEach(([key, value]) => {
      if (!value) {
        console.log(`  - ${key}`);
      }
    });
  }
} else {
  console.log('❌ .env.local file not found!');
  console.log('   Please create .env.local in the project root with:');
  console.log('   TWILIO_ACCOUNT_SID=your_account_sid');
  console.log('   TWILIO_AUTH_TOKEN=your_auth_token');
  console.log('   TWILIO_WHATSAPP_FROM=whatsapp:+1234567890');
}

