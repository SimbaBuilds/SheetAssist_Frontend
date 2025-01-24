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

export async function uploadFileToS3(
  file: File,
  userId: string
): Promise<S3UploadResult> {
  console.log(`Starting S3 upload for file: ${file.name}`);
  
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const key = `uploads/${userId}/${timestamp}-${randomString}-${file.name}`;
  
  console.log(`Generated S3 key: ${key}`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    console.log(`Attempting to upload file to S3 bucket: ${BUCKET_NAME}`);
    await s3Client.send(command);
    console.log('File successfully uploaded to S3');

    // Generate a signed URL that expires in 24 hours
    const getCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 });
    console.log('Generated signed URL for uploaded file');

    return {
      key,
      url,
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
} 