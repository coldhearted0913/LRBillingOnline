import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Get fresh config on each call (to pick up env vars)
const getS3Config = () => {
  return {
    region: process.env.S3_REGION || 'ap-south-1',
    bucket: process.env.S3_BUCKET_NAME || 'lr-billing-invoices-mangesh',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  };
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
    const s3Key = `${s3Folder}/${fileName}`;
    
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
  s3Folder: string
): Promise<Array<{ file: string; success: boolean; url?: string; error?: string }>> => {
  const results = [];
  
  for (const filePath of filePaths) {
    const result = await uploadFileToS3(filePath, s3Folder);
    results.push({
      file: path.basename(filePath),
      ...result,
    });
  }
  
  return results;
};

