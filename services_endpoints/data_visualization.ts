import { AxiosResponse } from 'axios'
import api from './api'
import { createClient } from '@/utils/supabase/client'
import { AcceptedMimeType } from '@/constants/file-types'
import { 
  VisualizationOptions, 
  VisualizationResult, 
  FileMetadata,
  VisualizationRequest,
  InputUrl,
} from '@/types/dashboard'

// Helper function to update user visualization usage statistics
async function updateVisualizationUsage(userId: string, success: boolean) {
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

  const updateData = {
    visualizations_this_month: (usageData?.visualizations_this_month || 0) + (success ? 1 : 0),
  }

  await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId)
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
    await updateVisualizationUsage(userId, response.data.status === 'success')

    // Log the visualization request in request_log instead of visualization_log
    const processingTime = Date.now() - startTime
    await supabase.from('request_log').insert({
      user_id: userId,
      query: `visualization_${options.chart_type}`, // Add chart type to query for better tracking
      doc_names: webUrls.map(url => url.url),
      file_names: files?.map(f => f.name) || [],
      processing_time_ms: processingTime,
      status: response.data.status,
      success: response.data.status === 'success'
    })

    return response.data

  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ERR_CANCELED') {
        console.log('Request was cancelled by user')
        const processingTime = Date.now() - startTime
        await supabase.from('request_log').insert({
          user_id: userId,
          query: `visualization_cancelled`,
          doc_names: webUrls.map(url => url.url),
          file_names: files?.map(f => f.name) || [],
          processing_time_ms: processingTime,
          status: 'cancelled',
          success: false
        })
        throw new Error('AbortError')
      }
    }

    console.error('Error processing visualization:', error)
    
    // Update usage statistics for failed request
    await updateVisualizationUsage(userId, false)
    // Log failed request
    const processingTime = Date.now() - startTime
    await supabase.from('request_log').insert({
      user_id: userId,
      query: `visualization_error`, // Updated to be more specific
      doc_names: webUrls.map(url => url.url),
      file_names: files?.map(f => f.name) || [],
      processing_time_ms: processingTime,
      status: error instanceof Error ? error.name : 'error',
      success: false
    })

    throw error
  }
}
