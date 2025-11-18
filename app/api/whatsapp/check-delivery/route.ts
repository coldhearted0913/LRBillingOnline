import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// GET endpoint to check message delivery status
export async function GET(request: NextRequest) {
  try {
    if (!accountSid || !authToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Twilio credentials are not configured',
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageSid = searchParams.get('sid');
    const phone = searchParams.get('phone');

    if (!messageSid && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either message SID or phone number is required',
        },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    if (messageSid) {
      // Check specific message status
      try {
        const message = await client.messages(messageSid).fetch();
        return NextResponse.json({
          success: true,
          message: {
            sid: message.sid,
            status: message.status,
            to: message.to,
            from: message.from,
            body: message.body?.substring(0, 100) + '...',
            dateCreated: message.dateCreated,
            dateSent: message.dateSent,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage,
          },
        });
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Failed to fetch message status',
          },
          { status: 500 }
        );
      }
    } else if (phone) {
      // Get recent messages for this phone number
      try {
        const formattedPhone = phone.startsWith('whatsapp:')
          ? phone
          : `whatsapp:${phone}`;
        
        const messages = await client.messages.list({
          to: formattedPhone,
          limit: 10,
        });

        return NextResponse.json({
          success: true,
          messages: messages.map((msg) => ({
            sid: msg.sid,
            status: msg.status,
            to: msg.to,
            from: msg.from,
            body: msg.body?.substring(0, 100) + '...',
            dateCreated: msg.dateCreated,
            dateSent: msg.dateSent,
            errorCode: msg.errorCode,
            errorMessage: msg.errorMessage,
          })),
        });
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Failed to fetch messages',
          },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error('Error checking delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to check delivery status',
      },
      { status: 500 }
    );
  }
}

