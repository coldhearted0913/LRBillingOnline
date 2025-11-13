import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_TOKEN = process.env.WHATSAPP_CLOUD_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_CLOUD_API_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION || 'v18.0';

export async function POST(request: NextRequest) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return NextResponse.json(
      {
        success: false,
        error: 'WhatsApp Cloud API credentials are not configured.',
      },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const phone: string | undefined = body?.phone;
    const message: string | undefined = body?.message;
    const templateName: string | undefined = body?.templateName;
    const languageCode: string = body?.languageCode || 'en_US';
    const components: any[] | undefined = body?.components;
    const previewUrl: boolean = Boolean(body?.previewUrl);

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number (with country code) is required.' },
        { status: 400 },
      );
    }

    let payload: Record<string, any>;

    if (templateName && !message) {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components ? { components } : {}),
        },
      };
    } else if (message) {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          preview_url: previewUrl,
          body: message,
        },
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either a free-form message or a templateName.',
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      const messageError =
        result?.error?.message || `WhatsApp API responded with status ${response.status}`;
      return NextResponse.json(
        {
          success: false,
          error: messageError,
          meta: result,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, meta: result });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unexpected error while sending WhatsApp message.',
      },
      { status: 500 },
    );
  }
}

