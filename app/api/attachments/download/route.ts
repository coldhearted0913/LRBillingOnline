import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
    if (!key || (!key.startsWith('attachments/') && !key.startsWith('lr-files/'))) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // SECURITY: Check file size before downloading to prevent DoS attacks
    const MAX_DOWNLOAD_SIZE = 50 * 1024 * 1024; // 50MB
    const { client, bucket } = getS3();
    
    // Get file metadata first
    const headCmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const headResult = await client.send(headCmd);
    const fileSize = headResult.ContentLength || 0;
    
    if (fileSize > MAX_DOWNLOAD_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: 'File too large to download' }), 
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Scanning disabled: skip AV gating and serve directly
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


