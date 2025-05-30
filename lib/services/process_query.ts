import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileUploadMetadata, QueryRequest, QueryResponse, OnlineSheet, ProcessingState } from '@/lib/types/dashboard';
import { AcceptedMimeType, MIME_TYPES } from '@/lib/constants/file-types';
import { createClient } from '@/lib/supabase/client';
import { isUserOnProPlan, getUserSubscriptionId, trackUsage } from '@/lib/stripe/usage'
import { PLAN_REQUEST_LIMITS, PLAN_IMAGE_LIMITS } from '@/lib/constants/pricing'
import { logRequest } from '@/lib/services/loggers/request-logger';
import { logError } from '@/lib/services/loggers/error-logger';
import { uploadFileToS3 } from '@/lib/s3/s3-upload';
import { S3_SIZE_THRESHOLD } from '@/lib/constants/file-types';
import axios from 'axios';

interface CancellableError extends Error {
  code?: string;
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

  const newRequestCount = (usageData?.requests_this_month || 0) + (success ? 1 : 0);
  const newImageCount = (usageData?.images_processed_this_month || 0) + (success ? numImagesProcessed : 0);
  const imagesToLog = newImageCount - (usageData?.images_processed_this_month || 0);
  
  console.debug('Current usage counts:', { 
    newRequestCount, 
    newImageCount, 
    currentRequests: usageData?.requests_this_month,
    currentImages: usageData?.images_processed_this_month 
  });

  const updateData = {
    requests_this_month: newRequestCount,
    images_processed_this_month: newImageCount,
    requests_this_week: (usageData?.requests_this_week || 0) + (success ? 1 : 0),
    requests_previous_3_months: (usageData?.requests_previous_3_months || 0) + (success ? 1 : 0),
    unsuccessful_requests_this_month: (usageData?.unsuccessful_requests_this_month || 0) + (success ? 0 : 1)
  };

  // Update usage statistics
  const { error: updateError } = await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating user usage:', updateError);
    return;
  }

  console.log('Successfully updated user usage', { userId, updateData });

  // Check if pro user and handle overages
  if (success) {
    const isProUser = await isUserOnProPlan(userId);
    console.debug('Pro user status check:', { userId, isProUser });
    
    if (isProUser) {
      const subscriptionId = await getUserSubscriptionId(userId);
      if (subscriptionId) {
        // Track processing usage if over limit
        if (newRequestCount > PLAN_REQUEST_LIMITS.pro) {
          try {
            await trackUsage({
              subscriptionId,
              type: 'processing',
              quantity: newRequestCount,
              imagesToLog,
              userId
            });
            console.log('Successfully tracked processing usage', { userId });
          } catch (error) {
            console.error('Failed to track processing usage:', { userId, error });
          }
        }
        
        // Track images usage if over limit
        if (newImageCount > PLAN_IMAGE_LIMITS.pro) {
          console.log('Tracking image usage overage', { userId, newImageCount, limit: PLAN_IMAGE_LIMITS.pro });
          try {
            await trackUsage({
              subscriptionId,
              type: 'images',
              quantity: newImageCount,
              imagesToLog,
              userId
            });
            console.log('Successfully tracked image usage', { userId });
          } catch (error) {
            console.error('Failed to track image usage:', { userId, error });
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

    console.log('Starting status polling', { jobId, userId });

    // Check for abort signal immediately
    if (signal?.aborted) {
      console.log('Polling aborted by signal before start', { jobId });
      return {
        status: 'canceled',
        message: 'Request was canceled',
        num_images_processed: 0
      };
    }

    // Add abort signal listener
    signal?.addEventListener('abort', () => {
      console.log('Abort signal received during polling', { jobId });
    });

    while (true) {
      // Check for abort signal at the start of each loop
      if (signal?.aborted) {
        console.log('Polling aborted by signal during loop', { jobId });
        
        // Update the job status to canceled if it's still in progress
        try {
          const { data: currentJob } = await supabase
            .from('jobs')
            .select('status')
            .eq('job_id', jobId)
            .single();

          if (currentJob?.status === 'processing' || currentJob?.status === 'created') {
            await supabase
              .from('jobs')
              .update({
                status: 'canceled',
                message: 'Request was canceled by user',
                completed_at: new Date().toISOString()
              })
              .eq('job_id', jobId);
          }
        } catch (error) {
          console.error('Error updating job status on cancellation:', error);
        }

        return {
          status: 'canceled',
          message: 'Request was canceled',
          num_images_processed: 0,
          job_id: jobId
        };
      }

      if (Date.now() - startTime > MAX_TOTAL_TIME) {
        console.warn('Maximum polling time exceeded', { jobId, totalTime: Date.now() - startTime });
        
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

      try {
        // Check for abort signal before making request
        if (signal?.aborted) {
          console.log('Polling aborted by signal before request', { jobId });
          return {
            status: 'canceled',
            message: 'Request was canceled',
            num_images_processed: 0
          };
        }

        console.debug('Polling job status', { jobId, attempt: retries + 1 });
        const { data: job, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching job:', { jobId, error });
          throw error;
        }

        if (!job) {
          console.error('Job not found', { jobId });
          throw new Error('Job not found');
        }

        // Map job status to response format
        const result: QueryResponse = {
          status: job.status,
          message: job.message || '',
          num_images_processed: job.total_images_processed || 0,
          total_pages: job.total_pages,
          job_id: job.job_id
        };

        console.debug('Current job status', { 
          jobId, 
          status: job.status, 
          imagesProcessed: job.total_images_processed,
          totalPages: job.total_pages 
        });

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
          console.debug('Result file available', { 
            jobId, 
            filePath: job.result_file_path 
          });
        }

        const hasError = 
          job.status === 'error'

        if (hasError) {
          const errorMessage = job.error_message || job.message || 'Backend processing error';
          console.error('Job error detected', { 
            jobId, 
            errorMessage, 
            status: job.status 
          });
          
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
            num_images_processed: job.total_images_processed || 0,
            error: errorMessage
          };
        }

        // Create processing state from job
        const processingState: ProcessingState = {
          status: job.status,
          message: job.message || `Processing your request...`,
          progress: job.images_processed ? {
            processed: job.images_processed,
            total: job.total_pages || null
          } : undefined
        };

        // Update progress for non-error states
        onProgress?.(processingState);

        if (job.status === 'completed') {
          console.log('Job completed successfully', { 
            jobId, 
            totalImagesProcessed: job.total_images_processed 
          });
          return result;
        }

        // Only continue polling if status is 'processing' or 'created'
        if (job.status !== 'processing' && job.status !== 'created') {
          console.warn('Unexpected job status', { 
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

        // Add explicit check for canceled status
        if (job.status === 'canceled') {
          console.log('Job was canceled', { jobId });
          return {
            status: 'canceled',
            message: 'Request was canceled',
            num_images_processed: job.images_processed || 0,
            job_id: jobId
          };
        }

        const backoffTime = Math.min(
          this.POLLING_INTERVAL * Math.pow(1.5, retries),
          15000
        );
        
        console.debug('Waiting before next poll', { 
          jobId, 
          backoffTime, 
          retries 
        });
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;

      } catch (error: unknown) {
        const typedError = error as { code?: string; message?: string };
        console.error('Polling error:', {
          jobId,
          code: typedError?.code,
          message: typedError?.message,
          retries
        });

        // Handle connection timeouts
        if (typedError?.code === 'ECONNABORTED') {
          retries++;
          if (retries >= this.MAX_RETRIES) {
            console.error('Max retries exceeded for connection timeout', { jobId });
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
          console.error('Max retries exceeded for general error', { jobId });
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
    webUrls: OnlineSheet[] = [],
    files?: File[],
    outputPreferences?: OutputPreferences,
    signal?: AbortSignal,
    onProgress?: (state: ProcessingState) => void
  ): Promise<QueryResponse> {
    const startTime = Date.now();
    const supabase = createClient();
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      console.error('Authentication error: User not authenticated');
      throw new Error('User not authenticated');
    }

    // Check for early cancellation
    if (signal?.aborted) {
      return {
        status: 'canceled',
        message: 'Request was canceled',
        num_images_processed: 0
      };
    }

    console.log('Starting query processing', { 
      userId, 
      hasFiles: !!files?.length,
      numUrls: webUrls.length,
      hasOutputPreferences: !!outputPreferences 
    });

    const jobId = "job_" + userId + Date.now().toString();
    // Initialize job in Supabase
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        job_id: jobId,
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
      console.error('Failed to initialize job', { error: jobError });
      throw new Error('Failed to initialize job');
    }

    console.log('Job initialized successfully', { jobId: job.job_id });

    const formData = new FormData();
    const filesMetadata: FileUploadMetadata[] = [];
    const fileUploads: Promise<void>[] = [];

    // Handle file uploads and metadata creation
    if (files?.length) {
      console.log('Processing files for upload', { 
        numFiles: files.length,
        jobId: job.job_id 
      });

      files.forEach((file, originalIndex) => {
        const metadata: FileUploadMetadata = {
          name: file.name,
          type: file.type as AcceptedMimeType,
          extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
          size: file.size,
          index: originalIndex
        };

        const isImage = file.type === MIME_TYPES.PNG || file.type === MIME_TYPES.JPEG || file.type === MIME_TYPES.JPG;
        const isLargePDF = file.type === MIME_TYPES.PDF && file.size >= S3_SIZE_THRESHOLD;
        const shouldUploadToS3 = isImage || isLargePDF;

        if (shouldUploadToS3) {
          console.debug('File qualifies for S3 upload', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            reason: isImage ? 'image type' : 'large PDF',
            userId
          });
          
          const uploadPromise = uploadFileToS3({
            name: file.name,
            type: file.type,
            size: file.size,
            file
          }, userId)
            .then(result => {
              console.log('S3 upload completed', {
                fileName: file.name,
                s3Key: result.key,
                userId
              });
              metadata.s3_key = result.key;
              metadata.s3_url = result.url;
            })
            .catch(error => {
              console.error('S3 upload failed', {
                fileName: file.name,
                error,
                userId
              });
              throw error;
            });
          fileUploads.push(uploadPromise);
        } else {
          console.debug('File will be included in form data', {
            fileName: file.name,
            fileSize: file.size,
            userId
          });
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
      job_id: job.job_id
    };
    formData.append('json_data', JSON.stringify(jsonData));

    try {
      // Update initial processing state
      onProgress?.({
        status: 'processing',
        message: 'Processing your request...'
      });


      // Start both the API call and polling in parallel
      const [apiResponse] = await Promise.all([
        api.post('/process_query', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data'
          },
          signal,
          timeout: this.STANDARD_TIMEOUT,
        }).catch((error: unknown) => {
          // Handle cancellation specifically
          if (axios.isCancel(error) || 
              (error as CancellableError)?.code === 'ERR_CANCELED' || 
              (error as Error)?.name === 'CanceledError') {
            console.log('API request was cancelled');
            throw error;
          }
          throw error;
        }),
        this.pollJobStatus(
          job.job_id,
          userId,
          query,
          signal,
          onProgress
        )
      ]);

      // Get the final job data after both API and polling complete
      const { data: finalJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', job.job_id)
        .single();

      if (!finalJob) {
        throw new Error('Failed to fetch final job data');
      }

      const success = finalJob.status === 'completed';
      const numImagesProcessed = finalJob?.total_images_processed || 0;

      // Log request first
      await logRequest({
        userId,
        query,
        fileMetadata: filesMetadata,
        inputUrls: webUrls,
        startTime,
        status: finalJob.status,
        success,
        errorMessage: !success ? finalJob.message : undefined,
        requestType: 'query',
        numImagesProcessed
      });

      // Update usage
      if (success) {
        await updateUserUsage(userId, true, numImagesProcessed);
      } else {
        await updateUserUsage(userId, false);
      }

      // Construct final QueryResponse from the job data
      const queryResponse: QueryResponse = {
        status: finalJob.status,
        message: finalJob.message || 'Processing complete',
        num_images_processed: finalJob.total_images_processed || 0,
        job_id: finalJob.job_id,
        original_query: finalJob.query,
        error: finalJob.error_message,
        total_pages: finalJob.total_pages,
        files: finalJob.result_file_path ? [{
          file_path: finalJob.result_file_path,
          media_type: finalJob.result_media_type || 'application/octet-stream',
          filename: finalJob.result_file_path.split('/').pop() || 'result',
          download_url: finalJob.result_file_path
        }] : undefined
      };

      return queryResponse;

    } catch (error: unknown) {
      // Handle cancellation
      if (axios.isCancel(error) || 
          (error as CancellableError)?.code === 'ERR_CANCELED' || 
          (error as Error)?.name === 'CanceledError') {
        console.log('Request was cancelled during processing');
        
        // Update processing state immediately on cancellation
        onProgress?.({
          status: 'canceled',
          message: 'Request was canceled'
        });
        
        try {
          // Update job status to canceled (not error)
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              status: 'canceled',  // Changed from 'error' to 'canceled'
              message: 'Request was canceled by user',
              completed_at: new Date().toISOString()
            })
            .eq('job_id', job.job_id);

          if (updateError) {
            console.error('Failed to update job status on cancellation:', updateError);
          }

          // Log the cancellation - don't throw if this fails
          try {
            await logRequest({
              userId,
              query,
              fileMetadata: filesMetadata,
              inputUrls: webUrls,
              startTime,
              status: 'canceled',
              success: false,
              requestType: 'query'
            });
          } catch (logError) {
            console.error('Failed to log canceled request:', logError);
          }
        } catch (dbError) {
          console.error('Error updating job status on cancellation:', dbError);
        }

        // Always return canceled response regardless of DB updates
        return {
          status: 'canceled',
          message: 'Request was canceled',
          num_images_processed: 0,
          job_id: job.job_id
        };
      }

      // Handle other errors
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

      console.error('Error processing query:', {
        jobId: job.job_id,
        error: {
          message: typedError?.message,
          code: typedError?.code,
          status: typedError?.response?.status,
          name: typedError?.name
        }
      });

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



