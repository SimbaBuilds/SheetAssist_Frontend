import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileUploadMetadata, QueryRequest, QueryResponse, InputUrl, ProcessingState } from '@/lib/types/dashboard';
import { AcceptedMimeType, MIME_TYPES } from '@/lib/constants/file-types';
import { createClient } from '@/lib/supabase/client';
import { isUserOnProPlan, getUserSubscriptionId, trackUsage } from '@/lib/stripe/usage'
import { PLAN_REQUEST_LIMITS, PLAN_IMAGE_LIMITS } from '@/lib/constants/pricing'
import { logRequest } from '@/lib/services/loggers/request-logger';
import { logError } from '@/lib/services/loggers/error-logger';
import { uploadFileToS3 } from '@/lib/s3/s3-upload';
import { S3_SIZE_THRESHOLD } from '@/lib/constants/file-types';




// Helper function to update user usage statistics
async function updateUserUsage(userId: string, success: boolean, numImagesProcessed: number = 0) {
  // console.log('🔍 [process_query] Starting updateUserUsage:', { userId, success, numImagesProcessed });
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

  const newRequestCount = (usageData?.requests_this_month || 0) + (success ? 1 : 0);
  const newImageCount = (usageData?.images_processed_this_month || 0) + (success ? numImagesProcessed : 0);
  const imagesToLog = newImageCount - (usageData?.images_processed_this_month || 0);
  // console.log('🔍 [process_query] Current usage counts:', { 
  //   newRequestCount, 
  //   newImageCount, 
  //   currentRequests: usageData?.requests_this_month,
  //   currentImages: usageData?.images_processed_this_month 
  // });

  const updateData = {
    requests_this_month: newRequestCount,
    images_processed_this_month: newImageCount,
    requests_this_week: (usageData?.requests_this_week || 0) + (success ? 1 : 0),
    requests_previous_3_months: (usageData?.requests_previous_3_months || 0) + (success ? 1 : 0),
    unsuccessful_requests_this_month: (usageData?.unsuccessful_requests_this_month || 0) + (success ? 0 : 1)
  };

  // Update usage statistics
  await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId);

  // Check if pro user and handle overages
  if (success) {
    const isProUser = await isUserOnProPlan(userId);
    if (isProUser) {
      const subscriptionId = await getUserSubscriptionId(userId);
      if (subscriptionId) {
        // Track processing usage if over limit
        if (newRequestCount > PLAN_REQUEST_LIMITS.pro) {
          // console.log(`[process_query] Tracking processing usage overage for user ${userId}. Count: ${newRequestCount}`);
          try {
            await trackUsage({
              subscriptionId,
              type: 'processing',
              quantity: newRequestCount,
              imagesToLog,
              userId
            });
            // console.log(`[process_query] Successfully tracked processing usage for user ${userId}`);
          } catch (error) {
            console.error(`[process_query] Failed to track processing usage for user ${userId}:`, error);
          }
        }
        
        // Track images usage if over limit
        if (newImageCount > PLAN_IMAGE_LIMITS.pro) {
          // console.log(`[process_query] Tracking image usage overage for user ${userId}. Count: ${newImageCount}`);
          try {
            await trackUsage({
              subscriptionId,
              type: 'images',
              quantity: newImageCount,
              imagesToLog,
              userId
            });
            // console.log(`[process_query] Successfully tracked image usage for user ${userId}`);
          } catch (error) {
            console.error(`[process_query] Failed to track image usage for user ${userId}:`, error);
          }
        }
      }
    }
  }
}

class QueryService {
  // Increase polling interval to reduce server load
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RETRIES = 15;
  
  // Add new timeout constants
  private readonly BATCH_TIMEOUT = 7200000; // 2 hours for batch processes
  private readonly STANDARD_TIMEOUT = 600000; // 10 minutes
  private readonly POLLING_TIMEOUT = 180000;   // 3 minutes

  private async pollJobStatus(
    jobId: string,
    userId: string,
    query: string,
    signal?: AbortSignal,
    onProgress?: (state: ProcessingState) => void
  ): Promise<QueryResponse> {
    let retries = 0;
    const startTime = Date.now();
    const MAX_TOTAL_TIME = 3600000; // 1 hour max total polling time
    const supabase = createClient();

    console.log('[PollJobStatus] Starting polling loop', { jobId });

    while (true) {
      if (Date.now() - startTime > MAX_TOTAL_TIME) {
        console.warn('[PollJobStatus] Maximum polling time exceeded', { jobId, totalTime: Date.now() - startTime });
        const errorState: ProcessingState = {
          status: 'error',
          message: 'Maximum polling time exceeded'
        };
        onProgress?.(errorState);
        return {
          status: 'error',
          message: errorState.message,
          num_images_processed: 0
        };
      }

      if (signal?.aborted) {
        console.log('[PollJobStatus] Polling aborted by signal', { jobId });
        return {
          status: 'canceled',
          message: 'Request was canceled',
          num_images_processed: 0
        };
      }

      try {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('[PollJobStatus] Error fetching job:', { jobId, error });
          throw error;
        }

        if (!job) {
          console.error('[PollJobStatus] Job not found', { jobId });
          throw new Error('Job not found');
        }

        // Log state changes
        console.log('[PollJobStatus] Job status update', {
          jobId,
          status: job.status,
          imagesProcessed: job.images_processed,
          totalPages: job.total_pages
        });

        // Map job status to response format
        const result: QueryResponse = {
          status: job.status,
          message: job.message || '',
          num_images_processed: job.total_images__processed || 0,
          total_pages: job.total_pages,
          job_id: job.job_id
        };

        if (job.error_message) {
          result.error = job.error_message;
        }

        if (job.result_file_path) {
          result.files = [{
            file_path: job.result_file_path,
            media_type: job.result_media_type || 'application/octet-stream',
            filename: job.result_file_path.split('/').pop() || 'result',
            download_url: job.result_file_path
          }];
        }

        const hasError = 
          job.status === 'error' || 
          job.error_message || 
          (job.message && job.message.toLowerCase().includes('error'));

        if (hasError) {
          console.error('[PollJobStatus] Job error detected', {
            jobId,
            status: job.status,
            errorMessage: job.error_message || job.message
          });
          
          const errorMessage = job.error_message || job.message || 'Backend processing error';
          await logError({
            userId,
            originalQuery: query,
            message: job.message || 'Backend processing error',
            errorCode: 'BACKEND_ERROR',
            requestType: 'query',
            startTime
          });
          
          const errorState: ProcessingState = {
            status: 'error',
            message: errorMessage
          };
          onProgress?.(errorState);
          
          return {
            status: 'error',
            message: errorMessage,
            num_images_processed: job.total_images__processed || 0,
            error: errorMessage
          };
        }

        // Create processing state from job
        const processingState: ProcessingState = {
          status: job.status,
          message: job.message || `Processing page ${job.images_processed || 0} of ${job.total_pages || '?'}`,
          progress: job.images_processed ? {
            processed: job.images_processed,
            total: job.total_pages || null
          } : undefined
        };

        // Update progress for non-error states
        onProgress?.(processingState);

        if (job.status === 'completed') {
          console.log('[PollJobStatus] Job completed successfully', {
            jobId,
            totalTime: Date.now() - startTime,
            imagesProcessed: job.total_images__processed
          });
          return result;
        }

        // Only continue polling if status is 'processing' or 'created'
        if (job.status !== 'processing' && job.status !== 'created') {
          console.warn('[PollJobStatus] Unexpected job status', {
            jobId,
            status: job.status
          });
          const errorState: ProcessingState = {
            status: 'error',
            message: `Unexpected status: ${job.status}`
          };
          onProgress?.(errorState);
          return {
            status: 'error',
            message: errorState.message,
            num_images_processed: job.images_processed || 0
          };
        }

        const backoffTime = Math.min(
          this.POLLING_INTERVAL * Math.pow(1.5, retries),
          15000
        );
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;

      } catch (error: unknown) {
        const typedError = error as { code?: string; message?: string };
        console.error('[PollJobStatus] Polling error:', {
          jobId,
          code: typedError?.code,
          message: typedError?.message,
          retries
        });

        // Handle connection timeouts
        if (typedError?.code === 'ECONNABORTED') {
          retries++;
          if (retries >= this.MAX_RETRIES) {
            console.error('[PollJobStatus] Max retries exceeded on timeout', { jobId, retries });
            const errorState: ProcessingState = {
              status: 'error',
              message: 'Connection timeout',
            };
            onProgress?.(errorState);
            return {
              status: 'error',
              message: errorState.message,
              num_images_processed: 0
            };
          }
          // Wait longer between retries on timeout
          await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL * 2));
          continue;
        }

        // For other errors
        retries++;
        if (retries >= this.MAX_RETRIES) {
          console.error('[PollJobStatus] Max retries exceeded', { jobId, retries });
          const errorState: ProcessingState = {
            status: 'error',
            message: 'Maximum retry attempts exceeded',
            details: 'There was a problem processing your request. Please try again later.'
          };
          onProgress?.(errorState);
          return {
            status: 'error',
            message: 'Maximum retry attempts exceeded. Please try rephrasing your request or breaking it down into multiple steps.',
            num_images_processed: 0
          };
        }
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
    onProgress?: (state: ProcessingState) => void
  ): Promise<QueryResponse> {
    console.log('[ProcessQuery] Starting query processing', {
      hasFiles: !!files?.length,
      numWebUrls: webUrls.length,
      hasOutputPreferences: !!outputPreferences
    });
    
    const startTime = Date.now();
    const supabase = createClient();
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Initialize job in Supabase
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        status: 'created',
        query: query,
        type: 'standard',
        output_preferences: outputPreferences || null,
        created_at: new Date().toISOString(),
        images_processed: 0
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[ProcessQuery] Failed to initialize job:', jobError);
      throw new Error('Failed to initialize job');
    }

    console.log('[ProcessQuery] Job initialized', { jobId: job.job_id });

    const formData = new FormData();
    
    // Handle file uploads and metadata creation
    const filesMetadata: FileUploadMetadata[] = [];
    const fileUploads: Promise<void>[] = [];
    
    if (files?.length) {
      console.log('[ProcessQuery] Processing files for upload', { 
        numFiles: files.length,
        totalSize: files.reduce((acc, f) => acc + f.size, 0)
      });
      
      files.forEach((file, originalIndex) => {
        const metadata: FileUploadMetadata = {
          name: file.name,
          type: file.type as AcceptedMimeType,
          extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
          size: file.size,
          index: originalIndex  // Keep original index in metadata
        };

        const isImage = file.type === MIME_TYPES.PNG || file.type === MIME_TYPES.JPEG || file.type === MIME_TYPES.JPG;
        if (file.size >= S3_SIZE_THRESHOLD || isImage) {
          console.log('[ProcessQuery] File will be uploaded to S3', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            reason: file.size >= S3_SIZE_THRESHOLD ? 'size' : 'image type'
          });
          
          const uploadPromise = uploadFileToS3({
            name: file.name,
            type: file.type,
            size: file.size,
            file
          }, userId)
            .then(result => {
              console.log('[process_query] S3 upload completed successfully', {
                fileName: file.name,
                s3Key: result.key,
                userId
              });
              metadata.s3_key = result.key;
              metadata.s3_url = result.url;
            })
            .catch(error => {
              console.error('[process_query] S3 upload failed', {
                fileName: file.name,
                error,
                userId
              });
              throw error;
            });
          fileUploads.push(uploadPromise);
        } else {
          console.log('[process_query] File below S3 threshold, including in form data', {
            fileName: file.name,
            fileSize: file.size,
            userId
          });
          // Small file - append to formData directly with 'files' key
          formData.append('files', file);
        }

        filesMetadata.push(metadata);
      });
    }

    // Wait for all S3 uploads to complete
    if (fileUploads.length > 0) {
      await Promise.all(fileUploads);
    }

    // Part 1: JSON payload with metadata
    const jsonData: QueryRequest = {
      query,
      input_urls: webUrls,
      files_metadata: filesMetadata,
      output_preferences: outputPreferences,
      job_id: job.job_id // Include the job_id in the request
    };
    formData.append('json_data', JSON.stringify(jsonData));

    try {
      // Update initial processing state
      onProgress?.({
        status: 'processing',
        message: 'Processing your request...'
      });

      console.log('[ProcessQuery] Sending request to backend', {
        hasFilesMetadata: filesMetadata.length > 0,
        formDataSize: formData.get('files') ? 'present' : 'none'
      });

      const response: AxiosResponse<QueryResponse> = await api.post('/process_query', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        signal,
        timeout: this.STANDARD_TIMEOUT,
      });

      console.log('[ProcessQuery] Initial backend response received', {
        status: response.data.status,
        hasFiles: !!response.data.files?.length
      });
      
      // Set timeout for polling
      api.defaults.timeout = this.BATCH_TIMEOUT;
      
      try {
        console.log('[ProcessQuery] Starting job status polling', { jobId: job.job_id });
        const result = await this.pollJobStatus(
          job.job_id,
          userId,
          query,
          signal,
          onProgress
        );

        // Handle the polling result
        if (result.status === 'error' || result.status === 'canceled') {
          console.log('[ProcessQuery] Job completed with error/canceled status', {
            status: result.status,
            message: result.message
          });
          await logRequest({
            userId,
            query,
            fileMetadata: filesMetadata,
            inputUrls: webUrls,
            startTime,
            status: result.status,
            success: false,
            errorMessage: result.message,
            requestType: 'query',
            numImagesProcessed: result.num_images_processed
          });
          return result;
        }

        await logRequest({
          userId,
          query,
          fileMetadata: filesMetadata,
          inputUrls: webUrls,
          startTime,
          status: 'completed',
          success: true,
          requestType: 'query',
          numImagesProcessed: result.num_images_processed
        });
        await updateUserUsage(userId, true, result.num_images_processed || 0);
        return result;
      } catch (error) {
        console.error('Unexpected error during polling:', error);
        const errorState: ProcessingState = {
          status: 'error',
          message: 'An unexpected error occurred',
          details: 'Please try again later or contact support if the problem persists.'
        };
        onProgress?.(errorState);
        return {
          status: 'error',
          message: errorState.message,
          num_images_processed: 0
        };
      } finally {
        // Reset timeout to standard
        api.defaults.timeout = this.STANDARD_TIMEOUT;
      }
    } catch (error: unknown) {
      const typedError = error as { 
        response?: { 
          data?: { message?: string }, 
          status?: number 
        }, 
        message?: string, 
        code?: string, 
        stack?: string,
        name?: string 
      };
      const errorMessage = typedError?.response?.data?.message || 
                         typedError?.message || 
                         'An unexpected error occurred';
      
      onProgress?.({
        status: 'error',
        message: errorMessage
      });

      // Update job status to error
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('job_id', job.job_id);

      // Log error to both tables
      const errorCode = typedError?.response?.status?.toString() || typedError?.code || 'UNKNOWN';
      await Promise.all([
        // Log to error_log table
        logError({
          userId,
          originalQuery: query,
          fileNames: files?.map(f => f.name),
          docNames: webUrls.map(url => url.url),
          message: errorMessage,
          errorCode,
          requestType: 'query',
          errorMessage: typedError?.stack,
          startTime
        }),
        // Log to request_log table (existing)
        logRequest({
          userId,
          query,
          fileMetadata: filesMetadata,
          inputUrls: webUrls,
          startTime,
          status: (typedError?.response?.status?.toString() || typedError?.name || 'error') as string,
          success: false,
          errorMessage,
          requestType: 'query'
        })
      ]);

      // Update user usage statistics for failed request
      await updateUserUsage(userId, false);

      throw error;
    }
  }
}

export const queryService = new QueryService();



