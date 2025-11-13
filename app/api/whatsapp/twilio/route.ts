import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

export async function POST(request: NextRequest) {
  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      {
        success: false,
        error: 'Twilio credentials are not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM).',
      },
      { status: 500 },
    );
  }

  try {
    const { phone, message } = await request.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 },
      );
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message body is required.' },
        { status: 400 },
      );
    }

    const client = twilio(accountSid, authToken);

    const formattedFrom = fromNumber!.startsWith('whatsapp:')
      ? fromNumber!
      : `whatsapp:${fromNumber!}`;
    const formattedTo = phone.startsWith('whatsapp:')
      ? phone
      : `whatsapp:${phone}`;

    console.log('[Twilio] Attempting to send message:', {
      from: formattedFrom,
      to: formattedTo,
      messageLength: message.length,
    });

    const result = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: message,
    });

    console.log('[Twilio] Message sent successfully:', {
      sid: result.sid,
      status: result.status,
      to: result.to,
    });

    return NextResponse.json({ 
      success: true, 
      meta: {
        sid: result.sid,
        status: result.status,
        to: result.to,
        dateCreated: result.dateCreated,
      }
    });
  } catch (error: any) {
    console.error('[Twilio] Error sending message:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      moreInfo: error?.moreInfo,
      stack: error?.stack,
    });

    // Provide more detailed error messages
    let errorMessage = 'Unexpected error while sending via Twilio.';
    
    if (error?.code) {
      switch (error.code) {
        case 21211:
          errorMessage = 'Invalid phone number format. Please include country code (e.g., +919876543210)';
          break;
        case 21608:
          errorMessage = 'The phone number is not verified for WhatsApp. Please verify it in Twilio console first.';
          break;
        case 21610:
          errorMessage = 'Unsubscribed recipient. The user has opted out of receiving messages.';
          break;
        case 21614:
          errorMessage = 'WhatsApp Business Account not approved or not set up correctly.';
          break;
        case 30008:
          errorMessage = 'Unknown destination handset. The phone number may be invalid.';
          break;
        case 63015:
          errorMessage = 'Message delivery failed. The recipient phone number (+918530123875) is not verified in Twilio sandbox. Please send the join code to +1 415 523 8886 from that number to verify it.';
          break;
        default:
          errorMessage = error?.message || `Twilio error (${error.code}): ${error?.moreInfo || 'Unknown error'}`;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: error?.code,
        moreInfo: error?.moreInfo,
      },
      { status: 500 },
    );
  }
}

