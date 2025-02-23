import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {downloadFile} from '@/lib/services/download_file'
import {getSheetNames} from '@/lib/services/get_sheet_names'
import { createClient } from '@/lib/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, QueryResponse, SheetTitleMap, OnlineSheet, ProcessingState } from '@/lib/types/dashboard'
import { MAX_FILES, MAX_FILE_SIZE, MAX_PDF_PAGES } from '@/lib/constants/file-types'
import { TOKEN_EXPIRY } from '@/lib/constants/token_expiry'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import {
  formatTitleKey,
  formatDisplayTitle,
  validateFile,
  handleUrlValidation,
  validateCumulativeFileSize,
  getUrlProvider,
  isTokenExpired,
  logFormState,
  estimateProcessingTime
} from '@/lib/utils/dashboard-utils'
import { queryService } from '@/lib/services/process_query'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { usePicker } from '@/hooks/usePickerController'


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
  const [selectedOnlineSheets, setSelectedSheets] = useState<OnlineSheet[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const [isInitializing, setIsInitializing] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [destinationSheets, setDestinationSheets] = useState<string[]>([])
  const [showDestinationSheetSelector, setShowDestinationSheetSelector] = useState(false)
  const [selectedDestinationSheet, setSelectedDestinationSheet] = useState<OnlineSheet | null>(null)
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
    if (!url.trim() || !sheetName.trim() || !docName.trim()) {
      console.error('Missing required data for updateRecentSheets:', { url, sheetName, docName });
      return;
    }

    try {
      // Get provider from URL
      const provider = getUrlProvider(url);
      if (!provider) {
        throw new Error('Invalid URL provider');
      }

      // Calculate token expiry (30 minutes from now) ONLY if we have a new pickerToken
      const tokenExpiry = pickerToken 
        ? new Date(Date.now() + TOKEN_EXPIRY * 60 * 1000).toISOString()
        : undefined;

      // Create new sheet entry
      const newSheet: OnlineSheet = {
        url,
        doc_name: docName,
        sheet_name: sheetName,
        provider,
        picker_token: pickerToken || '',
        token_expiry: tokenExpiry || new Date(Date.now() - 1000).toISOString() // If no new token, set as expired
      };
      console.log('[updateRecentSheets] New sheet:', newSheet, 'Time to expiry:', tokenExpiry ? new Date(tokenExpiry).getTime() - Date.now() : 'no expiry');

      // Update recentUrls state - filter out expired and matching sheets
      setRecentUrls(prev => {
        // If we're updating an existing sheet and don't have a new picker token,
        // try to preserve the original token expiry
        if (!pickerToken) {
          const existingSheet = prev.find(sheet => 
            sheet.url === url && sheet.sheet_name === sheetName
          );
          if (existingSheet) {
            newSheet.token_expiry = existingSheet.token_expiry;
            newSheet.picker_token = existingSheet.picker_token;
          }
        }

        const filteredSheets = prev.filter(sheet => 
          !(sheet.url === url && sheet.sheet_name === sheetName) && !isTokenExpired(sheet.token_expiry)
        );
        return [newSheet, ...filteredSheets].slice(0, 6);
      });

      // Update sheetTitles
      const titleKey = formatTitleKey(url, sheetName);
      const displayTitle = formatDisplayTitle(docName, sheetName);
      setSheetTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle,
      }));

    } catch (error) {
      console.error('Error updating recent sheets:', error);
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
                terms_acceptance: [{
                  acceptedAt: new Date().toISOString(),
                  termsVersion: "1.0"
                }]
              }),
            // Only insert usage if it doesn't exist
            usageExists.error && supabase
              .from('user_usage')
              .insert({
                user_id: user.id,
              })
          ]);
        }

        // Fetch profile data
        const profileResult = await supabase
          .from('user_profile')
          .select('google_permissions_set, microsoft_permissions_set, direct_sheet_modification')
          .eq('id', user.id)
          .single();

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
    }
  }, [initialData])

  
  //FULL FORMDATA LOGGING
  // useEffect(() => {
  //   // Log form state whenever key form elements change
  //   logFormState('Form State', {
  //     files: files.map(f => ({ name: f.name, size: f.size })),
  //     query,
  //     outputType,
  //     downloadFileType: outputType === 'download' ? downloadFileType : null,
  //     selectedOnlineSheets: selectedOnlineSheets.map(sheet => ({
  //       url: sheet.url,
  //       sheet_name: sheet.sheet_name,
  //       doc_name: sheet.doc_name,
  //       picker_token: sheet.picker_token,
  //       display_title: sheetTitles[formatTitleKey(sheet.url, sheet.sheet_name)] || 'Unknown'
  //     })),
  //     selectedDestinationSheet: selectedDestinationSheet ? {
  //       url: selectedDestinationSheet.url,
  //       sheet_name: selectedDestinationSheet.sheet_name,
  //       doc_name: selectedDestinationSheet.doc_name,
  //       picker_token: selectedDestinationSheet.picker_token,
  //       display_title: sheetTitles[formatTitleKey(selectedDestinationSheet.url, selectedDestinationSheet.sheet_name)] || 'Unknown'
  //     } : null,
  //     allowSheetModification: outputType === 'online' ? allowSheetModification : null
  //   });
  // }, [files, query, outputType, downloadFileType, selectedOnlineSheets, selectedDestinationSheet, allowSheetModification, sheetTitles]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    for (const file of selectedFiles) {
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
    }

    // Check PDF page count limits
    if (validFiles.length > 0) {
      try {
        const allFiles = [...files, ...validFiles];
        const { totalPages, estimatedMinutes, exceedsLimit } = await estimateProcessingTime(allFiles);
        
        if (exceedsLimit) {
          setError(`Total PDF pages (${totalPages}) exceeds limit of ${MAX_PDF_PAGES} pages`);
          e.target.value = '';
          return;
        }
      } catch (error: any) {
        console.error('[handleFileChange] Error processing PDFs:', error);
        setError(error?.message || 'Failed to process PDF files');
        e.target.value = '';
        return;
      }
    }

    setFileErrors(newErrors)
    if (validFiles.length > 0) {
      const newFiles = [...files, ...validFiles];
      setFiles(newFiles)
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


  const handleDestinationSheetSelection = async (url: string, sheet: string) => {
    setShowDestinationSheetSelector(false);
    
    try {
      if (!selectedDestinationSheet?.picker_token) {
        throw new Error('No destination sheet selected');
      }
      const provider = getUrlProvider(url);
      if (!provider) {
        throw new Error('Invalid URL provider');
      }
      const workbook = await getSheetNames(url, provider, selectedDestinationSheet.picker_token);
      if (!workbook?.success) {
        throw new Error('Failed to get document information');
      }

      const destinationPair: OnlineSheet = { 
        url, 
        sheet_name: sheet,
        doc_name: workbook.doc_name,
        picker_token: selectedDestinationSheet.picker_token,
        provider: provider
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

  const handleCancel = async () => {
    console.log('[handleCancel- UseDashboard] Canceling...')
    console.log('[handleCancel- UseDashboard] current state:', {
      isProcessing,
      showResultDialog,
      processingState
    })

    if (isProcessing) {
      // Immediately update UI state to show cancellation in progress
      setProcessingState({
        status: 'canceling',
        message: 'Canceling request...'
      });

      try {
        // Abort any ongoing requests
        if (abortController) {
          abortController.abort();
          setAbortController(null);
        }

        // Update job status in database regardless of job_id availability
        const supabase = createClient();
        
        // If we have a specific job ID, update that job
        if (processedResult?.job_id) {
          const { error } = await supabase
            .from('jobs')
            .update({
              status: 'canceled',
              message: 'Request was canceled by user',
              completed_at: new Date().toISOString()
            })
            .eq('job_id', processedResult.job_id);

          if (error) {
            console.error('Failed to update job status:', error);
          }
        }

        // Update final states
        setIsProcessing(false);
        setShowResultDialog(false);
        setProcessingState({
          status: 'canceled',
          message: 'Request was canceled'
        });

        // Clear processed result
        setProcessedResult(null);

      } catch (error) {
        console.error('Error during cancellation:', error);
        // Even if there's an error, we want to stop processing
        setIsProcessing(false);
        setShowResultDialog(false);
        setProcessingState({
          status: 'error',
          message: 'Error while canceling request'
        });
      }
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

    // Check for expired tokens and processing time
    if (selectedOnlineSheets.length > 0) {
      try {
        // Get estimated processing time for all files
        const { estimatedMinutes } = await estimateProcessingTime(files);

        // Find earliest token expiry
        const earliestExpiry = selectedOnlineSheets.reduce((earliest, sheet) => {
          if (!sheet.token_expiry) return earliest;
          const expiryTime = new Date(sheet.token_expiry).getTime();
          return earliest ? Math.min(earliest, expiryTime) : expiryTime;
        }, 0);

        if (earliestExpiry) {
          const minutesUntilExpiry = (earliestExpiry - Date.now()) / (1000 * 60);
          if (estimatedMinutes > minutesUntilExpiry) {
            console.log('[handleSubmit] Estimated processing time exceeds token expiry:', {
              estimatedMinutes,
              minutesUntilExpiry,
              earliestExpiry
            });

            // Find the provider of the sheet that will expire
            const expiringSheet = selectedOnlineSheets.find(sheet => {
              if (!sheet.token_expiry) return false;
              return new Date(sheet.token_expiry).getTime() === earliestExpiry;
            });

            if (expiringSheet?.provider) {
              setError(`Estimated processing time (${Math.ceil(estimatedMinutes)} minutes) exceeds token expiry. Please reconnect to ${expiringSheet.provider}.`);
              toast({
                title: "Token Expired",
                description: `Estimated processing time exceeds access duration. Redirecting to service re-connect.`,
                className: "bg-destructive text-destructive-foreground"
              });
              // Add 3 second delay before redirect
              setTimeout(() => {
                router.push(`/auth/setup-permissions?provider=${expiringSheet.provider}&reauth=true`);
              }, 3000);
              return;
            }
          }
        }
      } catch (error) {
        console.error('[handleSubmit] Error checking processing time:', error);
        setError('Failed to estimate processing time');
        return;
      }
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
        selectedOnlineSheets,
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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    // logFormState('Query Updated', { query: value });
  };

  const handleOutputTypeChange = (value: 'download' | 'online' | null) => {
    setOutputType(value);
    setOutputTypeError(null);
    // logFormState('Output Type Updated', { 
    //   outputType: value,
    //   downloadFileType: value === 'download' ? downloadFileType : null,
    //   allowSheetModification: value === 'online' ? allowSheetModification : null
    // });
  };

  const handleDownloadFormatChange = (value: DownloadFileType) => {
    setDownloadFileType(value);
    // logFormState('Download Format Updated', { downloadFileType: value });
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
    selectedOnlineSheets,
    setFiles,
    setQuery: handleQueryChange,
    setOutputType: handleOutputTypeChange,
    setOutputUrl,
    setDownloadFileType: handleDownloadFormatChange,
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
    handleOnlineSheetSelection: inputPicker.handleSheetNameSelection,
    showOnlineSheetSelector: inputPicker.showSheetSelector,
    setShowOnlineSheetSelector: inputPicker.setShowSheetSelector,
    destinationPicker,
  } as const;
}