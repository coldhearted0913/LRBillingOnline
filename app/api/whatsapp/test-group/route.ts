import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const groupId = process.env.TWILIO_WHATSAPP_GROUP_ID;

export async function POST(request: NextRequest) {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'TWILIO_WHATSAPP_GROUP_ID is not set in .env.local' },
        { status: 500 }
      );
    }

    const { message } = await request.json().catch(() => ({ message: 'Test message from LR Billing System' }));

    const client = twilio(accountSid, authToken);

    const formattedFrom = fromNumber!.startsWith('whatsapp:')
      ? fromNumber!
      : `whatsapp:${fromNumber!}`;
    
    // Format group ID
    let formattedGroupId = groupId.trim();
    if (formattedGroupId.includes('@g.us')) {
      if (!formattedGroupId.startsWith('whatsapp:')) {
        formattedGroupId = `whatsapp:${formattedGroupId}`;
      }
    } else {
      if (formattedGroupId.startsWith('whatsapp:')) {
        formattedGroupId = formattedGroupId.substring(9);
      }
      if (!formattedGroupId.endsWith('@g.us')) {
        formattedGroupId = `${formattedGroupId}@g.us`;
      }
      formattedGroupId = `whatsapp:${formattedGroupId}`;
    }

    console.log('[Twilio] Sending test message to group:', {
      from: formattedFrom,
      to: formattedGroupId,
      message: message || 'Test message',
    });

    const result = await client.messages.create({
      from: formattedFrom,
      to: formattedGroupId,
      body: message || 'Test message from LR Billing System',
    });

    console.log('[Twilio] Message result:', {
      sid: result.sid,
      status: result.status,
      to: result.to,
    });

    return NextResponse.json({
      success: true,
      message: 'Test message sent to group',
      sid: result.sid,
      status: result.status,
      formattedGroupId,
      actualTo: result.to, // This shows the actual Group JID Twilio used
      note: 'Check your WhatsApp group to see if the message arrived. The "actualTo" field shows the exact Group JID format Twilio used - use this format in your .env.local if different from what you set.',
      nextSteps: [
        '1. Check your WhatsApp group for the test message',
        '2. If message arrived → Group ID is correct! ✅',
        '3. If failed → Check "actualTo" field above for correct format',
        '4. Update TWILIO_WHATSAPP_GROUP_ID in .env.local with the "actualTo" value',
      ],
    });
  } catch (error: any) {
    console.error('[Twilio] Error sending test message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send test message',
        code: error?.code,
        moreInfo: error?.moreInfo,
        formattedGroupId: groupId ? (groupId.includes('@g.us') ? `whatsapp:${groupId}` : `${groupId}@g.us`) : 'N/A',
        hint: error?.code === 21211 ? 'Invalid phone number format. For groups, ensure it ends with @g.us' :
              error?.code === 63015 ? 'Message delivery failed. Group JID might be incorrect or Twilio cannot send to this group.' :
              'Check the formattedGroupId above - that\'s the format Twilio tried to use. If it looks wrong, adjust your TWILIO_WHATSAPP_GROUP_ID.',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to show configuration status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    configured: !!(accountSid && authToken && fromNumber && groupId),
    twilioConfigured: !!(accountSid && authToken && fromNumber),
    groupIdConfigured: !!groupId,
    groupId: groupId ? (groupId.length > 20 ? `${groupId.substring(0, 20)}...` : groupId) : 'Not set',
    instructions: {
      method1: 'Get Group JID from WhatsApp Web:',
      step1: 'Open WhatsApp Web → Press F12 → Network tab',
      step2: 'Open your group → Look for requests with @g.us in Response',
      step3: 'Or use Console: window.Store?.Chat?.find(c => c.isGroup)?.id?._serialized',
      method2: 'Or get from Twilio Console:',
      step4: 'Send test message from Twilio Console → Check Logs → Find Group JID in "To" field',
      step5: 'Add to .env.local as TWILIO_WHATSAPP_GROUP_ID and test',
    },
  });
}

