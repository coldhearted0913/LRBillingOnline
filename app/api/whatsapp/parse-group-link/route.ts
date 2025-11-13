import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper to extract group info from WhatsApp invite link
// Note: This is an approximation - actual JID needs to be obtained from WhatsApp API
export async function POST(request: NextRequest) {
  try {
    const { inviteLink } = await request.json();

    if (!inviteLink || typeof inviteLink !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invite link is required' },
        { status: 400 }
      );
    }

    // WhatsApp invite link format: https://chat.whatsapp.com/XXXXXXXXXXXX
    const match = inviteLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Invalid WhatsApp invite link format' },
        { status: 400 }
      );
    }

    const groupCode = match[1];

    return NextResponse.json({
      success: true,
      groupCode,
      note: 'This is the group code from the invite link. You still need to get the actual Group JID from Twilio or WhatsApp API.',
      instructions: [
        '1. The group code alone is not enough - you need the full Group JID',
        '2. Group JID format: +[country][number]@g.us or 120363[numbers]@g.us',
        '3. To get the actual JID:',
        '   - Send a test message from Twilio Console to the group',
        '   - Check Twilio Console → Messaging → Logs',
        '   - Look at the "To" field in the sent message',
        '   - That is your Group JID',
        '4. Or try different number formats in TWILIO_WHATSAPP_GROUP_ID and test',
      ],
      possibleFormats: [
        `+919876543210-${groupCode.substring(0, 10)}@g.us`,
        `120363${groupCode.substring(0, 12)}@g.us`,
        `+919876543210-${groupCode}@g.us`,
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to parse invite link',
      },
      { status: 500 }
    );
  }
}

