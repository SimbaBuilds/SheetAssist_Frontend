import { AxiosResponse } from 'axios'
import api from './api'
import { createClient } from '@/utils/supabase/client'
import type { VisualizationInput, VisualizationOptions } from '@/hooks/useDashboard'

interface VisualizationResponse {
  status: 'success' | 'error'
  image_url?: string
  error?: string
}

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
    visualizations_this_month: (usageData.visualizations_this_month || 0) + (success ? 1 : 0),
  }

  await supabase
    .from('user_usage')
    .update(updateData)
    .eq('user_id', userId)
}

export const processDataVisualization = async (
  input: VisualizationInput,
  options: VisualizationOptions,
  signal?: AbortSignal
): Promise<VisualizationResponse> => {
  const startTime = Date.now()
  const supabase = createClient()
  const user = await supabase.auth.getUser()
  const userId = user.data.user?.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const formData = new FormData()

  // Add input data
  if (input.url) {
    formData.append('url', input.url)
    if (input.sheet_name) {
      formData.append('sheet_name', input.sheet_name)
    }
  } else if (input.file) {
    formData.append('file', input.file)
  }

  // Add visualization options
  formData.append('options', JSON.stringify(options))

  try {
    if (signal) {
      signal.addEventListener('abort', () => {
        console.log('Visualization request aborted by user')
      })
    }

    const response: AxiosResponse<VisualizationResponse> = await api.post(
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

    // Update usage statistics
    await updateVisualizationUsage(userId, response.data.status === 'success')

    // Log the visualization request
    const processingTime = Date.now() - startTime
    await supabase.from('visualization_log').insert({
      user_id: userId,
      input_type: input.url ? 'url' : 'file',
      input_name: input.url || input.file?.name,
      processing_time_ms: processingTime,
      status: response.data.status,
      success: response.data.status === 'success',
      color_palette: options.color_palette,
      has_custom_instructions: !!options.custom_instructions
    })

    return response.data

  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ERR_CANCELED') {
        console.log('Request was cancelled by user')
        const processingTime = Date.now() - startTime
        await supabase.from('visualization_log').insert({
          user_id: userId,
          input_type: input.url ? 'url' : 'file',
          input_name: input.url || input.file?.name,
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
    await supabase.from('visualization_log').insert({
      user_id: userId,
      input_type: input.url ? 'url' : 'file',
      input_name: input.url || input.file?.name,
      processing_time_ms: processingTime,
      status: error instanceof Error ? error.name : 'error',
      success: false
    })

    throw error
  }
}
