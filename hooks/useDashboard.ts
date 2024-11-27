import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { processQuery, downloadFile } from '@/services/python_backend'
import { createClient } from '@/utils/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, ProcessedQueryResult } from '@/types/dashboard'
import { ACCEPTED_FILE_TYPES } from '@/constants/file-types'


const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type UserPreferences = DashboardInitialData

interface FileError {
  file: File;
  error: string;
}


export function useDashboard(initialData?: UserPreferences) {
  const { user } = useAuth()
  const [showPermissionsPrompt, setShowPermissionsPrompt] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([''])
  const [query, setQuery] = useState('')
  const [outputType, setOutputType] = useState<'download' | 'online' | null>(null)
  const [outputUrl, setOutputUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState({
    google: false,
    microsoft: false
  })
  const [urlPermissionError, setUrlPermissionError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<string[]>([])
  const [downloadFileType, setDownloadFileType] = useState<DownloadFileType>('csv')
  const [fileErrors, setFileErrors] = useState<FileError[]>([])
  const [outputTypeError, setOutputTypeError] = useState<string | null>(null)
  const [processedResult, setProcessedResult] = useState<ProcessedQueryResult | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [allowSheetModification, setAllowSheetModification] = useState(
    initialData?.allow_sheet_modification ?? false
  )
  const [showModificationWarning, setShowModificationWarning] = useState(false)

  const supabase = createClient()

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
      // Set the warning state based on the user's preferences
      if (initialData.show_sheet_modification_warning !== false && 
          initialData.allow_sheet_modification) {
        setShowModificationWarning(true)
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

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    }

    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
    const fileMimeType = file.type.toLowerCase()

    // Find matching file type definition
    const matchingType = [...ACCEPTED_FILE_TYPES.documents, ...ACCEPTED_FILE_TYPES.images]
      .find(type => type.extension === fileExtension || type.mimeType === fileMimeType)

    if (!matchingType) {
      return `File type ${fileExtension} (${fileMimeType}) is not supported`
    }

    // Ensure we're using the correct MIME type from our definitions
    if (file.type !== matchingType.mimeType) {
      console.warn(`File ${file.name} has type ${file.type} but expected ${matchingType.mimeType}`)
    }

    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newErrors: FileError[] = []
    const validFiles: File[] = []

    // Check total files limit
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    // Validate each file
    selectedFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        newErrors.push({ file, error })
      } else {
        validFiles.push(file)
      }
    })

    setFileErrors(newErrors)
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      setError('')
    }
  }

  const handleUrlChange = async (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
    setUrlPermissionError(null)

    if (index === 0 && value && !outputUrl) {
      setOutputType('online')
      setOutputUrl(value)
    }

    if (value && allowSheetModification && !initialData?.show_sheet_modification_warning) {
      setShowModificationWarning(true)
    }

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
    setError('')
    setOutputTypeError(null)

    // Debug logs
    console.log('Submit conditions:', {
      outputType,
      allowSheetModification,
      showWarningPreference: initialData?.show_sheet_modification_warning,
      showModificationWarning
    })

    // Validate output preferences
    if (!outputType) {
      setOutputTypeError('Please select an output preference')
      return
    }

    if (outputType === 'download' && !downloadFileType) {
      setOutputTypeError('Please select a file type')
      return
    }

    if (outputType === 'online' && !outputUrl.trim()) {
      setOutputTypeError('Please enter a destination URL')
      return
    }

    // Modified warning check
    if (outputType === 'online' && allowSheetModification) {
      console.log('Checking warning condition:', {
        shouldShow: initialData?.show_sheet_modification_warning !== false
      })
      
      if (initialData?.show_sheet_modification_warning !== false) {
        console.log('Setting warning to show')
        setShowModificationWarning(true)
        return // Stop here and wait for user acknowledgment
      }
    }

    // If we get here, either no warning needed or warning was acknowledged
    console.log('Proceeding with submission')
    setIsProcessing(true)

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
      const outputPreferences: OutputPreferences = {
        type: outputType ?? 'download',
        ...(outputType === 'online' && { 
          destination_url: outputUrl,
          modify_existing: allowSheetModification 
        }),
        ...(outputType === 'download' && { format: downloadFileType })
      }

      // First, process the query
      const result = await processQuery(
        query,
        validUrls,
        files,
        outputPreferences
      )

      // Store the result and show dialog
      setProcessedResult(result)
      setShowResultDialog(true)

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

      // If download type and successful, trigger download
      if (outputType === 'download' && result.status === 'success' && result.files?.[0]) {
        try {
          await downloadFile(result.files[0])
        } catch (downloadError) {
          console.error('Error downloading file:', downloadError)
          setError('Failed to download the result file')
          
          // Log download error
          await supabase
            .from('error_messages')
            .insert({
              user_id: user?.id,
              message: downloadError instanceof Error ? downloadError.message : 'Download failed',
              error_code: 'DOWNLOAD_ERROR',
              resolved: false
            })
        }
      }

    } catch (error) {
      console.error('Error processing query:', error)
      setError('An error occurred while processing your request')
      
      // Log error to Supabase
      if (error instanceof Error) {
        await supabase
          .from('error_messages')
          .insert({
            user_id: user?.id,
            message: error.message,
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

  const handleOutputTypeChange = (value: 'download' | 'online' | null) => {
    setOutputType(value)
    // Clear output URL when switching to download
    if (value === 'download') {
      setOutputUrl('')
    }
  }

  const handleWarningAcknowledgment = async (dontShowAgain: boolean) => {
    setShowModificationWarning(false)
    
    if (dontShowAgain) {
      const { error } = await supabase
        .from('user_profile')
        .update({ show_sheet_modification_warning: false })
        .eq('id', user?.id)

      if (error) {
        console.error('Error updating warning preference:', error)
      }
    }
  }

  const continueSubmitAfterWarning = async () => {
    setShowModificationWarning(false)
    setIsProcessing(true)

    try {
      // Copy the processing logic from handleSubmit here
      // ... processing logic ...
    } catch (error) {
      // ... error handling ...
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    showPermissionsPrompt,
    setShowPermissionsPrompt,
    files,
    setFiles,
    urls,
    query,
    setQuery,
    outputType,
    setOutputType: handleOutputTypeChange,
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
    downloadFileType,
    setDownloadFileType,
    fileErrors,
    validateFile,
    outputTypeError,
    setOutputTypeError,
    processedResult,
    showResultDialog,
    setShowResultDialog,
    allowSheetModification,
    setAllowSheetModification,
    showModificationWarning,
    setShowModificationWarning,
    handleWarningAcknowledgment,
    continueSubmitAfterWarning,
  }
} 