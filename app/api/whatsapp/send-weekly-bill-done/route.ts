import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { getAllLRs } from '@/lib/database';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const groupId = process.env.TWILIO_WHATSAPP_GROUP_ID; // Optional: Format: whatsapp:+1234567890-1234567890@g.us
const sendToGroup = process.env.TWILIO_SEND_TO_GROUP === 'true'; // Set to 'true' to send to group, 'false' to send to individual users

// Helper function to send WhatsApp message via Twilio (to individual number)
async function sendTwilioWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio credentials are not configured',
    };
  }

  try {
    const client = twilio(accountSid, authToken);

    const formattedFrom = fromNumber!.startsWith('whatsapp:')
      ? fromNumber!
      : `whatsapp:${fromNumber!}`;
    const formattedTo = phone.startsWith('whatsapp:')
      ? phone
      : `whatsapp:${phone}`;

    const result = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: message,
    });

    return { success: true, sid: result.sid };
  } catch (error: any) {
    console.error(`Failed to send WhatsApp to ${phone}:`, error);
    return {
      success: false,
      error: error?.message || 'Failed to send WhatsApp message',
    };
  }
}

// Helper function to send WhatsApp message to group via Twilio
async function sendTwilioWhatsAppToGroup(groupId: string, message: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio credentials are not configured',
    };
  }

  try {
    const client = twilio(accountSid, authToken);

    const formattedFrom = fromNumber!.startsWith('whatsapp:')
      ? fromNumber!
      : `whatsapp:${fromNumber!}`;
    
    // Format group ID - WhatsApp groups must have @g.us suffix
    // Group ID formats accepted:
    // - whatsapp:+1234567890-1234567890@g.us (full format)
    // - +1234567890-1234567890@g.us (without whatsapp: prefix)
    // - +1234567890-1234567890 (just number - will add @g.us if missing)
    let formattedGroupId = groupId.trim();
    
    // Check if it's already a group JID (contains @g.us)
    if (formattedGroupId.includes('@g.us')) {
      // It's a group JID, just add whatsapp: prefix if missing
      if (!formattedGroupId.startsWith('whatsapp:')) {
        formattedGroupId = `whatsapp:${formattedGroupId}`;
      }
    } else {
      // It's just a number, assume it's a group and add @g.us
      // Remove whatsapp: prefix if present, we'll add it back
      if (formattedGroupId.startsWith('whatsapp:')) {
        formattedGroupId = formattedGroupId.substring(9); // Remove 'whatsapp:'
      }
      // Add @g.us suffix for group
      if (!formattedGroupId.endsWith('@g.us')) {
        formattedGroupId = `${formattedGroupId}@g.us`;
      }
      // Add whatsapp: prefix
      formattedGroupId = `whatsapp:${formattedGroupId}`;
    }

    const result = await client.messages.create({
      from: formattedFrom,
      to: formattedGroupId,
      body: message,
    });

    return { success: true, sid: result.sid };
  } catch (error: any) {
    console.error(`Failed to send WhatsApp to group ${groupId}:`, error);
    return {
      success: false,
      error: error?.message || 'Failed to send WhatsApp message',
    };
  }
}

// Check if a bill has been in "Bill Done" status for at least 1 week (7 days)
// We check the updatedAt timestamp - if it's 7+ days old, the bill has been done for at least 1 week
// Note: updatedAt changes when any field is updated, so this is an approximation
function isBillDoneOneWeekOld(lr: any): boolean {
  try {
    // Check if we have updatedAt timestamp
    // updatedAt might be in different formats depending on how data is returned
    const updatedAtValue = lr.updatedAt || lr.updated_at || lr['updated_at'];
    if (updatedAtValue) {
      const updatedAt = new Date(updatedAtValue);
      const today = new Date();
      
      // Calculate difference in days
      const diffTime = today.getTime() - updatedAt.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Check if it's at least 7 days old (1 week or more)
      // Using >= 7 to catch bills that have been done for a week or longer
      return diffDays >= 7;
    }
    
    // Fallback: Use LR Date if updatedAt is not available
    // This is less accurate but works as approximation
    if (lr['LR Date']) {
      const parts = lr['LR Date'].split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        
        const lrDate = new Date(year, month, day);
        const today = new Date();
        
        today.setHours(0, 0, 0, 0);
        lrDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - lrDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Check if it's at least 7 days old
        return diffDays >= 7;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking bill done date:', error);
    return false;
  }
}

// Format LR details message for bills done 1 week ago (with 1600 character limit for Twilio)
function formatBillDoneMessage(lrs: any[]): string {
  if (lrs.length === 0) {
    return 'No bills found that have been in "Bill Done" status for at least 1 week.';
  }

  const MAX_MESSAGE_LENGTH = 1500; // Leave buffer for Twilio's 1600 char limit
  let message = `📋 *Weekly Bill Done Report*\n\n`;
  message += `The following *${lrs.length}* bill(s) have been in "Bill Done" status for at least 1 week:\n\n`;

  // Limit number of bills to stay under character limit
  const maxBills = Math.min(10, lrs.length); // Limit to 10 bills per message
  
  for (let index = 0; index < maxBills; index++) {
    const lr = lrs[index];
    let lrEntry = `${index + 1}. *LR No:* ${lr['LR No'] || 'N/A'}\n`;
    lrEntry += `   📅 *LR Date:* ${lr['LR Date'] || 'N/A'}\n`;
    lrEntry += `   🚚 *Vehicle Number:* ${lr['Vehicle Number'] || 'N/A'}\n`;
    if (lr['Bill Number']) {
      lrEntry += `   📄 *Bill Number:* ${lr['Bill Number']}\n`;
    }
    if (lr['Bill Submission Date']) {
      lrEntry += `   📆 *Bill Submission Date:* ${lr['Bill Submission Date']}\n`;
    }
    lrEntry += `\n`;
    
    // Check if adding this entry would exceed limit
    if ((message + lrEntry).length > MAX_MESSAGE_LENGTH) {
      message += `\n... and ${lrs.length - index} more bill(s).\n`;
      break;
    }
    
    message += lrEntry;
  }

  if (lrs.length > maxBills) {
    message += `\n... and ${lrs.length - maxBills} more bill(s).\n`;
  }

  message += `\nPlease review and submit these bills if ready.`;

  // Final safety check - truncate if still too long
  if (message.length > MAX_MESSAGE_LENGTH) {
    message = message.substring(0, MAX_MESSAGE_LENGTH - 50);
    message += `\n\n... (truncated)\n\nCheck dashboard for details.`;
  }

  return message;
}

// POST endpoint to send weekly bill done notifications
export async function POST(request: NextRequest) {
  try {
    // Check Twilio configuration
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Twilio credentials are not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM).',
        },
        { status: 500 }
      );
    }

    // Fetch all LRs with "Bill Done" status
    const allLRs = await getAllLRs();
    const billDoneLRs = allLRs.filter((lr) => lr.status === 'Bill Done');

    if (billDoneLRs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No LRs with "Bill Done" status found',
        sent: false,
        totalLRs: 0,
      });
    }

    // Filter LRs that have been in "Bill Done" status for at least 1 week (7 days)
    // We check the updatedAt timestamp or LR Date to determine when status was set
    const oneWeekOldBills = billDoneLRs.filter((lr) => {
      return isBillDoneOneWeekOld(lr);
    });

    if (oneWeekOldBills.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bills found that have been in "Bill Done" status for at least 1 week',
        sent: false,
        totalLRs: billDoneLRs.length,
        oneWeekOldCount: 0,
      });
    }

    // Format the message
    const message = formatBillDoneMessage(oneWeekOldBills);

    // Try to send to group if configured
    // Note: Twilio WhatsApp API does NOT support sending to groups directly
    // It only supports individual phone numbers
    // If group send fails, we'll fall back to individual users
    if (groupId) {
      const result = await sendTwilioWhatsAppToGroup(groupId, message);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Weekly bill done notification sent to group',
          totalBillDone: billDoneLRs.length,
          oneWeekOldCount: oneWeekOldBills.length,
          sent: true,
          sentTo: 'group',
          messageSid: result.sid,
        });
      } else {
        // Twilio doesn't support WhatsApp groups - fall back to individual users
        console.log('[Twilio] Group send failed (Twilio does not support WhatsApp groups). Falling back to individual users:', result.error);
        // Continue to send to individual users below
      }
    }

    // If no group ID configured, send to individual users as fallback
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        phone: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users with phone numbers found',
        sent: false,
        totalBillDone: billDoneLRs.length,
        oneWeekOldCount: oneWeekOldBills.length,
        totalUsers: 0,
      });
    }

    // Format phone number helper
    const formatPhoneNumber = (phone: string | null | undefined): string | null => {
      if (!phone) return null;
      const cleaned = phone.trim();
      if (cleaned.startsWith('+')) return cleaned;
      if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
      if (cleaned.startsWith('0') && cleaned.length === 11) return `+91${cleaned.substring(1)}`;
      if (cleaned.length === 10 && /^\d+$/.test(cleaned)) return `+91${cleaned}`;
      return cleaned;
    };

    // Send messages to all users
    const results = await Promise.allSettled(
      users.map(async (user) => {
        const formattedPhone = formatPhoneNumber(user.phone);
        if (!formattedPhone) {
          return {
            userId: user.id,
            email: user.email,
            success: false,
            error: 'Invalid phone number format',
          };
        }

        const result = await sendTwilioWhatsApp(formattedPhone, message);
        return {
          userId: user.id,
          email: user.email,
          phone: formattedPhone,
          ...result,
        };
      })
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: 'Weekly bill done notification sent to users',
      totalBillDone: billDoneLRs.length,
      oneWeekOldCount: oneWeekOldBills.length,
      totalUsers: users.length,
      sent: successful,
      failed,
      sentTo: 'individual_users',
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      ),
    });
  } catch (error: any) {
    console.error('Weekly bill done notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send weekly bill done notifications',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/preview
export async function GET(request: NextRequest) {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Twilio credentials are not configured',
          configured: false,
        },
        { status: 500 }
      );
    }

    // Fetch LRs with "Bill Done" status
    const allLRs = await getAllLRs();
    const billDoneLRs = allLRs.filter((lr) => lr.status === 'Bill Done');
    const oneWeekOldBills = billDoneLRs.filter((lr) => {
      return isBillDoneOneWeekOld(lr);
    });

    return NextResponse.json({
      success: true,
      configured: true,
      stats: {
        totalBillDone: billDoneLRs.length,
        oneWeekOldCount: oneWeekOldBills.length,
      },
      preview: {
        message: formatBillDoneMessage(oneWeekOldBills),
        sampleLRs: oneWeekOldBills.slice(0, 3).map((lr) => ({
          lrNo: lr['LR No'],
          lrDate: lr['LR Date'],
          vehicleNumber: lr['Vehicle Number'],
          billNumber: lr['Bill Number'],
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch bill done data',
      },
      { status: 500 }
    );
  }
}

