import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileMetadata, QueryRequest, ProcessedQueryResult, FileInfo, Workbook, InputUrl, BatchProgress } from '@/types/dashboard';
import { AcceptedMimeType } from '@/constants/file-types';
import { createClient } from '@/utils/supabase/client';
import { getDocument, version } from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

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

// Add this helper function to get PDF page count
async function getPDFPageCount(file: File): Promise<number> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Load the PDF document
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    pdf.destroy();
    return pageCount;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    return 0;
  }
}

class QueryService {
  private readonly POLLING_INTERVAL = 2000; // 2 seconds

  private async pollJobStatus(
    jobId: string,
    signal?: AbortSignal
  ): Promise<ProcessedQueryResult> {
    const statusFormData = new FormData();
    statusFormData.append('job_id', jobId);

    while (true) {
      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      const response = await api.post('/process_query/status', statusFormData, {
        signal,
      });

      const result = response.data;

      if (result.status !== 'processing') {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
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
    const filesMetadata: FileMetadata[] = await Promise.all(
      files?.map(async (file, index) => {
        const metadata: FileMetadata = {
          name: file.name,
          type: file.type as AcceptedMimeType,
          extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
          size: file.size,
          index
        };

        // Add page count for PDF files
        if (file.type === 'application/pdf') {
          metadata.page_count = await getPDFPageCount(file);
        }

        return metadata;
      }) ?? []
    );

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
      const response = await api.post('/process_query', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
        timeout: 300000,
      });

      const initialResult = response.data;

      // If this is a standard (non-batch) process, return immediately
      if (!initialResult.job_id) {
        return initialResult;
      }

      // For batch processing, begin polling
      let lastResult: ProcessedQueryResult;
      while (true) {
        lastResult = await this.pollJobStatus(initialResult.job_id, signal);
        
        if (onProgress) {
          onProgress({
            message: lastResult.message,
            processed: lastResult.num_images_processed
          });
        }

        if (lastResult.status !== 'processing') {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
      }

      return lastResult;
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



