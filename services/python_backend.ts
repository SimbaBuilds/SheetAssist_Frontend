import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileMetadata, QueryRequest, ProcessedQueryResult, FileInfo } from '@/types/dashboard';
import { AcceptedMimeType } from '@/constants/file-types';
import { createClient } from '@/utils/supabase/client';
import { request } from 'http';

interface DocumentTitle {
  url: string;
  title?: string;
  error?: string;
  success: boolean;
}

// Helper function to update user usage statistics
async function updateUserUsage(userId: string, success: boolean, numImagesProcessed: number = 0) {
  const supabase = createClient();
  
  // Get current usage data
  const { data: usageData, error: usageError } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (usageError) {
    console.error('Error fetching user usage:', usageError);
    return;
  }

  // Prepare update data
  const updateData = {
    requests_this_week: (usageData.requests_this_week || 0) + 1,
    requests_this_month: (usageData.requests_this_month || 0) + 1,
    images_processed_this_month: (usageData.images_processed_this_month || 0) + numImagesProcessed,
    requests_previous_3_months: (usageData.requests_previous_3_months || 0) + 1,
    unsuccessful_requests: (usageData.unsuccessful_requests || 0) + (success ? 0 : 1)
  };

  // Update usage statistics
  await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId);
}

// Function to process the query
export const processQuery = async (
  query: string,
  webUrls: string[] = [],
  files?: File[],
  outputPreferences?: OutputPreferences
): Promise<ProcessedQueryResult> => {
  const startTime = Date.now();
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const formData = new FormData();
  
  // Create files metadata array with index only if files exist
  const filesMetadata: FileMetadata[] = files?.map((file, index) => ({
    name: file.name,
    type: file.type as AcceptedMimeType,
    extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
    size: file.size,
    index
  })) ?? [];

  // Part 1: JSON payload with metadata
  const jsonData: QueryRequest = {
    query,
    web_urls: webUrls,
    files_metadata: filesMetadata,
    output_preferences: outputPreferences
  };
  formData.append('json_data', JSON.stringify(jsonData));

  // Part 2: Append files only if they exist
  if (files?.length) {
    files.forEach((file, index) => {
      formData.append('files', file);
    });
  }

  try {
    const response: AxiosResponse<ProcessedQueryResult> = await api.post(
      '/process_query',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // Update user usage statistics
    await updateUserUsage(
      userId,
      response.data.status === 'success',
      response.data.num_images_processed || 0
    );

    // Log the request to Supabase
    const processingTime = Date.now() - startTime;
    await supabase.from('request_log').insert({
      user_id: userId,
      query,
      file_names: files?.map(f => f.name) || [],
      doc_names: webUrls,
      processing_time_ms: processingTime,
      status: response.data.status,
      success: response.data.status === 'success'
    });

    return response.data;
  } catch (error) {
    console.error('Error processing query:', error);
    
    // Update user usage statistics for failed request
    await updateUserUsage(userId, false);
    
    // Log failed request
    const processingTime = Date.now() - startTime;
    await supabase.from('request_log').insert({
      user_id: userId,
      query,
      file_names: files?.map(f => f.name) || [],
      doc_names: webUrls,
      processing_time_ms: processingTime,
      status: 'error',
      success: false
    });

    throw error;
  }
};

// Download function
export const downloadFile = async (fileInfo: FileInfo): Promise<void> => {
  try {
    const response = await api.get(`/download`, {
      params: {
        file_path: fileInfo.file_path
      },
      responseType: 'blob'
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: fileInfo.media_type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo.filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// Function to get document titles from URLs
export const getDocumentTitles = async (urls: string[]): Promise<DocumentTitle[]> => {
  try {
    const response: AxiosResponse<DocumentTitle[]> = await api.post('/get_document_titles', { urls });
    return response.data;
  } catch (error) {
    console.error('Error fetching document titles:', error);
    throw error;
  }
};
