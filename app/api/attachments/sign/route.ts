import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePresignedDownloadUrl } from '@/lib/s3Upload';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    // Require authentication (any logged-in role)
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url') || undefined;
    const key = searchParams.get('key') || undefined;
    const name = searchParams.get('name') || undefined;
    if (!url && !key) {
      return NextResponse.json({ success: false, error: 'Missing url or key' }, { status: 400 });
    }

    // Validate bucket/host and prefix when using url
    if (url) {
      const u = new URL(url);
      const region = process.env.S3_REGION || 'ap-south-1';
      const bucket = process.env.S3_BUCKET_NAME || '';
      const allowedHost = `${bucket}.s3.${region}.amazonaws.com`;
      if (!bucket || u.hostname !== allowedHost) {
        return NextResponse.json({ success: false, error: 'Invalid host' }, { status: 400 });
      }
      if (!u.pathname.startsWith('/attachments/')) {
        return NextResponse.json({ success: false, error: 'Invalid key prefix' }, { status: 400 });
      }
    }

    // Validate provided key prefix when using key
    if (key && !key.startsWith('attachments/')) {
      return NextResponse.json({ success: false, error: 'Invalid key prefix' }, { status: 400 });
    }

    // Optional: block downloads until scanned clean
    // If the client provides lrNo we could lookup; when only URL is provided, enforce prefix only.
    const res = await generatePresignedDownloadUrl({ url, key, fileName: name || undefined });
    if (!res.success || !res.url) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to sign' }, { status: 500 });
    }
    try {
      const s: any = session;
      await logAudit({
        userId: s?.user?.id || s?.user?.email || 'unknown',
        action: 'DOWNLOAD_LINK',
        resource: 'LR_ATTACHMENT',
        resourceId: key || url || undefined,
        newValue: { signed: true }
      });
    } catch {}
    return NextResponse.json({ success: true, url: res.url });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Error' }, { status: 500 });
  }
}


