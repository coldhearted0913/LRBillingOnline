import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

// Get fresh config on each call (to pick up env vars)
const getS3Config = () => {
  const config = {
    region: process.env.S3_REGION || 'ap-south-1',
    bucket: process.env.S3_BUCKET_NAME || 'lr-billing-invoices-mangesh',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  };
  
  // Debug logging
  console.log('🔍 S3 Config Check:', {
    region: config.region,
    bucket: config.bucket,
    hasAccessKey: !!config.accessKeyId,
    hasSecretKey: !!config.secretAccessKey,
    // Don't log actual keys for security
  });
  
  return config;
};

let s3Client: S3Client | null = null;

// Initialize S3 client
const getS3Client = () => {
  const config = getS3Config();
  
  if (!config.accessKeyId || !config.secretAccessKey) {
    console.log('AWS credentials not configured - S3 upload disabled');
    console.log('S3_ACCESS_KEY_ID:', config.accessKeyId ? 'SET' : 'NOT SET');
    console.log('S3_SECRET_ACCESS_KEY:', config.secretAccessKey ? 'SET' : 'NOT SET');
    return null;
  }
  
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    console.log('S3 client initialized for bucket:', config.bucket);
  }
  
  return s3Client;
};

// Normalize folder names like YYYY-MM-DD to DD-MM-YYYY for S3 paths
const normalizeFolderDate = (folder: string | undefined | null): string => {
  const f = (folder || '').trim();
  // If matches 4-2-2 with dashes, convert to DD-MM-YYYY
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(f);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}-${mo}-${y}`;
  }
  return f;
};

// Upload file to S3
export const uploadFileToS3 = async (
  filePath: string,
  s3Folder: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const client = getS3Client();
    
    if (!client) {
      return {
        success: false,
        error: 'S3 not configured - skipping upload',
      };
    }
    
    // Read file
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const folder = normalizeFolderDate(s3Folder);
    const s3Key = `${folder}/${fileName}`;
    
    // Get config for bucket name
    const config = getS3Config();
    
    console.log('Uploading to S3:', { bucket: config.bucket, key: s3Key });
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    await client.send(command);
    
    console.log('S3 upload successful:', s3Key);
    
    const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Key}`;
    
    return {
      success: true,
      url,
    };
  } catch (error: any) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (
  filePaths: string[],
  s3Folder: string,
  concurrency = 6
): Promise<Array<{ file: string; success: boolean; url?: string; error?: string }>> => {
  const results: Array<{ file: string; success: boolean; url?: string; error?: string }> = new Array(filePaths.length);
  let idx = 0;
  async function worker() {
    while (idx < filePaths.length) {
      const i = idx++;
      const filePath = filePaths[i];
      try {
        const result = await uploadFileToS3(filePath, s3Folder);
        results[i] = { file: path.basename(filePath), ...result } as any;
      } catch (e: any) {
        results[i] = { file: path.basename(filePath), success: false, error: e?.message || 'Upload failed' };
      }
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, filePaths.length) }, () => worker());
  await Promise.allSettled(runners);
  return results;
};

// Upload buffer (for API uploads)
export const uploadBufferToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const client = getS3Client();
    if (!client) return { success: false, error: 'S3 not configured - skipping upload' };
    const config = getS3Config();
    const fileName = key.split('/').pop() || 'file';
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${fileName}"`
    });
    await client.send(command);
    const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
    return { success: true, url };
  } catch (e: any) {
    return { success: false, error: e.message || 'Upload failed' };
  }
};

// Create a presigned GET URL to download an object as attachment
export const generatePresignedDownloadUrl = async (
  input: { key?: string; url?: string; fileName?: string }
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const client = getS3Client();
    if (!client) return { success: false, error: 'S3 not configured' };
    const config = getS3Config();

    // Derive key from either key or full URL
    let { key } = input;
    if (!key && input.url) {
      const u = new URL(input.url);
      // URL path begins with '/'. Do NOT decode; S3 object keys may contain literal %2F
      key = u.pathname.replace(/^\//, '');
    }
    if (!key) return { success: false, error: 'Missing key/url' };

    const fileName = input.fileName || key.split('/').pop() || 'file';
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`
    });
    const signed = await getSignedUrl(client as any, command as any, { expiresIn: 60 });
    return { success: true, url: signed };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to sign URL' };
  }
};

// Delete object by key or URL
export const deleteFromS3 = async (input: { key?: string; url?: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getS3Client();
    if (!client) return { success: false, error: 'S3 not configured' };
    const config = getS3Config();
    let { key } = input;
    if (!key && input.url) {
      const u = new URL(input.url);
      key = u.pathname.replace(/^\//, '');
    }
    if (!key) return { success: false, error: 'Missing key/url' };
    const cmd = new DeleteObjectCommand({ Bucket: config.bucket, Key: key });
    await (client as any).send(cmd as any);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Delete failed' };
  }
};

