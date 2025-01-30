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

export interface PresignedUrlResult {
  url: string;
  key: string;
}

export async function generatePresignedUrl(
  fileName: string,
  fileType: string,
  userId: string
): Promise<PresignedUrlResult> {
  const startTime = Date.now();
  console.log('[generate-presigned-url] Starting presigned URL generation', {
    userId,
    fileName,
    fileType,
  });

  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const key = `uploads/${userId}/${timestamp}-${randomString}-${fileName}`;

  console.log('[generate-presigned-url] Generated S3 key', {
    userId,
    key,
    bucket: BUCKET_NAME,
  });

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  try {
    console.log('[generate-presigned-url] Generating presigned URL', {
      userId,
      key,
      contentType: fileType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry

    const duration = Date.now() - startTime;
    console.log('[generate-presigned-url] Successfully generated presigned URL', {
      userId,
      duration,
      key,
      urlLength: url.length,
    });

    return {
      url,
      key,
    };
  } catch (error) {
    console.error('[generate-presigned-url] Error generating presigned URL:', {
      error,
      userId,
      fileName,
      key,
      duration: Date.now() - startTime,
    });
    throw error;
  }
} 