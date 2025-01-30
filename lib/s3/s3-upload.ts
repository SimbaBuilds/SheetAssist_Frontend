'use server'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export interface S3UploadResult {
  key: string;
  url: string;
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  arrayBuffer: Uint8Array;
}

export async function uploadFileToS3(
  fileData: FileData,
  userId: string
): Promise<S3UploadResult> {
  const startTime = Date.now();
  console.log(`[s3-upload] Starting S3 upload for file: ${fileData.name}`, {
    userId,
    fileSize: fileData.size,
    fileType: fileData.type
  });
  
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const key = `uploads/${userId}/${timestamp}-${randomString}-${fileData.name}`;
  
  try {
    const buffer = Buffer.from(fileData.arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: fileData.type,
    });

    console.log(`[s3-upload] Attempting to upload file to S3`, {
      bucket: BUCKET_NAME,
      key,
      contentType: fileData.type,
      userId
    });
    
    await s3Client.send(command);
    
    const uploadDuration = Date.now() - startTime;
    console.log('[s3-upload] File successfully uploaded to S3', {
      duration: uploadDuration,
      userId,
      fileSize: fileData.size
    });

    // Generate a signed URL that expires in 24 hours
    const getCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 });

    return {
      key,
      url,
    };
  } catch (error) {
    console.error('[s3-upload] Error uploading file to S3:', {
      error,
      userId,
      fileName: fileData.name,
      fileSize: fileData.size
    });
    throw error;
  }
} 