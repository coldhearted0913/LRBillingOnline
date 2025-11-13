import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { getAllLRs } from '@/lib/database';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

// Helper function to send WhatsApp message via Twilio
async function sendTwilioWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
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

    await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: message,
    });

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to send WhatsApp to ${phone}:`, error);
    return {
      success: false,
      error: error?.message || 'Failed to send WhatsApp message',
    };
  }
}

// Format phone number to ensure it has country code
function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove any whitespace
  const cleaned = phone.trim();
  
  // If already starts with +, return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 91 and has 12 digits, add +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If starts with 0 and has 11 digits, replace 0 with +91
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+91${cleaned.substring(1)}`;
  }
  
  // If 10 digits, add +91
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  
  // Return as is if it doesn't match patterns
  return cleaned;
}

// Format LR details into a readable message
function formatLRMessage(lrs: any[]): string {
  if (lrs.length === 0) {
    return '📋 *Weekly LR Status Update*\n\nNo LRs with "LR Done" status found this week.';
  }

  let message = `📋 *Weekly LR Status Update*\n\n`;
  message += `You have *${lrs.length}* LR(s) with "LR Done" status:\n\n`;

  lrs.slice(0, 20).forEach((lr, index) => {
    message += `${index + 1}. *LR No:* ${lr['LR No'] || 'N/A'}\n`;
    message += `   📅 Date: ${lr['LR Date'] || 'N/A'}\n`;
    message += `   🚚 Vehicle: ${lr['Vehicle Type'] || 'N/A'} - ${lr['Vehicle Number'] || 'N/A'}\n`;
    message += `   📍 Route: ${lr['FROM'] || 'N/A'} → ${lr['TO'] || 'N/A'}\n`;
    if (lr['Consignee']) {
      message += `   📦 Consignee: ${lr['Consignee']}\n`;
    }
    message += `\n`;
  });

  if (lrs.length > 20) {
    message += `\n... and ${lrs.length - 20} more LR(s).\n`;
  }

  message += `\nPlease check the dashboard for complete details.`;

  return message;
}

// POST endpoint to send weekly notifications
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Fetch all LRs with "LR Done" status
    const allLRs = await getAllLRs();
    const lrDoneLRs = allLRs.filter((lr) => lr.status === 'LR Done');

    if (lrDoneLRs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No LRs with "LR Done" status found',
        sent: 0,
        totalLRs: 0,
      });
    }

    // Fetch all active users with phone numbers
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
        sent: 0,
        totalLRs: lrDoneLRs.length,
        totalUsers: 0,
      });
    }

    // Format the message
    const message = formatLRMessage(lrDoneLRs);

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
      message: `Weekly notifications sent`,
      totalLRs: lrDoneLRs.length,
      totalUsers: users.length,
      sent: successful,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      ),
    });
  } catch (error: any) {
    console.error('Weekly notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send weekly notifications',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing (can be called manually)
export async function GET(request: NextRequest) {
  try {
    // Check Twilio configuration
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

    // Fetch LRs with "LR Done" status
    const allLRs = await getAllLRs();
    const lrDoneLRs = allLRs.filter((lr) => lr.status === 'LR Done');

    // Fetch active users with phone numbers
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

    return NextResponse.json({
      success: true,
      configured: true,
      stats: {
        totalLRs: allLRs.length,
        lrDoneCount: lrDoneLRs.length,
        usersWithPhone: users.length,
      },
      preview: {
        message: formatLRMessage(lrDoneLRs),
        sampleUsers: users.slice(0, 3).map((u) => ({
          email: u.email,
          name: u.name,
          phone: formatPhoneNumber(u.phone),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch notification data',
      },
      { status: 500 }
    );
  }
}

