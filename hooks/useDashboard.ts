import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {downloadFile} from '@/services_endpoints/download_file'
import {getDocumentTitle} from '@/services_endpoints/get_document_title'
import { createClient } from '@/utils/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, QueryResponse, SheetTitleKey, InputUrl, OnlineSheet, ProcessingState } from '@/types/dashboard'
import { MAX_FILES } from '@/constants/file-types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { useFilePicker } from '@/hooks/useFilePicker'
import { useDataVisualization } from '@/hooks/useDataVisualization'
import {
  getUrlProvider,
  checkUrlPermissions,
  formatTitleKey,
  formatDisplayTitle,
  validateFile,
  handleAuthError,
  handleUrlValidation,
  fetchAndHandleSheets
} from '@/utils/dashboard-utils'
import { queryService } from '@/services_endpoints/process_query'


type UserPreferences = DashboardInitialData

interface FileError {
  file: File;
  error: string;
}

interface DocumentTitleMap {
  [key: string]: string;  // key will be JSON.stringify(SheetTitleKey)
}

type SetSelectedOutputSheet = (sheet: string | null) => void;



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
  const [processedResult, setProcessedResult] = useState<QueryResponse | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [allowSheetModification, setAllowSheetModification] = useState(false)
  const [documentTitles, setDocumentTitles] = useState<DocumentTitleMap>({})
  const [availableSheets, setAvailableSheets] = useState<{ [url: string]: string[] }>({})
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const [destinationUrlError, setDestinationUrlError] = useState<string | null>(null)
  const [isLoadingTitles, setIsLoadingTitles] = useState(true)
  const [workbookCache, setWorkbookCache] = useState<{ [url: string]: { doc_name: string, sheet_names: string[] } }>({})
  const [isRetrievingData, setIsRetrievingData] = useState(false)
  const [isRetrievingDestinationData, setIsRetrievingDestinationData] = useState(false)
  const [selectedUrlPairs, setSelectedUrlPairs] = useState<InputUrl[]>([])
  const [selectedOutputSheet, setSelectedOutputSheet] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const { verifyFileAccess, launchPicker } = useFilePicker()
  const [isInitializing, setIsInitializing] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isDestinationUrlProcessing, setIsDestinationUrlProcessing] = useState(false)
  const [isLoadingDestinationTitles, setIsLoadingDestinationTitles] = useState(false)
  const [destinationSheets, setDestinationSheets] = useState<string[]>([])
  const [showDestinationSheetSelector, setShowDestinationSheetSelector] = useState(false)
  const [destinationUrls, setDestinationUrls] = useState<string[]>([''])
  const [selectedDestinationPair, setSelectedDestinationPair] = useState<InputUrl | null>(null)
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: null,
    message: ''
  });

  const supabase = createClient()

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user?.id) return;
      
      setIsInitializing(true)
      try {
        // Fetch all initial data in parallel
        const [profileResult, usageResult] = await Promise.all([
          supabase
            .from('user_profile')
            .select('google_permissions_set, microsoft_permissions_set, direct_sheet_modification')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_usage')
            .select('recent_sheets')
            .eq('user_id', user.id)
            .single(),
        ]);

        // Handle profile data
        if (profileResult.data) {
          const { 
            google_permissions_set,
            microsoft_permissions_set,
            direct_sheet_modification,
          } = profileResult.data;

          // Initialize permissions from profile
          setPermissions({
            google: google_permissions_set,
            microsoft: microsoft_permissions_set
          });
          
          setAllowSheetModification(direct_sheet_modification ?? false);
        }

        // Handle usage data (recent sheets)
        if (usageResult.data?.recent_sheets?.length) {
          setRecentUrls(usageResult.data.recent_sheets);
          
          // Create document titles mapping
          const titleMap: DocumentTitleMap = {};
          usageResult.data.recent_sheets.forEach((sheet: OnlineSheet) => {
            if (sheet.url && sheet.doc_name && sheet.sheet_name) {
              const titleKey = formatTitleKey(sheet.url, sheet.sheet_name);
              const displayTitle = formatDisplayTitle(sheet.doc_name, sheet.sheet_name);
              titleMap[titleKey] = displayTitle;
            }
          });
          
          setDocumentTitles(titleMap);
        }

      } catch (error) {
        console.error('Error initializing dashboard:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
        });
      } finally {
        setIsInitializing(false);
        setIsLoadingTitles(false);
      }
    };

    if (user?.id) {
      initializeDashboard();
    }
  }, [user?.id]);

  useEffect(() => {
    if (initialData) {
      console.log('[useDashboard] Initializing with data:', {
        allowSheetModification: initialData.direct_sheet_modification,
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

  const handleUrlChange = async (index: number, value: string, fromDropdown = false) => {
    setUrlPermissionError(null);
    setUrlValidationError(null);

    // Update the URLs array at the specified index
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    if (!value) return;

    // Handle dropdown selection
    if (fromDropdown) {
      const titleKey = value;
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

    setIsRetrievingData(true);
    try {
      // Use the utility function for URL validation
      const isValid = await handleUrlValidation(
        value,
        verifyFileAccess,
        launchPicker,
        setUrlValidationError
      );

      if (!isValid) return;

      // Set the selected URL for sheet selection
      setSelectedUrl(value);

      // Fetch document title and handle sheet selection
      const workbook = await getDocumentTitle(value);
      if (workbook?.success) {
        // Cache workbook data
        setWorkbookCache(prev => ({
          ...prev,
          [value]: {
            doc_name: workbook.doc_name,
            sheet_names: workbook.sheet_names ?? []
          }
        }));

        // Update available sheets for this URL
        const sheetNames = workbook.sheet_names ?? [];
        if (sheetNames.length) {
          setAvailableSheets(prev => ({
            ...prev,
            [value]: sheetNames
          }));

          // If there's only one sheet, select it automatically
          if (sheetNames.length === 1) {
            const sheet = sheetNames[0];
            const newPair: InputUrl = { url: value, sheet_name: sheet };
            setSelectedUrlPairs(prev => [...prev, newPair]);
            setUrls(['']);
            updateRecentUrls(value, sheet, workbook.doc_name);
          } else {
            // Show sheet selector for multiple sheets
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
  };

  const handleOutputUrlChange = async (value: string, fromDropdown = false) => {
    // Clear any previous errors
    setOutputUrl(value);
    setOutputTypeError(null);
    setDestinationUrlError(null);
    setDestinationUrls([value]);

    if (!value) return;

    // Handle dropdown selection
    if (fromDropdown) {
      const titleKey = value;
      if (documentTitles[titleKey]) {
        try {
          const { url, sheet_name } = JSON.parse(titleKey);
          setSelectedDestinationPair({ url, sheet_name });
          setDestinationUrls(['']);  // Clear input
          setOutputUrl('');  // Clear the output URL when a sheet is selected
          return;
        } catch (error) {
          console.error('Error parsing title key:', error);
        }
      }
    }

    setIsDestinationUrlProcessing(true);
    try {
      const isValid = await handleUrlValidation(
        value,
        verifyFileAccess,
        launchPicker,
        setDestinationUrlError
      );

      if (!isValid) {
        setOutputUrl('');
        setIsDestinationUrlProcessing(false);
        return;
      }

      const workbook = await getDocumentTitle(value);
      if (workbook?.success) {
        console.log('Workbook response:', workbook);
        
        setWorkbookCache(prev => {
          const newCache = {
            ...prev,
            [value]: {
              doc_name: workbook.doc_name,
              sheet_names: workbook.sheet_names ?? []
            }
          };
          console.log('Updated cache:', newCache);
          return newCache;
        });
        
        const sheetNames = workbook.sheet_names ?? [];
        
        setDestinationSheets(sheetNames);

        if (sheetNames.length === 1) {
          const sheet = sheetNames[0];
          setSelectedOutputSheet(sheet);
          
          const titleKey = formatTitleKey(value, sheet);
          const displayTitle = formatDisplayTitle(workbook.doc_name, sheet);
          
          setDocumentTitles(prev => ({
            ...prev,
            [titleKey]: displayTitle
          }));

          await updateRecentUrls(value, sheet, workbook.doc_name);
        } else if (sheetNames.length > 1) {
          setShowDestinationSheetSelector(true);
        }
      }
    } catch (error) {
      console.error('Error in handleOutputUrlChange:', error);
      setDestinationUrlError('Failed to process URL');
      setOutputUrl('');
    } finally {
      setIsDestinationUrlProcessing(false);
    }
  };

  const handleDestinationSheetSelection = async (url: string, sheet: string) => {
    setShowDestinationSheetSelector(false);
    setSelectedDestinationPair({ url, sheet_name: sheet });
    setDestinationUrls(['']);  // Clear input like main

    if (url && sheet) {
      const cachedWorkbook = workbookCache[url];
      if (cachedWorkbook) {
        const titleKey = formatTitleKey(url, sheet);
        const displayTitle = formatDisplayTitle(cachedWorkbook.doc_name, sheet);
        setDocumentTitles(prev => ({
          ...prev,
          [titleKey]: displayTitle
        }));
        await updateRecentUrls(url, sheet, cachedWorkbook.doc_name);
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

      // Create new URL pair with selected sheet
      const newPair: InputUrl = { url, sheet_name: selectedSheet };
      setSelectedUrlPairs(prev => [...prev, newPair]);
      setUrls(['']); // Reset URL input field

      // Create title key and display title
      const titleKey = formatTitleKey(url, selectedSheet);
      const displayTitle = formatDisplayTitle(cachedWorkbook.doc_name, selectedSheet);
      
      // Update document titles mapping
      setDocumentTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle
      }));

      // Update recent URLs
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

  const handleCancel = async () => {
    if (abortController) {
      console.log('Cancelling request...');
      abortController.abort();
      setAbortController(null);
      setIsProcessing(false);
      setShowResultDialog(false);
      setProcessedResult(null);
      setError('Request was canceled');
      
      // Log the cancellation
      if (user?.id) {
        try {
          await supabase.from('request_log').insert({
            user_id: user.id,
            query,
            file_names: files?.map(f => f.name) || [],
            doc_names: selectedUrlPairs.map(url => url.url),
            status: 'canceled',
            success: false
          });
        } catch (error) {
          console.error('Error logging cancellation:', error);
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset all relevant states at the start
    setError('');
    setOutputTypeError(null);
    setProcessedResult(null);
    setProcessingState({ // Reset processing state
      status: null,
      message: ''
    });

    // Clean up any existing abort controller
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    // Validate output preferences
    if (!outputType) {
      setOutputTypeError('Please select an output preference');
      return;
    }

    if (outputType === 'download' && !downloadFileType) {
      setOutputTypeError('Please select a file type');
      return;
    }

    // Modified validation for online output type
    if (outputType === 'online' && !selectedDestinationPair && !outputUrl.trim()) {
      setOutputTypeError('Please enter a destination URL or select a sheet');
      return;
    }

    // Only validate destination URL if there's no selected destination pair
    if (outputType === 'online' && !selectedDestinationPair && outputUrl.trim()) {
      const isValid = await handleUrlValidation(
        outputUrl,
        verifyFileAccess,
        launchPicker,
        setDestinationUrlError
      );
      if (!isValid) return;
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);
    setShowResultDialog(true);
    setProcessingState({
      status: 'processing',
      message: 'Processing your request. This may take a few minutes...'
    });

    try {
      const outputPreferences: OutputPreferences = {
        type: outputType ?? 'download',
        ...(outputType === 'download' && { format: downloadFileType }),
        ...(outputType === 'online' && {
          destination_url: selectedDestinationPair?.url ?? outputUrl,
          modify_existing: allowSheetModification,
          sheet_name: selectedDestinationPair?.sheet_name ?? selectedOutputSheet
        })
      };

      const result = await queryService.processQuery(
        query,
        selectedUrlPairs,
        files,
        outputPreferences,
        controller.signal,
        (state) => {
          setProcessingState(state);
          setIsProcessing(state.status === 'processing' || state.status === 'created');
        }
      );

      if (!controller.signal.aborted) {
        setProcessedResult(result);
        
        if (result.result.error) {
          setError(result.result.error);
          // Log error
          await supabase
            .from('error_log')
            .insert({
              user_id: user?.id,
              message: result.result.error,
              error_code: 'QUERY_PROCESSING_ERROR',
              resolved: false,
              original_query: result.result.original_query
            });
          return;
        }

        // Handle download if needed
        if (outputType === 'download' && result.status === 'completed' && result.files?.[0]) {
          try {
            await downloadFile(result.files[0]);
          } catch (downloadError) {
            if (!handleAuthError(downloadError)) {
              console.error('Error downloading file:', downloadError);
              setError('Failed to download the result file');
              
              // Log download error
              await supabase
                .from('error_log')
                .insert({
                  user_id: user?.id,
                  message: downloadError instanceof Error ? downloadError.message : 'Download failed',
                  error_code: 'DOWNLOAD_ERROR',
                  resolved: false,
                  original_query: result.result.original_query
                });
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Error processing query:', error);
      setError('An error occurred while processing your request');
      
      if (error instanceof Error) {
        await supabase
          .from('error_log')
          .insert({
            user_id: user?.id,
            message: error.message,
            error_code: 'UNKNOWN_ERROR',
            resolved: false,
          });
      }
      if (!controller.signal.aborted) {
        setProcessedResult(null); // Clear result on error
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsProcessing(false);
        setAbortController(null);
      }
    }
  };

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
          direct_sheet_modification: allow,
        })
        .eq('id', user?.id)

      if (error) throw error

      console.log('[useDashboard] Successfully updated sheet modification preference')
      
      setAllowSheetModification(allow)
      
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
    isInitializing,
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
    setDocumentTitles,
    downloadFileType,
    fileErrors,
    outputTypeError,
    processedResult,
    showResultDialog,
    allowSheetModification,
    destinationUrlError,
    isLoadingTitles,
    availableSheets,
    showSheetSelector,
    selectedUrl,
    permissions,
    selectedUrlPairs,
    selectedOutputSheet,
    setSelectedOutputSheet,
    setShowPermissionsPrompt,
    setFiles,
    setQuery,
    setOutputType,
    setOutputUrl,
    setDownloadFileType,
    setOutputTypeError,
    setAllowSheetModification,
    setShowSheetSelector,
    handleSheetSelection,
    handleFileChange,
    handleUrlChange,
    handleUrlFocus,
    handleSubmit,
    handleOutputUrlChange,
    handleQueryChange,
    handleDownloadFormatChange,
    isRetrievingData,
    isRetrievingDestinationData,
    setShowResultDialog,
    formatTitleKey,
    formatDisplayTitle,
    removeSelectedUrlPair,
    isUpdating,
    updateSheetModificationPreference,
    handleCancel,
    isDestinationUrlProcessing,
    isLoadingDestinationTitles,
    destinationSheets,
    showDestinationSheetSelector,
    setShowDestinationSheetSelector,
    handleDestinationSheetSelection,
    workbookCache,
    setWorkbookCache,
    destinationUrls,
    selectedDestinationPair,
    setSelectedDestinationPair,
    processingState,
  } as const;
}