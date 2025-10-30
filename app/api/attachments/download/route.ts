import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getLRByNumber } from '@/lib/database';

function getS3() {
  const region = process.env.S3_REGION || 'ap-south-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID as string | undefined;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY as string | undefined;
  const bucket = process.env.S3_BUCKET_NAME as string | undefined;
  if (!accessKeyId || !secretAccessKey || !bucket) throw new Error('S3 not configured');
  const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return { client, bucket };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const name = searchParams.get('name') || 'attachment';
    if (!key || !key.startsWith('attachments/')) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Enforce: only allow downloads when attachment is scanned clean
    // Derive LR No from key: attachments/{encodeURIComponent(lrNo)}/...
    const parts = key.split('/');
    if (parts.length < 2) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid key structure' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const lrNoEncoded = parts[1];
    const lrNo = decodeURIComponent(lrNoEncoded);

    const lr = await getLRByNumber(lrNo);
    if (!lr) {
      return new Response(JSON.stringify({ success: false, error: 'LR not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    const attachments = (lr as any).attachments || [];
    const att = attachments.find((a: any) => typeof a?.url === 'string' && a.url.includes(key));
    // Allow thumbnails even if not listed (derived from originals) but require original scanned clean
    const isThumb = key.includes('/thumbnails/');
    if (!att && !isThumb) {
      return new Response(JSON.stringify({ success: false, error: 'Attachment not recorded' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (att) {
      if (!att.scanned) {
        return new Response(JSON.stringify({ success: false, error: 'File pending antivirus scan' }), { status: 423, headers: { 'Content-Type': 'application/json' } });
      }
      if (att.infected) {
        return new Response(JSON.stringify({ success: false, error: 'File flagged as infected' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const { client, bucket } = getS3();
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const obj = await client.send(cmd);
    const body: any = obj.Body;
    const contentType = obj.ContentType || 'application/octet-stream';
    const headers = new Headers();
    headers.set('Content-Type', contentType as string);
    headers.set('Content-Disposition', `attachment; filename="${name}"`);
    // Cache short
    headers.set('Cache-Control', 'private, max-age=60');
    return new Response(body as ReadableStream, { status: 200, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'Failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


