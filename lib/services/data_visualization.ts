import { AxiosResponse } from 'axios'
import api from './api'
import { createClient } from '@/lib/supabase/client'
import { AcceptedMimeType } from '@/lib/constants/file-types'
import { 
  VisualizationOptions, 
  VisualizationResult, 
  FileMetadata,
  VisualizationRequest,
  InputUrl,
} from '@/lib/types/dashboard'
import { isUserOnProPlan, getUserSubscriptionId, trackUsage } from '@/lib/stripe/usage'
import { VIS_GEN_LIMITS } from '@/lib/constants/pricing'
import { logRequest } from '@/lib/services/loggers/request-logger'
import { logError } from '@/lib/services/loggers/error-logger'

// Helper function to update user visualization usage statistics
async function updateVisualizationUsage(userId: string, success: boolean) {
  console.log('🔍 [data_visualization] Starting updateVisualizationUsage:', { userId, success });
  const supabase = createClient()
  
  const { data: usageData, error: usageError } = await supabase
    .from('user_usage')
    .select('visualizations_this_month')
    .eq('user_id', userId)
    .single()

  if (usageError) {
    console.error('Error fetching visualization usage:', usageError)
    return
  }

  const newCount = (usageData?.visualizations_this_month || 0) + (success ? 1 : 0)
  console.log('🔍 [data_visualization] Current usage count:', { newCount, currentCount: usageData?.visualizations_this_month });
  
  const updateData = {
    visualizations_this_month: newCount,
  }

  await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId)

  // Check if pro user and handle overage
  if (success) {
    const isProUser = await isUserOnProPlan(userId)
    if (isProUser && newCount > VIS_GEN_LIMITS.pro) {
      const subscriptionId = await getUserSubscriptionId(userId)
      if (subscriptionId) {
        console.log(`[data_visualization] Tracking visualization usage overage for user ${userId}. Count: ${newCount}`);
        try {
          await trackUsage({
            subscriptionId,
            type: 'visualizations',
            quantity: newCount,
            userId
          });
          console.log(`[data_visualization] Successfully tracked visualization usage for user ${userId}`);
        } catch (error) {
          console.error(`[data_visualization] Failed to track visualization usage for user ${userId}:`, error);
        }
      }
    }
  }
}

export const processDataVisualization = async (
  options: VisualizationOptions,
  webUrls: InputUrl[] = [],
  files?: File[],
  signal?: AbortSignal
): Promise<VisualizationResult> => {
  const startTime = Date.now()
  const supabase = createClient()
  const user = await supabase.auth.getUser()
  const userId = user.data.user?.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const formData = new FormData()

  // Create files metadata array with index only if files exist
  const filesMetadata: FileMetadata[] = files?.map((file, index) => ({
    name: file.name,
    type: file.type as AcceptedMimeType,
    extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
    size: file.size,
    index
  })) ?? []

  // Part 1: JSON payload with metadata
  const jsonData: VisualizationRequest = {
    input_urls: webUrls,
    files_metadata: filesMetadata,
    options
  }
  formData.append('json_data', JSON.stringify(jsonData))

  // Part 2: Append files only if they exist
  if (files?.length) {
    files.forEach((file) => {
      formData.append('files', file)
    })
  }

  try {
    if (signal) {
      signal.addEventListener('abort', () => {
        console.log('Visualization request aborted by user')
      })
    }

    const response: AxiosResponse<VisualizationResult> = await api.post(
      '/visualize_data',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...(signal && { signal }),
        timeout: 300000, // 5 minutes
      }
    )

    // Add data URI prefix if not present
    if (response.data.image_data && !response.data.image_data.startsWith('data:image/')) {
      response.data.image_data = `data:image/png;base64,${response.data.image_data}`
    }

    // Update usage statistics
    await updateVisualizationUsage(userId, response.data.success)

    // Log the successful visualization request
    await logRequest({
      userId,
      query: `visualization_${options.chart_type}`,
      fileMetadata: filesMetadata,
      inputUrls: webUrls,
      startTime,
      status: 'completed',
      success: response.data.success,
      errorMessage: response.data.message,
      requestType: 'visualization'
    })

    return response.data

  } catch (error) {
    // Handle canceled requests first
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ERR_CANCELED') {
        // Log canceled request
        await logRequest({
          userId,
          query: `visualization_${options.chart_type}`,
          fileMetadata: filesMetadata,
          inputUrls: webUrls,
          startTime,
          status: 'canceled',
          success: false,
          requestType: 'visualization'
        });

        return {
          success: false,
          error: 'Request was cancelled by user',
          message: 'Request was cancelled by user'
        };
      }
    }

    console.error('Error processing visualization:', error);
    
    // Update usage statistics for failed request
    await updateVisualizationUsage(userId, false);

    // Enhanced error handling to capture backend error messages
    let errorMessage = 'Unknown error occurred';
    
    if (error && typeof error === 'object' && 'response' in error) {
      // Log the full response for debugging
      const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
      console.log('Backend Error Response:', axiosError.response?.data);
      
      // Extract error from response data
      const responseData = axiosError.response?.data;
      errorMessage = responseData?.error || responseData?.message || errorMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Log errors
    await Promise.all([
      logError({
        userId,
        originalQuery: `visualization_${options.chart_type}`,
        fileNames: files?.map(f => f.name),
        docNames: webUrls.map(url => url.url),
        message: errorMessage,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        requestType: 'visualization',
        errorMessage: error instanceof Error ? error.stack : undefined,
        startTime
      }),
      logRequest({
        userId,
        query: `visualization_${options.chart_type}`,
        fileMetadata: filesMetadata,
        inputUrls: webUrls,
        startTime,
        status: error instanceof Error ? error.name : 'UNKNOWN',
        success: false,
        errorMessage,
        requestType: 'visualization'
      })
    ]);

    return {
      success: false,
      error: errorMessage,
      message: errorMessage
    };
  }
}
