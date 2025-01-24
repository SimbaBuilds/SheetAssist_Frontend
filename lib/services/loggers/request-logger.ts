'use server';

import { createClient } from '@/lib/supabase/server';
import { InputUrl, FileUploadMetadata } from '@/lib/types/dashboard';

interface LogRequestParams {
  userId: string;
  query?: string;
  fileMetadata?: FileUploadMetadata[];
  inputUrls?: InputUrl[];
  startTime: number;
  status: string;
  success: boolean;
  errorMessage?: string;
  requestType: 'query' | 'visualization';
  totalTokens?: number;
  numImagesProcessed?: number;
}

export async function logRequest({
  userId,
  query,
  fileMetadata,
  inputUrls,
  startTime,
  status,
  success,
  errorMessage,
  requestType,
  totalTokens,
  numImagesProcessed
}: LogRequestParams) {
  const supabase = await createClient();
  const processingTime = Date.now() - startTime;

  try {
    await supabase.from('request_log').insert({
      user_id: userId,
      query,
      file_names: fileMetadata?.map(f => f.name) || [],
      doc_names: inputUrls?.map(url => url.url) || [],
      processing_time_ms: processingTime,
      status,
      success,
      error_message: errorMessage,
      request_type: requestType,
      total_tokens: totalTokens,
      num_images_processed: numImagesProcessed
    });
  } catch (error) {
    console.error('Failed to log request:', error);
  }
} 