import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { processQuery, downloadFile, getDocumentTitles } from '@/services/python_backend'
import { createClient } from '@/utils/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, ProcessedQueryResult } from '@/types/dashboard'
import { ACCEPTED_FILE_TYPES } from '@/constants/file-types'
import { useRouter } from 'next/navigation'


const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type UserPreferences = DashboardInitialData

interface FileError {
  file: File;
  error: string;
}

interface DocumentTitleMap {
  [url: string]: string;
}

export function useDashboard(initialData?: UserPreferences) {
  const { user } = useAuth()
  const router = useRouter()
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
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<string[]>([])
  const [downloadFileType, setDownloadFileType] = useState<DownloadFileType>('csv')
  const [fileErrors, setFileErrors] = useState<FileError[]>([])
  const [outputTypeError, setOutputTypeError] = useState<string | null>(null)
  const [processedResult, setProcessedResult] = useState<ProcessedQueryResult | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [allowSheetModification, setAllowSheetModification] = useState(false)
  const [showModificationWarning, setShowModificationWarning] = useState(false)
  const [showSheetModificationWarningPreference, setShowSheetModificationWarningPreference] = useState(true)
  const [documentTitles, setDocumentTitles] = useState<DocumentTitleMap>({})

  const supabase = createClient()

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user?.id) return

      try {
        const { data: profile, error } = await supabase
          .from('user_profile')
          .select('allow_sheet_modification, show_sheet_modification_warning')
          .eq('id', user.id)
          .single()

        if (error) throw error

        console.log('[useDashboard] Fetched user preferences:', profile)
        
        setAllowSheetModification(profile.allow_sheet_modification ?? false)
        setShowSheetModificationWarningPreference(profile.show_sheet_modification_warning ?? true)
      } catch (error) {
        console.error('[useDashboard] Error fetching user preferences:', error)
      }
    }

    fetchUserPreferences()
  }, [user?.id])

  useEffect(() => {
    if (initialData) {
      console.log('[useDashboard] Initializing with data:', {
        allowSheetModification: initialData.allow_sheet_modification,
        showWarningPreference: initialData.show_sheet_modification_warning
      })
      
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

  const handleAuthError = (error: any) => {
    const errorDetail = error?.response?.data?.detail;
    if (errorDetail?.includes('Google authentication expired')) {
      router.push('/auth/setup-permissions?provider=google&reauth=true');
      return true;
    } else if (errorDetail?.includes('Microsoft authentication expired')) {
      router.push('/auth/setup-permissions?provider=microsoft&reauth=true');
      return true;
    }
    return false;
  };

  const fetchDocumentTitles = async (urlsToFetch: string[]) => {
    try {
      const titles = await getDocumentTitles(urlsToFetch);
      
      // Check for auth errors in the response
      for (const title of titles) {
        if (title.error) {
          if (title.error === "Error accessing Google Sheets. Please reconnect your Google account.") {
            router.push('/auth/setup-permissions?provider=google&reauth=true');
            return;
          } else if (title.error === "Error accessing Excel Online. Please reconnect your Microsoft account.") {
            router.push('/auth/setup-permissions?provider=microsoft&reauth=true');
            return;
          }
        }
      }

      // If no auth errors, proceed with updating titles
      const newTitleMap = titles.reduce((acc, { url, title }) => ({
        ...acc,
        [url]: title
      }), {});
      setDocumentTitles(prev => ({ ...prev, ...newTitleMap }));
    } catch (error) {
      console.error('Error fetching spreadsheet title:', error);
      if (!handleAuthError(error)) {
        setError('Failed to fetch spreadsheet title');
      }
    }
  };

  const handleUrlChange = async (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
    setUrlPermissionError(null)
    setUrlValidationError(null)

    if (index === 0 && value && !outputUrl) {
      setOutputType('online')
      setOutputUrl(value)
    }

    if (value) {
      // Validate URL format for spreadsheets only
      const isValidSpreadsheetUrl = ['spreadsheets', 'xlsx'].some(
        term => value.toLowerCase().includes(term)
      );

      if (!isValidSpreadsheetUrl) {
        setUrlValidationError('Please enter a valid URL to a Microsoft Excel or Google Sheets spreadsheet workbook')
        return
      }

      // Check permissions based on URL type
      const isGoogleUrl = value.includes('google.com') || value.includes('docs.google.com') || value.includes('sheets.google.com')
      const isMicrosoftUrl = value.includes('onedrive.live.com') || value.includes('live.com') || value.includes('sharepoint.com')

      if (isGoogleUrl && !permissions.google) {
        setUrlPermissionError('You need to connect your Google account to interact with Google Sheets')
        setShowPermissionsPrompt(true)
      } else if (isMicrosoftUrl && !permissions.microsoft) {
        setUrlPermissionError('You need to connect your Microsoft account to interact with Excel Online')
        setShowPermissionsPrompt(true)
      }

      // If URL is valid and permissions are correct, fetch the document title
      if (!urlPermissionError && !urlValidationError && /^https?:\/\/.+/.test(value)) {
        await fetchDocumentTitles([value])
      }
    }
  }

  const handleUrlFocus = async () => {
    if (user?.id) {
      // Fetch recent URLs from the database
      const { data: profile } = await supabase
        .from('user_profile')
        .select('recent_urls')
        .eq('id', user.id)
        .single()

      if (profile?.recent_urls) {
        setRecentUrls(profile.recent_urls)
        // Fetch titles for URLs that don't have them yet
        const urlsWithoutTitles = profile.recent_urls.filter((url: string) => !documentTitles[url])
        if (urlsWithoutTitles.length > 0) {
          await fetchDocumentTitles(urlsWithoutTitles)
        }
      }
    }
  }

  const addUrlField = () => {
    if (urls.length < MAX_FILES) {
      setUrls([...urls, ''])
    }
  }

  const removeUrlField = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index)
    setUrls(newUrls.length ? newUrls : ['']) // Keep at least one URL field
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOutputTypeError(null)

    console.log('[useDashboard] Submit conditions:', {
      outputType,
      allowSheetModification,
      showWarningPreference: showSheetModificationWarningPreference
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

    // Only show warning on submit if conditions are met
    if (outputType === 'online' && allowSheetModification && showSheetModificationWarningPreference) {
      console.log('[useDashboard] Setting warning to show on submit')
      setShowModificationWarning(true)
      return // Stop here and wait for user acknowledgment
    }

    // If we get here, either no warning needed or warning was acknowledged
    console.log('Proceeding with submission')
    setIsProcessing(true)

    try {
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

      // Process the query
      try {
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
            .from('error_log')
            .insert({
              user_id: user?.id,
              message: result.result.error,
              error_code: 'QUERY_PROCESSING_ERROR',
              resolved: false,
              original_query: result.result.original_query
            })
          return
        }

        // Handle download if needed
        if (outputType === 'download' && result.status === 'success' && result.files?.[0]) {
          try {
            await downloadFile(result.files[0])
          } catch (downloadError) {
            if (!handleAuthError(downloadError)) {
              console.error('Error downloading file:', downloadError)
              setError('Failed to download the result file')
              
              // Log download error
              await supabase
                .from('error_log')
                .insert({
                  user_id: user?.id,
                  message: downloadError instanceof Error ? downloadError.message : 'Download failed',
                  error_code: 'DOWNLOAD_ERROR',
                  resolved: false,
                  original_query: result.result.original_query
                })
            }
          }
        }
      } catch (queryError) {
        if (!handleAuthError(queryError)) {
          throw queryError; // Re-throw if not an auth error
        }
      }
    } catch (error) {
      console.error('Error processing query:', error)
      setError('An error occurred while processing your request')
      
      // Log error to Supabase
      if (error instanceof Error) {
        await supabase
          .from('error_log')
          .insert({
            user_id: user?.id,
            message: error.message,
            error_code: 'UNKNOWN_ERROR',
            resolved: false,
          })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const saveRecentUrls = async (urls: string[]) => {
    try {
      await supabase
        .from('user_profile')
        .upsert({ 
          id: user?.id,
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
    console.log('[useDashboard] Handling warning acknowledgment:', {
      dontShowAgain,
      currentWarningPreference: showSheetModificationWarningPreference
    })
    
    setShowModificationWarning(false)
    
    if (dontShowAgain) {
      console.log('[useDashboard] Updating warning preference in database')
      const { error } = await supabase
        .from('user_profile')
        .update({ show_sheet_modification_warning: false })
        .eq('id', user?.id)

      if (error) {
        console.error('[useDashboard] Error updating warning preference:', error)
      } else {
        console.log('[useDashboard] Successfully updated warning preference')
        setShowSheetModificationWarningPreference(false)
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

  const handleOutputUrlChange = (value: string) => {
    setOutputUrl(value)
    setOutputTypeError(null)

    if (value) {
      // Validate URL format for spreadsheets only
      const isValidSpreadsheetUrl = ['spreadsheets', 'xlsx'].some(
        term => value.toLowerCase().includes(term)
      );

      if (!isValidSpreadsheetUrl) {
        setUrlValidationError('Please enter a valid URL to a Microsoft Excel Online or Google Sheets spreadsheet workbook')
        return
      }

      // Fetch document title for the output URL
      fetchDocumentTitles([value])
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
    setOutputType,
    outputUrl,
    setOutputUrl,
    isProcessing,
    error,
    permissions,
    urlPermissionError,
    recentUrls,
    handleFileChange,
    handleUrlChange,
    handleUrlFocus,
    handleSubmit,
    downloadFileType,
    setDownloadFileType,
    fileErrors,
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
    urlValidationError,
    addUrlField,
    removeUrlField,
    documentTitles,
    handleOutputUrlChange,
  } as const
} 