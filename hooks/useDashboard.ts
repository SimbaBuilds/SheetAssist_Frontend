import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {downloadFile} from '@/lib/services/download_file'
import {getSheetNames} from '@/lib/services/get_sheet_names'
import { createClient } from '@/lib/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, QueryResponse, SheetTitleMap, InputSheet, OnlineSheet, ProcessingState } from '@/lib/types/dashboard'
import { MAX_FILES, MAX_FILE_SIZE } from '@/lib/constants/file-types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import {
  formatTitleKey,
  formatDisplayTitle,
  validateFile,
  handleUrlValidation,
  validateCumulativeFileSize,
  getUrlProvider
} from '@/lib/utils/dashboard-utils'
import { queryService } from '@/lib/services/process_query'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { usePicker } from '@/hooks/usePicker'


type UserPreferences = DashboardInitialData

interface FileError {
  file: File;
  error: string;
}




export function useDashboard(initialData?: UserPreferences) {
  const { user } = useAuth()
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([''])
  const [query, setQuery] = useState('')
  const [outputType, setOutputType] = useState<'download' | 'online' | null>(null)
  const [destinationSheet, setOutputUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingSheets, setFetchingSheets] = useState(false)
  const [permissions, setPermissions] = useState<{
    google: boolean | null;
    microsoft: boolean | null;
  }>({
    google: null,
    microsoft: null
  })

  const [recentUrls, setRecentUrls] = useState<OnlineSheet[]>([])
  const [downloadFileType, setDownloadFileType] = useState<DownloadFileType>('csv')
  const [fileErrors, setFileErrors] = useState<FileError[]>([])
  const [outputTypeError, setOutputTypeError] = useState<string | null>(null)
  const [processedResult, setProcessedResult] = useState<QueryResponse | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [allowSheetModification, setAllowSheetModification] = useState(false)
  const [sheetTitles, setSheetTitles] = useState<{ [key: string]: string }>({})
  const [availableSheets, setAvailableSheets] = useState<{ [url: string]: string[] }>({})
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  const [destinationUrlError, setDestinationUrlError] = useState<string | null>(null)
  const [workbookCache, setWorkbookCache] = useState<{ [url: string]: { doc_name: string, sheet_names: string[] } }>({})
  const [isRetrievingData, setIsRetrievingData] = useState(false)
  const [isRetrievingDestinationData, setIsRetrievingDestinationData] = useState(false)
  const [selectedInputSheets, setSelectedSheets] = useState<InputSheet[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const [isInitializing, setIsInitializing] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [destinationSheets, setDestinationSheets] = useState<string[]>([])
  const [showDestinationSheetSelector, setShowDestinationSheetSelector] = useState(false)
  const [selectedDestinationSheet, setSelectedDestinationSheet] = useState<InputSheet | null>(null)
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    message: ''
  })
  const { 
    hasReachedRequestLimit, 
    hasReachedOverageLimit, 
    currentPlan 
  } = useUsageLimits()

  const supabase = createClient()

  const updateRecentSheets = async (url: string, sheetName: string, docName: string, pickerToken?: string) => {
    if (!user?.id || !url.trim() || !sheetName.trim() || !docName.trim()) {
      console.error('Missing required data for updateRecentSheets:', { url, sheetName, docName });
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
      
      // Create unique key for the new entry
      const newKey = JSON.stringify({ url, sheet_name: sheetName });
      
      // Remove any existing entries with the same URL and sheet name
      updatedUrls = updatedUrls.filter((sheet: OnlineSheet) => {
        const existingKey = JSON.stringify({ url: sheet.url, sheet_name: sheet.sheet_name });
        return existingKey !== newKey;
      });
      
      // Get provider from URL
      const provider = getUrlProvider(url);
      if (!provider) {
        throw new Error('Invalid URL provider');
      }

      // Calculate token expiry (30 minutes from now)
      const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      
      // Create new sheet entry
      const newSheet: OnlineSheet = {
        url,
        doc_name: docName,
        sheet_name: sheetName,
        provider,
        picker_token: pickerToken || '',
        token_expiry: tokenExpiry
      };
      
      // Add to the beginning of the list and limit to 6 entries
      updatedUrls = [newSheet, ...updatedUrls].slice(0, 6);

      // Update database
      const { error: updateError } = await supabase
        .from('user_usage')
        .upsert({ 
          user_id: user.id,
          recent_sheets: updatedUrls
        });

      if (updateError) throw updateError;

      // Update local state
      setRecentUrls(updatedUrls);

      // Update document titles mapping only if it doesn't exist
      const titleKey = formatTitleKey(url, sheetName);
      if (!sheetTitles[titleKey]) {
        const displayTitle = formatDisplayTitle(docName, sheetName);
        setSheetTitles(prev => ({
          ...prev,
          [titleKey]: displayTitle
        }));
      }

    } catch (error) {
      console.error('Error updating recent URLs:', error);
      setError('Failed to update recent URLs');
    }
  };

  // Input picker hook
  const inputPicker = usePicker({
    type: 'input',
    onSelect: (inputUrl) => {
      setSelectedSheets(prev => [...prev, inputUrl]);
    },
    onError: (error) => {
      setError(error);
    },
    updateRecentSheets: updateRecentSheets,
    onPermissionRedirect: (provider: 'google' | 'microsoft') => {
      if (provider === 'google' && !permissions.google) {
        router.push('/auth/setup-permissions?provider=google');
        return true;
      }
      if (provider === 'microsoft' && !permissions.microsoft) {
        router.push('/auth/setup-permissions?provider=microsoft');
        return true;
      }
      return false;
    }
  });

  // Output picker hook
  const destinationPicker = usePicker({
    type: 'output',
    onSelect: (destinationSheet) => {
      // Update all necessary state for form submission
      setSelectedDestinationSheet(destinationSheet);
      setDestinationUrlError(null); // Clear any previous errors
    },
    onError: (error) => {
      setDestinationUrlError(error);
    },
    updateRecentSheets: updateRecentSheets,
    onPermissionRedirect: (provider: 'google' | 'microsoft') => {
      if (provider === 'google' && !permissions.google) {
        router.push('/auth/setup-permissions?provider=google');
        return true;
      }
      if (provider === 'microsoft' && !permissions.microsoft) {
        router.push('/auth/setup-permissions?provider=microsoft');
        return true;
      }
      return false;
    }
  });

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user?.id) return;
      
      setIsInitializing(true)
      try {
        // First check if records exist and create them if they don't
        const [profileExists, usageExists] = await Promise.all([
          supabase
            .from('user_profile')
            .select('id')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_usage')
            .select('user_id')
            .eq('user_id', user.id)
            .single()
        ]);

        // Create records if either query resulted in an error
        if (profileExists.error || usageExists.error) {
          await Promise.all([
            // Only insert profile if it doesn't exist
            profileExists.error && supabase
              .from('user_profile')
              .insert({
                id: user.id,
              }),
            // Only insert usage if it doesn't exist
            usageExists.error && supabase
              .from('user_usage')
              .insert({
                user_id: user.id,
              })
          ]);
        }

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
          const titleMap: SheetTitleMap = {};
          usageResult.data.recent_sheets.forEach((sheet: OnlineSheet) => {
            if (sheet.url && sheet.doc_name && sheet.sheet_name) {
              const titleKey = formatTitleKey(sheet.url, sheet.sheet_name);
              const displayTitle = formatDisplayTitle(sheet.doc_name, sheet.sheet_name);
              titleMap[titleKey] = displayTitle;
            }
          });
          
          setSheetTitles(titleMap);
        }

      } catch (error) {
        console.error('Error initializing dashboard:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
        });
      } finally {
        setIsInitializing(false);
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
      // Reset the file input
      e.target.value = '';
      return
    }

    // Calculate current total size
    const currentTotalSize = files.reduce((sum, file) => sum + file.size, 0);

    // Validate each file
    selectedFiles.forEach(file => {
      const sizeError = validateCumulativeFileSize(file, files, MAX_FILE_SIZE);
      const validationError = validateFile(file);
      
      if (sizeError) {
        newErrors.push({ file, error: sizeError });
      } else if (validationError) {
        newErrors.push({ file, error: validationError });
      } else if (currentTotalSize + file.size > MAX_FILE_SIZE) {
        newErrors.push({ 
          file, 
          error: `Adding this file would exceed the total size limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        });
      } else {
        validFiles.push(file);
      }
    })

    setFileErrors(newErrors)
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      setError('')
    }
    
    // Reset the file input value to allow selecting the same file again
    e.target.value = '';
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

  const fetchSheetTitles = async (url: string) => {
    try {
      const workbook = await getSheetNames(url);
      
      // Update sheetTitles state with new mappings
      const newSheetTitles = { ...sheetTitles };
      
      if (workbook.success && workbook.doc_name) {
        if (workbook.sheet_names?.length) {
          // For URLs with multiple sheets (Microsoft or Google)
          workbook.sheet_names.forEach((sheetName: string) => {
            const titleKey = formatTitleKey(workbook.url, sheetName);
            const displayTitle = formatDisplayTitle(workbook.doc_name, sheetName);
            newSheetTitles[titleKey] = displayTitle;
          });

          // Update available sheets
          setAvailableSheets(prev => ({
            ...prev,
            [workbook.url]: [...workbook?.sheet_names ?? []]
          }));

          console.log('Document Titles Mapping Updated:', {
            url,
            currentMapping: newSheetTitles,
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

      setSheetTitles(newSheetTitles);
      return workbook;
    } catch (error) {
      console.error('Error fetching document titles:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch document title');
      return null;
    }
  };


  const handleDestinationSheetSelection = async (url: string, sheet: string) => {
    setShowDestinationSheetSelector(false);
    
    try {
      const workbook = await getSheetNames(url);
      if (!workbook?.success) {
        throw new Error('Failed to get document information');
      }

      const destinationPair: InputSheet = { 
        url, 
        sheet_name: sheet,
        doc_name: workbook.doc_name
      };
      
      setSelectedDestinationSheet(destinationPair);

      const titleKey = formatTitleKey(url, sheet);
      const displayTitle = formatDisplayTitle(workbook.doc_name, sheet);
      setSheetTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle
      }));
      
      await updateRecentSheets(url, sheet, workbook.doc_name);
    } catch (error) {
      console.error('Error in handleDestinationSheetSelection:', error);
      setError('Failed to process sheet selection');
    }
  };

  const handleSheetSelection = async (url: string, selectedSheet: string) => {
    console.log('[useDashboard] handleSheetSelection called:', { url, selectedSheet });
    
    if (!url || !selectedSheet) {
      console.error('[useDashboard] Missing required data for sheet selection:', { url, selectedSheet });
      return;
    }

    setShowSheetSelector(false);
    setIsRetrievingData(true);

    try {
      // Get the cached workbook data
      const cachedWorkbook = workbookCache[url];
      console.log('[useDashboard] Retrieved cached workbook:', cachedWorkbook);
      
      if (!cachedWorkbook) {
        throw new Error('Workbook information not found in cache');
      }

      // Check if this URL + sheet combination already exists
      const isDuplicate = selectedInputSheets.some(
        pair => pair.url === url && pair.sheet_name === selectedSheet
      );

      if (isDuplicate) {
        console.log('[useDashboard] Duplicate sheet selection detected');
        toast({
          title: "Already Selected",
          description: "This sheet has already been selected.",
          className: "destructive"
        });
        return;
      }

      // Create new URL pair with doc_name from cache
      const newPair: InputSheet = { 
        url, 
        sheet_name: selectedSheet,
        doc_name: cachedWorkbook.doc_name
      };
      
      console.log('[useDashboard] Adding new sheet pair:', newPair);
      setSelectedSheets(prev => [...prev, newPair]);
      setUrls(['']);

      const titleKey = formatTitleKey(url, selectedSheet);
      const displayTitle = formatDisplayTitle(cachedWorkbook.doc_name, selectedSheet);
      
      setSheetTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle
      }));

      await updateRecentSheets(url, selectedSheet, cachedWorkbook.doc_name);

    } catch (error) {
      console.error('[useDashboard] Error in handleSheetSelection:', error);
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
            return !sheetTitles[titleKey];
          });

          if (urlsToFetch.length > 0) {
            const titlePromises = urlsToFetch.map((sheet: OnlineSheet) => 
              fetchSheetTitles(sheet.url)
            );
            
            await Promise.all(titlePromises);
          }
        }
      } catch (error) {
        console.error('Error fetching recent URLs:', error);
      }
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsProcessing(false);
      setShowResultDialog(false);
      setError('Request was canceled');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    setError(null);
    setOutputTypeError(null);
    setDestinationUrlError(null);
    setProcessingState({
      status: 'idle',
      message: ''
    });

    // Validate required fields
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    if (!outputType) {
      setOutputTypeError('Please select an output type');
      return;
    }

    if (outputType === 'online' && !selectedDestinationSheet) {
      setDestinationUrlError('Please select a destination sheet');
      return;
    }

    // Clean up any existing abort controller
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    // Create new AbortController
    const controller = new AbortController();
    setAbortController(controller);

    setIsProcessing(true);
    setShowResultDialog(true);

    try {
      const outputPreferences: OutputPreferences = {
        type: outputType,
        format: outputType === 'download' ? downloadFileType : undefined,
        destination_url: selectedDestinationSheet?.url,
        sheet_name: selectedDestinationSheet?.sheet_name,
        doc_name: selectedDestinationSheet?.doc_name,
        modify_existing: outputType === 'online' ? allowSheetModification : undefined,
        picker_token: selectedDestinationSheet?.picker_token || null
      };

      const result = await queryService.processQuery(
        query,
        selectedInputSheets,
        files,
        outputPreferences,
        controller.signal,
        (state) => setProcessingState(state)
      );

        if (!controller.signal.aborted) {
            setProcessedResult(result);
            
            if (result.status === 'error') {
                setProcessingState({
                    status: 'error',
                    message: result.message || 'An unexpected error occurred'
                });
                return;
            }

            // Handle successful completion
            setProcessingState({
                status: 'completed',
                message: result.message || 'Processing complete'
            });

            // Handle download if needed
            if (outputType === 'download' && result.status === 'completed' && result.files?.[0]) {
                try {
                    await downloadFile(result.files[0]);
                } catch (downloadError) {
                    if (!handleAuthError(downloadError)) {
                        console.error('Error downloading file:', downloadError);
                        setProcessingState({
                            status: 'error',
                            message: 'Failed to download the result file'
                        });
                    }
                }
            }
        }
    } catch (error: any) {
        // This will now only handle non-cancellation errors
        const errorMessage = error?.response?.data?.message || 
                           error?.message || 
                           'An unexpected error occurred';
        
        setProcessingState({
            status: 'error',
            message: errorMessage
        });
        if (!controller.signal.aborted) {
            setProcessedResult(null);
        }
    } finally {
      // Only clean up if not aborted
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

  const removeSelectedSheet = (index: number) => {
    setSelectedSheets(prev => prev.filter((_, i) => i !== index));
  };

  const updateSheetModificationPreference = async (allow: boolean) => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_profile')
        .update({ direct_sheet_modification: allow })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state after successful database update
      setAllowSheetModification(allow);
    } catch (error) {
      console.error('Error updating sheet modification preference:', error);
      setError('Failed to update preference');
    } finally {
      setIsUpdating(false);
    }
  };


  return {
    isInitializing,
    query,
    files,
    error,
    outputType,
    destinationSheet,
    isProcessing,
    recentUrls,
    sheetTitles,
    setSheetTitles,
    downloadFileType,
    fileErrors,
    outputTypeError,
    processedResult,
    showResultDialog,
    setShowResultDialog,
    allowSheetModification,
    destinationUrlError,
    availableSheets,
    showSheetSelector,
    selectedInputSheets,
    setFiles,
    setQuery,
    setOutputType,
    setOutputUrl,
    setDownloadFileType,
    setOutputTypeError,
    setShowSheetSelector,
    handleFileChange,
    handleSubmit,
    formatTitleKey,
    formatDisplayTitle,    
    isRetrievingData,
    removeSelectedSheet,
    isUpdating,
    updateSheetModificationPreference,
    handleCancel,
    isRetrievingDestinationData,
    destinationSheets,
    showDestinationSheetSelector,
    setShowDestinationSheetSelector,
    handleDestinationSheetSelection,
    workbookCache,
    setWorkbookCache,
    selectedDestinationSheet,
    setSelectedDestinationSheet,
    processingState,
    handleInputPicker: inputPicker.launchProviderPicker,
    isInputPickerProcessing: inputPicker.isProcessing,
    handleOutputPicker: destinationPicker.launchProviderPicker,
    isOutputPickerProcessing: destinationPicker.isProcessing,
    permissions,
    fetchingSheets,
    selectedSheetUrl: inputPicker.selectedSheetUrl,
    workbookInfo: inputPicker.workbookInfo,
    inputAvailableSheets: inputPicker.availableSheets,
    handleInputSheetSelection: inputPicker.handleSheetNameSelection,
    showInputSheetSelector: inputPicker.showSheetSelector,
    setShowInputSheetSelector: inputPicker.setShowSheetSelector,
    destinationPicker,
  } as const;
}