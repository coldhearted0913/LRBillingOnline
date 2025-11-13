import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      configured: false,
      variables: {},
      client: null,
      errors: [],
      warnings: [],
    };

    // Check environment variables
    results.variables = {
      TWILIO_ACCOUNT_SID: accountSid ? '✅ Set' : '❌ Missing',
      TWILIO_AUTH_TOKEN: authToken ? '✅ Set' : '❌ Missing',
      TWILIO_WHATSAPP_FROM: fromNumber ? '✅ Set' : '❌ Missing',
    };

    if (!accountSid) {
      results.errors.push('TWILIO_ACCOUNT_SID is not set');
    }
    if (!authToken) {
      results.errors.push('TWILIO_AUTH_TOKEN is not set');
    }
    if (!fromNumber) {
      results.errors.push('TWILIO_WHATSAPP_FROM is not set');
    }

    if (results.errors.length > 0) {
      return NextResponse.json({
        success: false,
        ...results,
        message: 'Missing required environment variables',
      });
    }

    results.configured = true;

    // Validate phone number format
    // At this point, fromNumber is guaranteed to be set (checked above)
    const formattedFrom = fromNumber!.startsWith('whatsapp:')
      ? fromNumber!
      : `whatsapp:${fromNumber!}`;

    if (fromNumber !== formattedFrom) {
      results.warnings.push(
        `TWILIO_WHATSAPP_FROM should start with 'whatsapp:' prefix. Expected: ${formattedFrom}`
      );
    }

    // Test Twilio client initialization
    try {
      const client = twilio(accountSid!, authToken!);
      results.client = '✅ Initialized successfully';

      // Test API connection
      try {
        const account = await client.api.accounts(accountSid!).fetch();
        results.account = {
          status: account.status,
          friendlyName: account.friendlyName,
          type: account.type,
        };
      } catch (error: any) {
        results.errors.push(`Failed to connect to Twilio API: ${error.message}`);
      }
    } catch (error: any) {
      results.errors.push(`Failed to initialize Twilio client: ${error.message}`);
      results.client = '❌ Initialization failed';
    }

    const success = results.errors.length === 0;

    return NextResponse.json({
      success,
      ...results,
      formattedFrom,
      message: success
        ? 'Twilio configuration is valid!'
        : 'Twilio configuration has errors',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to test Twilio configuration',
      },
      { status: 500 }
    );
  }
}

