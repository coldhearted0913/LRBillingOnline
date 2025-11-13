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
    const limit = parseInt(searchParams.get('limit') || '50');
    const to = searchParams.get('to');
    const from = searchParams.get('from');

    const client = twilio(accountSid, authToken);

    // Build query parameters
    const queryParams: any = {
      limit: Math.min(limit, 100), // Max 100 messages
    };

    if (to) {
      queryParams.to = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    }

    if (from) {
      queryParams.from = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    }

    const messages = await client.messages.list(queryParams);

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => ({
        sid: msg.sid,
        status: msg.status,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
        dateUpdated: msg.dateUpdated,
        errorCode: msg.errorCode,
        errorMessage: msg.errorMessage,
        price: msg.price,
        priceUnit: msg.priceUnit,
        direction: msg.direction,
      })),
      total: messages.length,
    });
  } catch (error: any) {
    console.error('[Twilio] Error fetching messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch messages',
        code: error?.code,
        moreInfo: error?.moreInfo,
      },
      { status: 500 }
    );
  }
}

