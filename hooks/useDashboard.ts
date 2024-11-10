import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { processQuery } from '@/services/python_backend'
import axios from 'axios'
import { createBrowserClient } from '@supabase/ssr'


const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type UserPreferences = {
  output_type?: 'download' | 'online'
  last_query?: string
  recent_urls?: string[]
  // Add other preference fields as needed
}

export function useDashboard(initialData?: UserPreferences) {
  const { user } = useAuth()
  const [showPermissionsPrompt, setShowPermissionsPrompt] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([''])
  const [query, setQuery] = useState('')
  const [outputType, setOutputType] = useState<'download' | 'online'>('download')
  const [outputUrl, setOutputUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState({
    google: false,
    microsoft: false
  })
  const [urlPermissionError, setUrlPermissionError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<string[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (initialData) {
      // Set any saved preferences from the database
      if (initialData.output_type) {
        setOutputType(initialData.output_type)
      }
      if (initialData.last_query) {
        setQuery(initialData.last_query)
      }
      if (initialData.recent_urls) {
        setRecentUrls(initialData.recent_urls)
      }
      // Add any other state initialization based on your needs
    }
  }, [initialData])

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profile')
          .select('google_permissions_set, microsoft_permissions_set, permissions_setup_completed')
          .eq('id', user?.id)
          .single()

        if (profileError) throw profileError

        setPermissions({
          google: !!profile?.google_permissions_set,
          microsoft: !!profile?.microsoft_permissions_set
        })

        if (!profile?.permissions_setup_completed) {
          setShowPermissionsPrompt(true)
        }
      } catch (error) {
        console.error('Error checking permissions:', error)
      }
    }

    if (user) {
      checkPermissions()
    }
  }, [user])



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    const invalidFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE)
    if (invalidFiles.length > 0) {
      setError(`Some files exceed the ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
      return
    }

    setFiles(prev => [...prev, ...selectedFiles])
    setError('')
  }

  const handleUrlChange = async (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
    setUrlPermissionError(null)

    if (value) {
      const isGoogleUrl = value.includes('google.com') || value.includes('docs.google.com') || value.includes('sheets.google.com')
      const isMicrosoftUrl = value.includes('office.com') || value.includes('live.com') || value.includes('sharepoint.com')

      if (isGoogleUrl && !permissions.google) {
        setUrlPermissionError('You need to connect your Google account to use Google URLs')
        setShowPermissionsPrompt(true)
      } else if (isMicrosoftUrl && !permissions.microsoft) {
        setUrlPermissionError('You need to connect your Microsoft account to use Microsoft URLs')
        setShowPermissionsPrompt(true)
      }
    }

    if (index === urls.length - 1 && value && urls.length < MAX_FILES) {
      setUrls([...newUrls, ''])
    }

    if (value && /^https?:\/\/.+/.test(value)) {
      const newRecentUrls = [value, ...recentUrls.filter(url => url !== value)].slice(0, 5)
      setRecentUrls(newRecentUrls)
      
      // Update in database
      const { error } = await supabase
        .from('user_usage')
        .update({ recent_urls: newRecentUrls })
        .eq('id', user?.id)

      if (error) {
        await supabase
          .from('error_messages')
          .insert({
            user_id: user?.id,
            message: 'Failed to update recent URLs',
            error_code: error.code,
            resolved: false
          })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError('')

    try {
      // Update user usage stats
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (!usageError) {
        await supabase
          .from('user_usage')
          .update({
            recent_queries: [query, ...(usageData.recent_queries || [])].slice(0, 10),
            requests_this_week: usageData.requests_this_week + 1,
            requests_this_month: usageData.requests_this_month + 1
          })
          .eq('id', user?.id)
      }

      const validUrls = urls.filter(url => url)
      
      // Create output preferences object
      const outputPreferences = {
        type: outputType,
        destination_url: outputType === 'online' ? outputUrl : undefined
      }

      // Remove the output type from the query string since it's now in the preferences
      const result = await processQuery(
        query,
        validUrls,
        files,
        outputPreferences
      )

      if (result.result.error) {
        setError(result.result.error)
        // Log error
        await supabase
          .from('error_messages')
          .insert({
            user_id: user?.id,
            message: result.result.error,
            error_code: 'QUERY_PROCESSING_ERROR',
            resolved: false
          })
        return
      }

      if (outputType === 'download') {
        if (typeof result.result.return_value === 'string' && result.result.return_value.startsWith('http')) {
          window.location.href = result.result.return_value
        } else {
          const blob = new Blob([result.result.return_value], { type: 'application/octet-stream' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'processed_result.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else if (outputType === 'online') {
        const isGoogleUrl = outputUrl.includes('google.com') || outputUrl.includes('docs.google.com') || outputUrl.includes('sheets.google.com')
        const isMicrosoftUrl = outputUrl.includes('office.com') || outputUrl.includes('live.com') || outputUrl.includes('sharepoint.com')
        
        try {
            if (isGoogleUrl) {
                if (outputUrl.includes('docs.google.com')) {
                    // Handle Google Docs text append
                    await axios.post('/api/google/docs/append', {
                        documentId: extractGoogleDocId(outputUrl),
                        content: result.result.return_value
                    });
                } else if (outputUrl.includes('sheets.google.com')) {
                    // Handle Google Sheets DataFrame append
                    await axios.post('/api/google/sheets/append', {
                        spreadsheetId: extractGoogleSheetId(outputUrl),
                        data: result.result.return_value
                    });
                }
            } else if (isMicrosoftUrl) {
                if (outputUrl.includes('word')) {
                    // Handle Microsoft Word text append
                    await axios.post('/api/microsoft/word/append', {
                        documentId: extractMicrosoftDocId(outputUrl),
                        content: result.result.return_value
                    });
                } else if (outputUrl.includes('excel')) {
                    // Handle Microsoft Excel DataFrame append
                    await axios.post('/api/microsoft/excel/append', {
                        workbookId: extractMicrosoftWorkbookId(outputUrl),
                        data: result.result.return_value
                    });
                }
            } else {
                throw new Error('Unsupported document URL');
            }
            
            alert('Document updated successfully!');
        } catch (error) {
            console.error('Error updating document:', error);
            setError('Failed to update the document. Please check the URL and try again.');
            
            // Log error to Supabase
            await supabase
                .from('error_messages')
                .insert({
                    user_id: user?.id,
                    message: error instanceof Error ? error.message : 'Document update failed',
                    error_code: 'DOCUMENT_UPDATE_ERROR',
                    resolved: false
                });
        }
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) {
          setError('Files are too large. Please reduce file sizes and try again.')
        } else if (error.response?.status === 401) {
          setError('Authentication error. Please log in again.')
        } else if (error.response?.data?.message) {
          setError(error.response.data.message)
        } else {
          setError('An error occurred while processing your request')
        }
      } else {
        setError('An unexpected error occurred')
      }
      console.error(error)
      // Log error
      if (error instanceof Error) {
        await supabase
          .from('error_messages')
          .insert({
            user_id: user?.id,
            message: error.message,
            error_code: 'UNKNOWN_ERROR',
            resolved: false
          })
      } else {
        await supabase
          .from('error_messages')
          .insert({
            user_id: user?.id,
            message: 'An unknown error occurred',
            error_code: 'UNKNOWN_ERROR',
            resolved: false
          })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const saveRecentUrls = async (urls: string[]) => {
    try {
      await supabase
        .from('user_usage')
        .upsert({ 
          user_id: user?.id,
          recent_urls: urls
        })
    } catch (error) {
      console.error('Error saving recent URLs:', error)
    }
  }

  useEffect(() => {
    if (recentUrls.length > 0) {
      saveRecentUrls(recentUrls)
    }
  }, [recentUrls])

  return {
    showPermissionsPrompt,
    setShowPermissionsPrompt,
    files,
    setFiles,
    urls,
    query,
    setQuery,
    outputType,
    setOutputType,
    outputUrl,
    setOutputUrl,
    isProcessing,
    error,
    permissions,
    urlPermissionError,
    handleFileChange,
    handleUrlChange,
    handleSubmit,
    recentUrls,
  }
} 

// Helper functions to extract document IDs
function extractGoogleDocId(url: string): string {
    const match = url.match(/\/d\/([-\w]+)/);
    return match ? match[1] : '';
}

function extractGoogleSheetId(url: string): string {
    const match = url.match(/\/d\/([-\w]+)/);
    return match ? match[1] : '';
}

function extractMicrosoftDocId(url: string): string {
    // Extract document ID from Microsoft URL format
    const match = url.match(/[\w\-]+\?.*$/);
    return match ? match[0].split('?')[0] : '';
}

function extractMicrosoftWorkbookId(url: string): string {
    // Extract workbook ID from Microsoft URL format
    const match = url.match(/[\w\-]+\?.*$/);
    return match ? match[0].split('?')[0] : '';
}