import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { processQuery, downloadFile, getDocumentTitle } from '@/services/python_backend'
import { createClient } from '@/utils/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, ProcessedQueryResult, SheetTitleKey, InputUrl, OnlineSheet } from '@/types/dashboard'
import { ACCEPTED_FILE_TYPES } from '@/constants/file-types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { useFilePicker } from '@/hooks/useFilePicker'

const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type UserPreferences = DashboardInitialData

interface FileError {
  file: File;
  error: string;
}

interface DocumentTitleMap {
  [key: string]: string;  // key will be JSON.stringify(SheetTitleKey)
}

export const formatTitleKey = (url: string, sheet_name: string): string => {
  if (!sheet_name) {
    console.warn('Attempted to create title key without sheet name:', { url });
    return '';
  }
  return JSON.stringify({ url, sheet_name } as SheetTitleKey);
};

export const formatDisplayTitle = (doc_name: string, sheet_name?: string): string => {
  if (sheet_name) {
    return `${doc_name} - ${sheet_name}`;
  }
  return doc_name;
}

const getUrlProvider = (url: string): 'google' | 'microsoft' | null => {
  if (url.includes('google.com') || url.includes('docs.google.com') || url.includes('sheets.google.com')) {
    return 'google';
  }
  if (url.includes('onedrive.live.com') || url.includes('live.com') || url.includes('sharepoint.com')) {
    return 'microsoft';
  }
  return null;
};

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
  const [permissions, setPermissions] = useState<{
    google: boolean | null;
    microsoft: boolean | null;
  }>({
    google: null,
    microsoft: null
  })
  const [urlPermissionError, setUrlPermissionError] = useState<string | null>(null)
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<OnlineSheet[]>([])
  const [downloadFileType, setDownloadFileType] = useState<DownloadFileType>('csv')
  const [fileErrors, setFileErrors] = useState<FileError[]>([])
  const [outputTypeError, setOutputTypeError] = useState<string | null>(null)
  const [processedResult, setProcessedResult] = useState<ProcessedQueryResult | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [allowSheetModification, setAllowSheetModification] = useState(false)
  const [showModificationWarning, setShowModificationWarning] = useState(false)
  const [showSheetModificationWarningPreference, setShowSheetModificationWarningPreference] = useState(true)
  const [documentTitles, setDocumentTitles] = useState<DocumentTitleMap>({})
  const [availableSheets, setAvailableSheets] = useState<{ [url: string]: string[] }>({})
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const [destinationUrlError, setDestinationUrlError] = useState<string | null>(null)
  const [isLoadingTitles, setIsLoadingTitles] = useState(true)
  const [workbookCache, setWorkbookCache] = useState<{ [url: string]: { doc_name: string, sheet_names: string[] } }>({})
  const [isRetrievingData, setIsRetrievingData] = useState(false)
  const [selectedUrlPairs, setSelectedUrlPairs] = useState<InputUrl[]>([])
  const [selectedOutputSheet, setSelectedOutputSheet] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const { verifyFileAccess, storeFilePermission, launchPicker } = useFilePicker()

  const supabase = createClient()

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingTitles(true);
        const [{ data: profile }, { data: usage }] = await Promise.all([
          supabase
            .from('user_profile')
            .select('allow_sheet_modification, show_sheet_modification_warning')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_usage')
            .select('recent_sheets')
            .eq('user_id', user.id)
            .single()
        ]);

        if (profile) {
          console.log('[useDashboard] Fetched user preferences:', profile);
          setAllowSheetModification(profile.allow_sheet_modification ?? false);
          setShowSheetModificationWarningPreference(profile.show_sheet_modification_warning ?? true);
        }

        if (usage?.recent_sheets?.length) {
          console.log('[useDashboard] Fetched recent sheets:', usage.recent_sheets);
          setRecentUrls(usage.recent_sheets);
          
          // Create document titles mapping from recent sheets data
          const titleMap: DocumentTitleMap = {};
          usage.recent_sheets.forEach((sheet: OnlineSheet) => {
            if (sheet.url && sheet.doc_name && sheet.sheet_name) {
              const titleKey = formatTitleKey(sheet.url, sheet.sheet_name);
              const displayTitle = formatDisplayTitle(sheet.doc_name, sheet.sheet_name);
              titleMap[titleKey] = displayTitle;
            }
          });

          console.log('[useDashboard] Setting document titles:', titleMap);
          setDocumentTitles(titleMap);
        }
      } catch (error) {
        console.error('[useDashboard] Error fetching user data:', error);
      } finally {
        setIsLoadingTitles(false);
      }
    };

    fetchUserPreferences();
  }, [user?.id]);

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
      if (initialData.recent_sheets) {
        setRecentUrls(initialData.recent_sheets);
      }
    }
  }, [initialData])

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Get user profile and access tokens
        const [{ data: profile }, { data: accessTokens }] = await Promise.all([
          supabase
            .from('user_profile')
            .select('google_permissions_set, microsoft_permissions_set')
            .eq('id', user?.id)
            .single(),
          supabase
            .from('user_documents_access')
            .select('provider, expires_at')
            .eq('user_id', user?.id)
        ]);

        if (!profile) throw new Error('No profile found');

        // Initialize permissions from profile
        const updatedPermissions = {
          google: Boolean(profile.google_permissions_set),
          microsoft: Boolean(profile.microsoft_permissions_set)
        };

        // Check for expired tokens
        const now = new Date().toISOString();
        const expiredProviders = accessTokens?.filter(token => token.expires_at < now).map(token => token.provider) || [];

        // If we found expired tokens, update the permissions in the database and state
        if (expiredProviders.length > 0) {
          console.log('[useDashboard] Found expired tokens for providers:', expiredProviders);

          // Create update object for user_profile
          const updateData: { [key: string]: boolean } = {};
          expiredProviders.forEach(provider => {
            updateData[`${provider}_permissions_set`] = false;
            updatedPermissions[provider as keyof typeof updatedPermissions] = false;
          });

          // Update the database
          const { error: updateError } = await supabase
            .from('user_profile')
            .update(updateData)
            .eq('id', user?.id);

          if (updateError) {
            console.error('[useDashboard] Error updating permissions:', updateError);
          }
        }

        // Update permissions state
        setPermissions(updatedPermissions);

        // // Show permissions prompt if setup not completed or if any tokens are expired
        // if (expiredProviders.length > 0) {
        //   setShowPermissionsPrompt(true);
        // }

      } catch (error) {
        console.error('[useDashboard] Error checking permissions:', error);
      }
    };

    if (user) {
      checkPermissions();
    }
  }, [user]);

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

  const handleAuthError = (error: unknown): boolean => {
    if (error && typeof error === 'object' && 'response' in error) {
      const errorDetail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      if (errorDetail?.includes('Google authentication expired')) {
        router.push('/auth/setup-permissions?provider=google&reauth=true');
        return true;
      } else if (errorDetail?.includes('Microsoft authentication expired')) {
        router.push('/auth/setup-permissions?provider=microsoft&reauth=true');
        return true;
      }
    }
    return false;
  };

  const fetchDocumentTitles = async (url: string) => {
    try {
      const workbook = await getDocumentTitle(url);
      
      // Update documentTitles state with new mappings
      const newDocumentTitles = { ...documentTitles };
      
      if (workbook.success && workbook.doc_name) {
        if (workbook.sheet_names?.length) {
          // For URLs with multiple sheets (Microsoft or Google)
          workbook.sheet_names.forEach((sheetName: string) => {
            const titleKey = formatTitleKey(workbook.url, sheetName);
            const displayTitle = formatDisplayTitle(workbook.doc_name, sheetName);
            newDocumentTitles[titleKey] = displayTitle;
          });

          // Update available sheets
          setAvailableSheets(prev => ({
            ...prev,
            [workbook.url]: [...workbook?.sheet_names ?? []]
          }));

          console.log('Document Titles Mapping Updated:', {
            url,
            currentMapping: newDocumentTitles,
            addedSheets: workbook.sheet_names
          });
        } else {
          // For URLs with a single sheet or no sheet specified
          // Don't create a mapping until we have a sheet name
          setAvailableSheets(prev => ({
            ...prev,
            [workbook.url]: []
          }));
        }
      } else if (workbook.error) {
        // Handle specific error cases
        if (workbook.error.includes('authentication')) {
          throw new Error('Authentication failed. Please check your permissions.');
        } else if (workbook.error.includes('not found')) {
          throw new Error('Document not found. Please check the URL.');
        } else {
          throw new Error(workbook.error);
        }
      }

      setDocumentTitles(newDocumentTitles);
      return workbook;
    } catch (error) {
      console.error('Error fetching document titles:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch document title');
      return null;
    }
  };

  const updateRecentUrls = async (newUrl: string, sheetName: string, docName: string) => {
    if (!user?.id || !newUrl.trim() || !sheetName.trim() || !docName.trim()) {
      console.error('Missing required data for updateRecentUrls:', { newUrl, sheetName, docName });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('recent_sheets')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      let updatedUrls = data?.recent_sheets || [];
      
      // Remove any existing entries for this URL and sheet combination
      updatedUrls = updatedUrls.filter((sheet: OnlineSheet) => 
        !(sheet.url === newUrl && sheet.sheet_name === sheetName)
      );
      
      // Create new sheet entry with explicit sheet name
      const newSheet: OnlineSheet = {
        url: newUrl,
        doc_name: docName,
        sheet_name: sheetName
      };
      
      // Add to the beginning of the list
      updatedUrls = [newSheet, ...updatedUrls].slice(0, 6);

      // Update database
      const { error: updateError } = await supabase
        .from('user_usage')
        .upsert({ 
          user_id: user.id,
          recent_sheets: updatedUrls
        });

      if (updateError) throw updateError;

      // Update local state with new URLs
      setRecentUrls(updatedUrls);

    } catch (error) {
      console.error('Error updating recent URLs:', error);
      setError('Failed to update recent URLs');
    }
  };

  const validateUrl = async (value: string, isDestination = false): Promise<boolean> => {
    const setError = isDestination ? setDestinationUrlError : setUrlValidationError;
    setError(null);

    if (!value) {
      setError('Please enter a URL');
      return false;
    }

    // Basic URL validation
    try {
      new URL(value);
    } catch {
      setError('Please enter a valid URL starting with http:// or https://');
      return false;
    }

    // Check provider and permissions
    const provider = getUrlProvider(value);
    if (!provider) {
      setError('Please enter a valid Google Sheets or Microsoft Excel Online URL');
      return false;
    }

    // Early permissions check
    if (!permissions[provider]) {
      setError(`Please set up ${provider === 'google' ? 'Google' : 'Microsoft'} permissions in your account settings`);
      return false;
    }

    // Only proceed with document title fetching if we have permissions
    const workbook = await fetchDocumentTitles(value);
    if (!workbook?.success) {
      setError('Unable to access the document. Please check the URL and your permissions.');
      return false;
    }

    return true;
  };

  const handleUrlChange = async (index: number, value: string, fromDropdown = false) => {
    setUrlPermissionError(null);
    setUrlValidationError(null);

    // Update the URLs array at the specified index
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    if (value) {
      // If selection is from dropdown, use existing logic
      if (fromDropdown) {
        const titleKey = value;  // value is the title key when from dropdown
        if (documentTitles[titleKey]) {
          try {
            const { url, sheet_name } = JSON.parse(titleKey);
            const newPair: InputUrl = { url, sheet_name };
            setSelectedUrlPairs(prev => [...prev, newPair]);
            setUrls(['']);
            return;
          } catch (error) {
            console.error('Error parsing title key:', error);
          }
        }
      }

      // Early permissions check
      const provider = getUrlProvider(value);
      if (provider && !permissions[provider]) {
        setUrlValidationError(`Please set up ${provider === 'google' ? 'Google' : 'Microsoft'} permissions in your account settings`);
        return;
      }

      setIsRetrievingData(true);
      try {
        // Only proceed with file picker and title fetching if we have permissions
        if (provider && permissions[provider]) {
          // Verify file access
          const { hasPermission, fileInfo, error } = await verifyFileAccess(value);
          
          if (!fileInfo) {
            setUrlValidationError('Invalid URL format');
            return;
          }

          if (!hasPermission) {
            // Launch the file picker when permission is not found
            const pickerResult = await launchPicker(fileInfo.provider);
            
            if (!pickerResult.success) {
              setUrlPermissionError(pickerResult.error || 'Failed to get file permission');
              return;
            }
            
            // If picker was successful, continue with URL validation
            if (pickerResult.url) {
              value = pickerResult.url; // Use the URL from the picker
            }
          }

          // Continue with existing URL validation and processing
          if (!(await validateUrl(value))) {
            return;
          }

          // Fetch document title and handle sheet selection
          const workbook = await fetchDocumentTitles(value);
          if (workbook?.success) {
            const sheetNames = workbook.sheet_names ?? [];
            
            setWorkbookCache(prev => ({
              ...prev,
              [value]: {
                doc_name: workbook.doc_name,
                sheet_names: sheetNames
              }
            }));
            
            if (sheetNames.length === 1) {
              const newPair: InputUrl = { url: value, sheet_name: sheetNames[0] };
              setSelectedUrlPairs(prev => [...prev, newPair]);
              setUrls(['']);
              await updateRecentUrls(value, sheetNames[0], workbook.doc_name);
            } else if (sheetNames.length > 1) {
              setSelectedUrl(value);
              setShowSheetSelector(true);
            }
          }
        }
      } catch (error) {
        console.error('Error handling URL change:', error);
        setError('Failed to process URL');
      } finally {
        setIsRetrievingData(false);
      }
    }
  };

  const handleOutputUrlChange = async (value: string, fromDropdown = false) => {
    setOutputUrl(value);
    setOutputTypeError(null);
    setDestinationUrlError(null);
    
    if (value) {
      // Handle dropdown selection
      if (fromDropdown) {
        const titleKey = value;  // value is the title key when from dropdown
        if (documentTitles[titleKey]) {
          try {
            const { url, sheet_name } = JSON.parse(titleKey);
            setOutputUrl(url);
            setSelectedOutputSheet(sheet_name);
            return;
          } catch (error) {
            console.error('Error parsing title key:', error);
          }
        }
      }

      setIsRetrievingData(true);
      try {
        // Verify file access
        const { hasPermission, fileInfo, error } = await verifyFileAccess(value)
        
        if (!fileInfo) {
          setDestinationUrlError('Invalid URL format')
          return
        }

        if (!hasPermission) {
          // Launch the file picker when permission is not found
          const pickerResult = await launchPicker(fileInfo.provider)
          
          if (!pickerResult.success) {
            setDestinationUrlError(pickerResult.error || 'Failed to get file permission')
            return
          }
          
          // If picker was successful, continue with URL validation
          if (pickerResult.url) {
            value = pickerResult.url // Use the URL from the picker
          }
        }

        // Continue with existing validation and processing
        if (!(await validateUrl(value, true))) {
          return
        }

        // Fetch document title and handle sheet selection
        const workbook = await fetchDocumentTitles(value);
        if (workbook?.success) {
          const sheetNames = workbook.sheet_names ?? [];
          
          setWorkbookCache(prev => ({
            ...prev,
            [value]: {
              doc_name: workbook.doc_name,
              sheet_names: sheetNames
            }
          }));
          
          if (sheetNames.length === 1) {
            setSelectedOutputSheet(sheetNames[0]);
            await updateRecentUrls(value, sheetNames[0], workbook.doc_name);
          } else if (sheetNames.length > 1) {
            setSelectedUrl(value);
            setShowSheetSelector(true);
          }
        }
      } catch (error) {
        console.error('Error handling destination URL change:', error);
        setDestinationUrlError('Failed to retrieve document data');
      } finally {
        setIsRetrievingData(false);
      }
    }
  };

  const handleSheetSelection = async (url: string, selectedSheet: string) => {
    if (!url || !selectedSheet) {
      console.error('Missing required data for sheet selection:', { url, selectedSheet });
      return;
    }

    setShowSheetSelector(false);
    setIsRetrievingData(true);

    try {
      // Get the cached workbook data
      const cachedWorkbook = workbookCache[url];
      if (!cachedWorkbook) {
        throw new Error('Workbook information not found in cache');
      }

      // Verify the selected sheet exists in the workbook
      if (!cachedWorkbook.sheet_names.includes(selectedSheet)) {
        throw new Error(`Selected sheet "${selectedSheet}" not found in workbook sheets: ${cachedWorkbook.sheet_names.join(', ')}`);
      }

      // Add to selected pairs
      const newPair: InputUrl = { url, sheet_name: selectedSheet };
      setSelectedUrlPairs(prev => [...prev, newPair]);
      setUrls(['']); // Reset URL input field

      // Create title key and display title using cached workbook data
      const titleKey = formatTitleKey(url, selectedSheet);
      const displayTitle = formatDisplayTitle(cachedWorkbook.doc_name, selectedSheet);
      
      // Update document titles mapping
      setDocumentTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle
      }));

      // Update recent URLs in database with cached workbook data
      await updateRecentUrls(
        url,
        selectedSheet,
        cachedWorkbook.doc_name
      );

    } catch (error) {
      console.error('Error in handleSheetSelection:', error);
      setError('Failed to update sheet selection');
    } finally {
      setIsRetrievingData(false);
    }
  };

  const handleUrlFocus = async () => {
    if (user?.id) {
      try {
        const { data } = await supabase
          .from('user_usage')
          .select('recent_sheets')
          .eq('user_id', user.id)
          .single();

        if (data?.recent_sheets) {
          setRecentUrls(data.recent_sheets);
          
          // Get titles for URLs that don't have any mapping entries
          const urlsToFetch = data.recent_sheets.filter((sheet: OnlineSheet) => {
            const titleKey = formatTitleKey(sheet.url, sheet.sheet_name);
            return !documentTitles[titleKey];
          });

          if (urlsToFetch.length > 0) {
            const titlePromises = urlsToFetch.map((sheet: OnlineSheet) => 
              fetchDocumentTitles(sheet.url)
            );
            
            await Promise.all(titlePromises);
          }
        }
      } catch (error) {
        console.error('Error fetching recent URLs:', error);
      }
    }
  };
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

    // Validate destination URL if output type is 'online'
    if (outputType === 'online') {
      if (!(await validateUrl(outputUrl, true))) {
        return;
      }
    }

    // Only show warning on submit if conditions are met
    if (outputType === 'online' && allowSheetModification && showSheetModificationWarningPreference) {
      setShowModificationWarning(true)
      return // Stop here and wait for user acknowledgment
    }

    // If we get here, either no warning needed or warning was acknowledged
    console.log('Proceeding with submission')
    setIsProcessing(true)

    try {
      // Create output preferences object with sheet name
      const outputPreferences: OutputPreferences = {
        type: outputType ?? 'download',
        ...(outputType === 'online' && { 
          destination_url: outputUrl,
          modify_existing: allowSheetModification,
          sheet_name: selectedOutputSheet ?? undefined
        }),
        ...(outputType === 'download' && { format: downloadFileType })
      }

      // Process the query using selectedUrlPairs directly
      try {
        const result = await processQuery(
          query,
          selectedUrlPairs,
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
          throw queryError;
        }
      }
    } catch (error) {
      console.error('Error processing query:', error)
      setError('An error occurred while processing your request')
      
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
      // Create output preferences object with sheet name
      const outputPreferences: OutputPreferences = {
        type: outputType ?? 'download',
        ...(outputType === 'online' && { 
          destination_url: outputUrl,
          modify_existing: allowSheetModification,
          sheet_name: selectedOutputSheet ?? undefined
        }),
        ...(outputType === 'download' && { format: downloadFileType })
      }

      // Process the query using selectedUrlPairs directly
      try {
        const result = await processQuery(
          query,
          selectedUrlPairs,
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
          throw queryError;
        }
      }
    } catch (error) {
      console.error('Error processing query:', error)
      setError('An error occurred while processing your request')
      
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

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const handleDownloadFormatChange = (value: DownloadFileType) => {
    setDownloadFileType(value);
  };

  const removeSelectedUrlPair = (index: number) => {
    setSelectedUrlPairs(prev => prev.filter((_, i) => i !== index));
  };

  const updateSheetModificationPreference = async (allow: boolean) => {
    try {
      console.log('[useDashboard] Updating sheet modification preference:', {
        currentValue: allowSheetModification,
        newValue: allow
      })
      
      setIsUpdating(true)
      const { error } = await supabase
        .from('user_profile')
        .update({ 
          allow_sheet_modification: allow,
          show_sheet_modification_warning: true
        })
        .eq('id', user?.id)

      if (error) throw error

      console.log('[useDashboard] Successfully updated sheet modification preference')
      
      setAllowSheetModification(allow)
      setShowSheetModificationWarningPreference(true)
      
      toast({
        title: "Success",
        description: `Direct sheet modification ${allow ? 'enabled' : 'disabled'}.`,
      })
    } catch (error) {
      console.error('[useDashboard] Failed to update sheet modification preference:', error)
      toast({
        title: "Error",
        description: "Failed to update sheet modification preference.",
        className: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    urls,
    query,
    files,
    error,
    outputType,
    outputUrl,
    isProcessing,
    showPermissionsPrompt,
    urlPermissionError,
    urlValidationError,
    recentUrls,
    documentTitles,
    downloadFileType,
    fileErrors,
    outputTypeError,
    processedResult,
    showResultDialog,
    allowSheetModification,
    showModificationWarning,
    showSheetModificationWarningPreference,
    destinationUrlError,
    isLoadingTitles,
    availableSheets,
    showSheetSelector,
    selectedUrl,
    permissions,
    setShowPermissionsPrompt,
    setFiles,
    setQuery,
    setOutputType,
    setOutputUrl,
    setError,
    setDownloadFileType,
    setOutputTypeError,
    setShowResultDialog,
    setAllowSheetModification,
    setShowModificationWarning,
    setShowSheetSelector,
    handleSheetSelection,
    handleFileChange,
    handleUrlChange,
    handleUrlFocus,
    handleSubmit,
    addUrlField,
    removeUrlField,
    handleOutputUrlChange,
    handleWarningAcknowledgment,
    continueSubmitAfterWarning,
    handleQueryChange,
    handleDownloadFormatChange,
    isRetrievingData,
    formatTitleKey,
    formatDisplayTitle,
    selectedUrlPairs,
    selectedOutputSheet,
    removeSelectedUrlPair,
    isUpdating,
    updateSheetModificationPreference,
  } as const;
}