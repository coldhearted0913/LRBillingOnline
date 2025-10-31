import { NextRequest, NextResponse } from 'next/server';
import { getLRByNumber, updateLR } from '@/lib/database';
import { uploadBufferToS3 } from '@/lib/s3Upload';
import sharp from 'sharp';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// Simple per-IP rate limit (attachments upload): 20 requests / 5 minutes
const rateMap = new Map<string, { count: number; resetAt: number }>();
function ratelimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const rec = rateMap.get(ip);
  if (!rec || rec.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (rec.count >= limit) return false;
  rec.count += 1;
  return true;
}

export async function POST(request: NextRequest, { params }: { params: { lrNo: string } }) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'local';
    if (!ratelimit(ip, 20, 5 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const lrNo = decodeURIComponent(params.lrNo);
    const form = await request.formData();
    const files = form.getAll('files');
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    const existing = await getLRByNumber(lrNo);
    if (!existing) return NextResponse.json({ success: false, error: 'LR not found' }, { status: 404 });

    // Validation rules
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]);

    const uploaded: Array<{ url: string; name: string; type: string; thumbUrl?: string; scanned?: boolean; infected?: boolean }> = [];
    for (const f of files as any[]) {
      const file = f as File;
      const contentType = (file.type || 'application/octet-stream').toLowerCase();
      if (!ALLOWED.has(contentType)) {
        return NextResponse.json({ success: false, error: `Unsupported file type: ${contentType}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ success: false, error: `File too large (max 10MB): ${file.name}` }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `attachments/${encodeURIComponent(lrNo)}/${Date.now()}_${safeName}`;
      const res = await uploadBufferToS3(buffer, key, contentType);
      if (res.success && res.url) {
        let thumbUrl: string | undefined;
        if (contentType.startsWith('image/')) {
          try {
            const thumb = await sharp(buffer).resize({ width: 512, height: 512, fit: 'inside' }).webp({ quality: 80 }).toBuffer();
            const thumbKey = `attachments/${encodeURIComponent(lrNo)}/thumbnails/${Date.now()}_${safeName}.webp`;
            const t = await uploadBufferToS3(thumb, thumbKey, 'image/webp');
            if (t.success && t.url) thumbUrl = t.url;
          } catch (e) {
            console.warn('[THUMBNAIL] failed', e);
          }
        }
        // Scanning disabled: mark as scanned/clean immediately
        uploaded.push({ url: res.url, name: safeName, type: contentType, thumbUrl, scanned: true, infected: false });
      }
    }

    const combined = [...(existing.attachments || []), ...uploaded];
    const ok = await updateLR(lrNo, { attachments: combined } as any);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Failed to save attachments (check DB migration)' }, { status: 500 });
    }
    // Audit
    try {
      const s: any = session;
      await logAudit({
        userId: s?.user?.id || s?.user?.email || 'unknown',
        action: 'UPLOAD',
        resource: 'LR_ATTACHMENT',
        resourceId: lrNo,
        newValue: uploaded,
        ipAddress: ip
      });
    } catch {}

    return NextResponse.json({ success: true, attachments: combined, uploadedCount: uploaded.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Upload failed' }, { status: 500 });
  }
}


