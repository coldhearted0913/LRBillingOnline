import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { getAllLRs } from '@/lib/database';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

// Helper function to send WhatsApp message via Twilio
// If message is too long, splits it into multiple messages
async function sendTwilioWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string; sid?: string; code?: number }> {
  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio credentials are not configured',
    };
  }

  try {
    const client = twilio(accountSid, authToken);

    const formattedFrom = fromNumber.startsWith('whatsapp:')
      ? fromNumber
      : `whatsapp:${fromNumber}`;
    const formattedTo = phone.startsWith('whatsapp:')
      ? phone
      : `whatsapp:${phone}`;

    const MAX_MESSAGE_LENGTH = 1600; // Twilio's limit

    // If message is within limit, send it directly
    if (message.length <= MAX_MESSAGE_LENGTH) {
      console.log(`[Twilio] Sending WhatsApp message to ${formattedTo} from ${formattedFrom}`);
      const result = await client.messages.create({
        from: formattedFrom,
        to: formattedTo,
        body: message,
      });
      console.log(`[Twilio] Message sent successfully. SID: ${result.sid}, Status: ${result.status}`);
      return { success: true, sid: result.sid };
    }

    // Split message into chunks at LR boundaries
    // Split by double newlines to find LR entries
    const lrSections = message.split(/\n\n\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    // Start with header
    const headerMatch = message.match(/^(📋.*?\n\n\nYou have.*?\n\n\n)/);
    const header = headerMatch ? headerMatch[1] : '';

    for (let i = 0; i < lrSections.length; i++) {
      const section = lrSections[i];
      
      // Skip header section (already included)
      if (section.includes('📋') && section.includes('You have')) {
        currentChunk = section + '\n\n\n';
        continue;
      }

      // Check if adding this section would exceed limit
      const testChunk = currentChunk + section + '\n\n\n';
      if (testChunk.length > MAX_MESSAGE_LENGTH - 100 && currentChunk.trim()) {
        // Save current chunk and start new one with header
        chunks.push(currentChunk.trim());
        currentChunk = header + section + '\n\n\n';
      } else {
        currentChunk += section + '\n\n\n';
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If still too long, fall back to line-by-line splitting
    if (chunks.length === 0 || chunks.some(chunk => chunk.length > MAX_MESSAGE_LENGTH)) {
      chunks.length = 0;
      const lines = message.split('\n');
      currentChunk = '';

      for (const line of lines) {
        if (currentChunk.length + line.length + 1 > MAX_MESSAGE_LENGTH - 50) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
        }
        currentChunk += line + '\n';
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }

    // Send all chunks
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkMessage = chunks.length > 1 
        ? `*Part ${i + 1} of ${chunks.length}*\n\n${chunks[i]}`
        : chunks[i];
      
      console.log(`[Twilio] Sending chunk ${i + 1}/${chunks.length} to ${formattedTo}`);
      const result = await client.messages.create({
        from: formattedFrom,
        to: formattedTo,
        body: chunkMessage,
      });
      console.log(`[Twilio] Chunk ${i + 1} sent. SID: ${result.sid}, Status: ${result.status}`);
      results.push(result);
      
      // Small delay between messages to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { success: true, sid: results[0]?.sid };
  } catch (error: any) {
    // Handle specific Twilio errors
    const isRateLimit = error?.code === 63038 || error?.status === 429;
    const isMessageTooLong = error?.code === 21617;
    const isOutsideWindow = error?.code === 63016; // Outside 24-hour window
    
    // Only log non-rate-limit errors (rate limits are expected with sandbox accounts)
    if (!isRateLimit && !isOutsideWindow) {
      console.error(`Failed to send WhatsApp to ${phone}:`, error);
    } else if (isRateLimit) {
      // Log rate limit as info, not error
      console.log(`⚠️ Rate limit reached for ${phone} (Twilio sandbox: 50 messages/day limit)`);
    } else if (isOutsideWindow) {
      // Log outside window as warning with helpful info
      console.log(`⚠️ Cannot send freeform message to ${phone} - outside 24-hour window. User needs to message first or use a template.`);
    }
    
    let errorMessage = error?.message || 'Failed to send WhatsApp message';
    
    if (isRateLimit) {
      errorMessage = 'Twilio daily message limit reached (50 messages/day for sandbox). Please upgrade to a paid account or wait until tomorrow.';
    } else if (isMessageTooLong) {
      errorMessage = 'Message too long. Please contact support.';
    } else if (isOutsideWindow) {
      errorMessage = 'Cannot send freeform message - outside 24-hour window. The recipient must send you a message first, or you need to use a pre-approved WhatsApp template. For sandbox accounts, the user needs to join the sandbox and send a message within 24 hours.';
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error?.code,
    };
  }
}

// Format phone number to ensure it has country code
function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  const cleaned = phone.trim();
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+91${cleaned.substring(1)}`;
  }
  
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  
  return cleaned;
}

// Parse comma-separated phone numbers and format each one
function parsePhoneNumbers(phone: string | null | undefined): string[] {
  if (!phone) return [];
  
  // Split by comma and clean each number
  return phone
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => formatPhoneNumber(p))
    .filter((p): p is string => p !== null);
}

// Calculate days since LR was set to "LR Done" status
function calculateDaysPending(lr: any): number {
  try {
    // Check updatedAt timestamp (when status was last updated)
    const updatedAtValue = lr.updatedAt || lr.updated_at || lr['updated_at'];
    if (updatedAtValue) {
      const updatedAt = new Date(updatedAtValue);
      const today = new Date();
      const diffTime = today.getTime() - updatedAt.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    
    // Fallback: Use LR Date if updatedAt is not available
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
        return diffDays;
      }
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating days pending:', error);
    return 0;
  }
}

// Format LR details message in the requested format with numbered list
function formatLRDoneMessage(lrs: any[]): string {
  if (lrs.length === 0) {
    return 'No LRs with "LR Done" status found.';
  }

  const MAX_MESSAGE_LENGTH = 1500; // Leave buffer for Twilio's 1600 char limit
  
  // Process LRs with days pending
  const lrsWithDays = lrs.map((lr) => {
    const lrNo = lr['LR No'] || lr.lrNo || 'N/A';
    const lrDate = lr['LR Date'] || lr.lrDate || 'N/A';
    const vehicleNo = lr['Vehicle Number'] || lr.vehicleNumber || 'N/A';
    const daysPending = calculateDaysPending(lr);
    
    return {
      lrNo,
      lrDate,
      vehicleNo,
      daysPending,
      priority: daysPending > 14 ? 3 : daysPending > 7 ? 2 : 1, // 3=urgent, 2=warning, 1=normal
    };
  });

  // Sort by priority (urgent first, then warning, then normal), then by days descending
  lrsWithDays.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.daysPending - a.daysPending;
  });

  // Build formatted message in the exact requested format
  let message = `📋 *LR Done Status Update*\n\n\n`;
  message += `You have *${lrs.length}* LR(s) with "LR Done" status:\n\n\n`;

  // Format each LR with numbered list and warning indicators
  lrsWithDays.forEach((lr, index) => {
    // Determine warning indicator for the "Pending from" line
    let indicator = '';
    if (lr.daysPending > 14) {
      indicator = '🔴 '; // Red sign for more than 2 weeks
    } else if (lr.daysPending > 7) {
      indicator = '⚠️ '; // Warning for more than 1 week
    }

    message += `${index + 1}. *LR No:* ${lr.lrNo}\n\n`;
    message += `   📅 *LR Date:* ${lr.lrDate}\n\n`;
    message += `   🚚 *Vehicle Number:* ${lr.vehicleNo}\n\n`;
    message += `   ${indicator}*Pending from:* ${lr.daysPending} days\n\n\n`;
  });

  message += `Please check the dashboard for complete details.`;

  // If message is too long, we'll need to split into multiple messages
  // But first, let's try to keep the same format by reducing spacing slightly
  if (message.length > MAX_MESSAGE_LENGTH) {
    // Try with slightly less spacing but same format
    let compactMessage = `📋 *LR Done Status Update*\n\n\n`;
    compactMessage += `You have *${lrs.length}* LR(s) with "LR Done" status:\n\n\n`;

    lrsWithDays.forEach((lr, index) => {
      let indicator = '';
      if (lr.daysPending > 14) {
        indicator = '🔴 ';
      } else if (lr.daysPending > 7) {
        indicator = '⚠️ ';
      }

      compactMessage += `${index + 1}. *LR No:* ${lr.lrNo}\n\n`;
      compactMessage += `   📅 *LR Date:* ${lr.lrDate}\n\n`;
      compactMessage += `   🚚 *Vehicle Number:* ${lr.vehicleNo}\n\n`;
      compactMessage += `   ${indicator}*Pending from:* ${lr.daysPending} days\n\n\n`;
    });

    compactMessage += `Please check the dashboard for complete details.`;

    // If still too long, reduce spacing between items but keep format
    if (compactMessage.length > MAX_MESSAGE_LENGTH) {
      let reducedSpacingMessage = `📋 *LR Done Status Update*\n\n\n`;
      reducedSpacingMessage += `You have *${lrs.length}* LR(s) with "LR Done" status:\n\n\n`;

      lrsWithDays.forEach((lr, index) => {
        let indicator = '';
        if (lr.daysPending > 14) {
          indicator = '🔴 ';
        } else if (lr.daysPending > 7) {
          indicator = '⚠️ ';
        }

        reducedSpacingMessage += `${index + 1}. *LR No:* ${lr.lrNo}\n\n`;
        reducedSpacingMessage += `   📅 *LR Date:* ${lr.lrDate}\n\n`;
        reducedSpacingMessage += `   🚚 *Vehicle Number:* ${lr.vehicleNo}\n\n`;
        reducedSpacingMessage += `   ${indicator}*Pending from:* ${lr.daysPending} days\n\n`;
      });

      reducedSpacingMessage += `Please check the dashboard for complete details.`;
      message = reducedSpacingMessage;
    } else {
      message = compactMessage;
    }
  }

  return message;
}

// POST endpoint to send LR Done notifications
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
    const whatsappMessage = formatLRDoneMessage(lrDoneLRs);

    // Send messages to all users (supporting multiple phone numbers per user)
    const results = await Promise.allSettled(
      users.map(async (user) => {
        // Parse comma-separated phone numbers
        const phoneNumbers = parsePhoneNumbers(user.phone);
        
        if (phoneNumbers.length === 0) {
          return {
            userId: user.id,
            email: user.email,
            name: user.name,
            success: false,
            error: 'No valid phone numbers found',
            code: undefined,
            phoneNumbers: [],
            results: [],
          };
        }

        console.log(`[WhatsApp] Attempting to send to ${user.name} (${user.email}) at ${phoneNumbers.length} number(s): ${phoneNumbers.join(', ')}`);
        
        // Send to all phone numbers for this user
        const phoneResults = await Promise.allSettled(
          phoneNumbers.map(async (phone) => {
            console.log(`[WhatsApp] Sending to ${user.name} at ${phone}`);
            const result = await sendTwilioWhatsApp(phone, whatsappMessage);
            console.log(`[WhatsApp] Result for ${phone}:`, result);
            return {
              phone,
              ...result,
            };
          })
        );

        // Process results for all phone numbers
        const phoneResultsData = phoneResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { phone: 'unknown', success: false, error: r.reason }
        );

        const successful = phoneResultsData.filter(r => r.success).length;
        const failed = phoneResultsData.length - successful;

        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          success: successful > 0, // User-level success if at least one number succeeded
          phoneNumbers: phoneNumbers,
          totalPhones: phoneNumbers.length,
          successfulPhones: successful,
          failedPhones: failed,
          results: phoneResultsData, // Individual results for each phone number
        };
      })
    );

    // Calculate totals (count users, not individual phone numbers)
    const successfulUsers = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failedUsers = results.length - successfulUsers;
    
    // Calculate total phone numbers and successful sends
    let totalPhoneNumbers = 0;
    let totalSuccessfulPhones = 0;
    let totalFailedPhones = 0;
    
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.phoneNumbers) {
        totalPhoneNumbers += r.value.phoneNumbers.length || 0;
        totalSuccessfulPhones += r.value.successfulPhones || 0;
        totalFailedPhones += r.value.failedPhones || 0;
      }
    });

    // Count rate limit and outside window errors across all phone numbers
    let totalRateLimitErrors = 0;
    let totalOutsideWindowErrors = 0;
    
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.results) {
        r.value.results.forEach((phoneResult: any) => {
          if (phoneResult.code === 63038 || phoneResult.error?.includes('daily message limit')) {
            totalRateLimitErrors++;
          }
          if (phoneResult.code === 63016 || phoneResult.error?.includes('outside the allowed window')) {
            totalOutsideWindowErrors++;
          }
        });
      }
    });

    let responseMessage = `LR Done notifications sent`;
    if (totalSuccessfulPhones > 0) {
      responseMessage += ` ${totalSuccessfulPhones} message(s) delivered to ${successfulUsers} user(s)`;
    }
    if (totalRateLimitErrors > 0) {
      responseMessage += `. Note: ${totalRateLimitErrors} phone number(s) could not receive messages due to Twilio daily limit (50 messages/day for sandbox accounts).`;
    }
    if (totalOutsideWindowErrors > 0) {
      responseMessage += `. Note: ${totalOutsideWindowErrors} phone number(s) could not receive messages because they are outside the 24-hour window. They need to send you a message first, or you need to use a WhatsApp template.`;
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      totalLRs: lrDoneLRs.length,
      totalUsers: users.length,
      totalPhoneNumbers,
      sentUsers: successfulUsers,
      failedUsers,
      sentPhones: totalSuccessfulPhones,
      failedPhones: totalFailedPhones,
      rateLimitErrors: totalRateLimitErrors,
      outsideWindowErrors: totalOutsideWindowErrors,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      ),
    });
  } catch (error: any) {
    console.error('LR Done notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send LR Done notifications',
      },
      { status: 500 }
    );
  }
}

