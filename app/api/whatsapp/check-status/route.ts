import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export async function GET(request: NextRequest) {
  try {
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const messageSid = searchParams.get('sid');

    if (!messageSid) {
      return NextResponse.json(
        { success: false, error: 'Message SID is required' },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    const message = await client.messages(messageSid).fetch();

    return NextResponse.json({
      success: true,
      message: {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        priceUnit: message.priceUnit,
      },
    });
  } catch (error: any) {
    console.error('[Twilio] Error checking message status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to check message status',
      },
      { status: 500 }
    );
  }
}

