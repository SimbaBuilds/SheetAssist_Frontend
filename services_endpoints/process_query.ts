import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileMetadata, QueryRequest, ProcessedQueryResult, FileInfo, Workbook, InputUrl, BatchProgress } from '@/types/dashboard';
import { AcceptedMimeType } from '@/constants/file-types';
import { createClient } from '@/utils/supabase/client';

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
    requests_this_week: (usageData.requests_this_week || 0) + (success ? 1 : 0),
    requests_this_month: (usageData.requests_this_month || 0) + (success ? 1 : 0),
    images_processed_this_month: (usageData.images_processed_this_month || 0) + (success ? numImagesProcessed : 0),
    requests_previous_3_months: (usageData.requests_previous_3_months || 0) + (success ? 1 : 0),
    unsuccessful_requests_this_month: (usageData.unsuccessful_requests_this_month || 0) + (success ? 0 : 1)
  };

  // Update usage statistics
  await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId);
}

class QueryService {
  // Increase polling interval to reduce server load
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;
  
  // Add new timeout constants
  private readonly BATCH_TIMEOUT = 3600000; // 1 hour for batch processes
  private readonly STANDARD_TIMEOUT = 600000; // Increase to 10 minutes
  private readonly POLLING_TIMEOUT = 60000;   // Increase status check timeout to 1 minute

  private async pollJobStatus(
    jobId: string,
    signal?: AbortSignal
  ): Promise<ProcessedQueryResult> {
    const statusFormData = new FormData();
    statusFormData.append('job_id', jobId);
    let retries = 0;

    while (true) {
      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      try {
        const response = await api.post('/process_query/status', statusFormData, {
          signal,
          timeout: this.POLLING_TIMEOUT,
        });

        const result = response.data;

        // Reset retries on successful response
        retries = 0;

        if (result.status === 'completed' || result.status === 'failed') {
          return result;
        }

        // Add exponential backoff for polling
        const backoffTime = Math.min(this.POLLING_INTERVAL * Math.pow(1.5, retries), 15000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));

      } catch (error) {
        retries++;
        
        // Handle network errors with retry logic
        if (retries >= this.MAX_RETRIES) {
          throw new Error('Max polling retries exceeded');
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
      }
    }
  }

  async processQuery(
    query: string,
    webUrls: InputUrl[] = [],
    files?: File[],
    outputPreferences?: OutputPreferences,
    signal?: AbortSignal,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<ProcessedQueryResult> {
    const startTime = Date.now();
    const supabase = createClient();
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    
    // Modify the files metadata creation
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
      input_urls: webUrls,
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
      const response: AxiosResponse<ProcessedQueryResult> = await api.post('/process_query', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Keep-Alive': 'timeout=3600',
          'Connection': 'keep-alive'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        signal,
        timeout: this.STANDARD_TIMEOUT,
      });

      const initialResult: ProcessedQueryResult = response.data;

      // If this is a batch process, update the timeout and handle polling
      if (initialResult.job_id) {
        // Update timeout for batch processing
        api.defaults.timeout = this.BATCH_TIMEOUT;
        
        let lastProgress = 0;
        
        try {
          while (true) {
            const result = await this.pollJobStatus(initialResult.job_id, signal);
            
            if (onProgress && result.num_images_processed !== lastProgress) {
              lastProgress = result.num_images_processed || 0;
              onProgress({
                message: result.message,
                processed: lastProgress,
                total: result.total_pages || 0
              });
            }

            // Add specific handling for different batch processing states
            if (result.status === 'error') {
              throw new Error(result.message || 'Batch processing failed');
            } else if (result.status === 'success') {
              return result;
            } else if (result.status === 'processing') {
              // Continue polling
              continue;
            }
          }
        } catch (error: unknown) {
          // Type guard for Error objects
          if (error instanceof Error) {
            if (error.message === 'AbortError') {
              throw error;
            }
            // Handle polling errors gracefully
            console.error('Polling error:', error);
            throw new Error('Failed to get batch processing status');
          }
          // Handle non-Error objects
          console.error('Unknown polling error:', error);
          throw new Error('An unexpected error occurred during batch processing');
        } finally {
          // Reset timeout to standard
          api.defaults.timeout = this.STANDARD_TIMEOUT;
        }
      }

      // Handle non-batch processing result
      await updateUserUsage(userId, true, files?.length || 0);
      return initialResult;

    } catch (error) {
      // Check if the error is from axios
      if (error && typeof error === 'object' && 'code' in error) {
        // Handle specific axios error codes
        if (error.code === 'ERR_CANCELED') {
          console.log('Request was cancelled by user');
          const processingTime = Date.now() - startTime;
          await supabase.from('request_log').insert({
            user_id: userId,
            query,
            file_names: files?.map(f => f.name) || [],
            doc_names: webUrls.map(url => url.url),
            processing_time_ms: processingTime,
            status: 'cancelled',
            success: false
          });
          throw new Error('AbortError');
        }
      }
      
      console.error('Error processing query:', error);
      
      // Update user usage statistics for failed request
      await updateUserUsage(userId, false);
      
      // Log failed request
      const processingTime = Date.now() - startTime;
      await supabase.from('request_log').insert({
        user_id: userId,
        query,
        file_names: files?.map(f => f.name) || [],
        doc_names: webUrls.map(url => url.url),
        processing_time_ms: processingTime,
        status: error instanceof Error ? error.name : 'error',
        success: false
      });

      throw error;
    }
  }
}

export const queryService = new QueryService();



