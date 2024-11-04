import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/auth'
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
  const { user, initiateGoogleLogin, initiateMicrosoftAuth } = useAuth()
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
      const hasGoogleAuth = user?.app_metadata?.provider === 'google' || 
                           user?.app_metadata?.providers?.includes('google')
      const hasMicrosoftAuth = user?.app_metadata?.provider === 'azure' || 
                              user?.app_metadata?.providers?.includes('azure')

      setPermissions({
        google: !!hasGoogleAuth,
        microsoft: !!hasMicrosoftAuth
      })

      if (!hasGoogleAuth && !hasMicrosoftAuth) {
        setShowPermissionsPrompt(true)
      }
    }

    checkPermissions()
  }, [user])

  const handleGoogleSetup = async () => {
    try {
      const googleAuthUrl = await initiateGoogleLogin()
      if (googleAuthUrl) {
        window.location.href = googleAuthUrl
      } else {
        throw new Error('Failed to initiate Google authentication')
      }
    } catch (error) {
      console.error('Error setting up Google permissions:', error)
      alert('Error setting up Google permissions. Please try again.')
    }
  }

  const handleMicrosoftSetup = async () => {
    try {
      const microsoftAuthUrl = await initiateMicrosoftAuth()
      if (microsoftAuthUrl) {
        window.location.href = microsoftAuthUrl
      } else {
        throw new Error('Failed to initiate Microsoft authentication')
      }
    } catch (error) {
      console.error('Error setting up Microsoft permissions:', error)
      alert('Error setting up Microsoft permissions. Please try again.')
    }
  }

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
      const enhancedQuery = `${query} ${outputType === 'online' ? 
        `and save the result to this document: ${outputUrl}` : 
        'and provide the result as a downloadable file'}`
      
      const result = await processQuery(enhancedQuery, validUrls, files)

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
        if (result.result.return_value?.url) {
          window.open(result.result.return_value.url, '_blank');
        }
        alert('Document updated successfully! ' + (result.message || ''));
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
    handleGoogleSetup,
    handleMicrosoftSetup,
    handleFileChange,
    handleUrlChange,
    handleSubmit,
    recentUrls,
  }
} 