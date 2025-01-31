'use client'

import { generatePresignedUrl } from './generate-presigned-url';

export interface S3UploadResult {
  key: string;
  url: string;
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  file: File;
}

export async function uploadFileToS3(
  fileData: FileData,
  userId: string
): Promise<S3UploadResult> {
  const startTime = Date.now();
  console.log(`[s3-upload] Starting S3 upload process`, {
    userId,
    fileName: fileData.name,
    fileSize: fileData.size,
    fileType: fileData.type
  });

  try {
    // console.log('[s3-upload] Requesting presigned URL', {
    //   userId,
    //   fileName: fileData.name,
    // });

    // Get presigned URL from server
    const { url, key } = await generatePresignedUrl(
      fileData.name,
      fileData.type,
      userId
    );

    // console.log('[s3-upload] Received presigned URL, starting direct upload', {
    //   userId,
    //   key,
    //   urlLength: url.length,
    // });

    // Upload directly to S3 using the presigned URL
    const uploadStartTime = Date.now();
    const response = await fetch(url, {
      method: 'PUT',
      body: fileData.file,
      headers: {
        'Content-Type': fileData.type,
      },
    });

    if (!response.ok) {
      const errorMessage = `Upload failed: ${response.statusText}`;
      console.error('[s3-upload] Direct upload failed', {
        userId,
        key,
        status: response.status,
        statusText: response.statusText,
        duration: Date.now() - uploadStartTime,
      });
      throw new Error(errorMessage);
    }

    const uploadDuration = Date.now() - startTime;
    const directUploadDuration = Date.now() - uploadStartTime;
    // console.log('[s3-upload] File successfully uploaded to S3', {
    //   duration: {
    //     total: uploadDuration,
    //     directUpload: directUploadDuration,
    //   },
    //   userId,
    //   key,
    //   fileSize: fileData.size,
    //   status: response.status,
    // });

    return {
      key,
      url,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[s3-upload] Error in upload process:', {
      error,
      userId,
      fileName: fileData.name,
      fileSize: fileData.size,
      duration,
    });
    throw error;
  }
} 