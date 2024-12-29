'use server';

import { createClient } from '@/lib/supabase/server';

interface LogErrorParams {
  userId: string;
  originalQuery?: string;
  fileNames?: string[];
  docNames?: string[];
  message: string;
  errorCode?: string;
  requestType?: 'query' | 'visualization';
  errorMessage?: string;
  startTime?: number;
}

export async function logError({
  userId,
  originalQuery,
  fileNames,
  docNames,
  message,
  errorCode,
  requestType,
  errorMessage,
  startTime
}: LogErrorParams) {
  const supabase = await createClient();
  const processingTime = startTime ? Date.now() - startTime : null;

  try {
    await supabase.from('error_log').insert({
      user_id: userId,
      original_query: originalQuery,
      file_names: fileNames,
      doc_names: docNames,
      message,
      error_code: errorCode,
      request_type: requestType,
      error_message: errorMessage,
      processing_time_ms: processingTime
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}
