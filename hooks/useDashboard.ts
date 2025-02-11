import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {downloadFile} from '@/lib/services/download_file'
import {getSheetNames} from '@/lib/services/get_sheet_names'
import { createClient } from '@/lib/supabase/client'
import type { DownloadFileType, DashboardInitialData, OutputPreferences, QueryResponse, SheetTitleKey, InputSheet, OnlineSheet, ProcessingState } from '@/lib/types/dashboard'
import { MAX_FILES, MAX_FILE_SIZE } from '@/lib/constants/file-types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { useDataVisualization } from '@/hooks/useDataVisualization'
import {
  getUrlProvider,
  formatTitleKey,
  formatDisplayTitle,
  validateFile,
  handleAuthError,
  handleUrlValidation,
  fetchAndHandleSheets,
  validateCumulativeFileSize
} from '@/lib/utils/dashboard-utils'
import { queryService } from '@/lib/services/process_query'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import axios from 'axios'
import { usePicker } from '@/hooks/usePicker'


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
  const [error, setError] = useState<string | null>(null)
  const [fetchingSheets, setFetchingSheets] = useState(false)
  const [selectedSheetUrl, setSelectedSheetUrl] = useState<string>('')
  const [workbookInfo, setWorkbookInfo] = useState<{ doc_name: string } | null>(null)
  const [inputAvailableSheets, setInputAvailableSheets] = useState<string[]>([])
  const [showInputSheetSelector, setShowInputSheetSelector] = useState(false)
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
  const [documentTitles, setDocumentTitles] = useState<{ [key: string]: string }>({})
  const [availableSheets, setAvailableSheets] = useState<{ [url: string]: string[] }>({})
  const [showSheetSelector, setShowSheetSelector] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const [destinationUrlError, setDestinationUrlError] = useState<string | null>(null)
  const [isLoadingTitles, setIsLoadingTitles] = useState(true)
  const [workbookCache, setWorkbookCache] = useState<{ [url: string]: { doc_name: string, sheet_names: string[] } }>({})
  const [isRetrievingData, setIsRetrievingData] = useState(false)
  const [isRetrievingDestinationData, setIsRetrievingDestinationData] = useState(false)
  const [selectedUrlPairs, setSelectedUrlPairs] = useState<InputSheet[]>([])
  const [selectedOutputSheet, setSelectedOutputSheet] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const [isInitializing, setIsInitializing] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isDestinationUrlProcessing, setIsDestinationUrlProcessing] = useState(false)
  const [isLoadingDestinationTitles, setIsLoadingDestinationTitles] = useState(false)
  const [destinationSheets, setDestinationSheets] = useState<string[]>([])
  const [showDestinationSheetSelector, setShowDestinationSheetSelector] = useState(false)
  const [destinationUrls, setDestinationUrls] = useState<string[]>([''])
  const [selectedDestinationPair, setSelectedDestinationPair] = useState<InputSheet | null>(null)
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

  const updateRecentUrls = async (url: string, sheetName: string, docName: string) => {
    if (!user?.id || !url.trim() || !sheetName.trim() || !docName.trim()) {
      console.error('Missing required data for updateRecentUrls:', { url, sheetName, docName });
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
      
      // Create new sheet entry
      const newSheet: OnlineSheet = {
        url,
        doc_name: docName,
        sheet_name: sheetName
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
      if (!documentTitles[titleKey]) {
        const displayTitle = formatDisplayTitle(docName, sheetName);
        setDocumentTitles(prev => ({
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
      setSelectedUrlPairs(prev => [...prev, inputUrl]);
    },
    onError: (error) => {
      setError(error);
    },
    updateRecentSheets: updateRecentUrls,
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
  const outputPicker = usePicker({
    type: 'output',
    onSelect: (outputUrl) => {
      setSelectedDestinationPair(outputUrl);
      setSelectedOutputSheet(outputUrl.sheet_name || null);
    },
    onError: (error) => {
      setDestinationUrlError(error);
    },
    updateRecentSheets: updateRecentUrls,
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

  const fetchDocumentTitles = async (url: string) => {
    try {
      const workbook = await getSheetNames(url);
      
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

  const handleSheetChange = async (index: number, value: string, fromDropdown = false) => {
    console.log('[useDashboard] handleSheetChange started:', { index, value, fromDropdown });
    setUrlPermissionError(null);
    setUrlValidationError(null);
    setFetchingSheets(true);
    console.log('[useDashboard] fetchingSheets set to true');

    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    if (!value) {
      setFetchingSheets(false);
      return;
    }

    if (fromDropdown) {
      const titleKey = value;
      if (documentTitles[titleKey]) {
        try {
          const { url, sheet_name } = JSON.parse(titleKey);
          const displayTitle = documentTitles[titleKey];
          const doc_name = displayTitle.split(' - ')[0];
          
          const isDuplicate = selectedUrlPairs.some(
            pair => pair.url === url && pair.sheet_name === sheet_name
          );

          if (isDuplicate) {
            toast({
              title: "Already Selected",
              description: "This sheet has already been selected.",
              className: "destructive"
            });
            setUrls(['']);
            setFetchingSheets(false);
            return;
          }

          const newPair: InputSheet = { 
            url, 
            sheet_name,
            doc_name
          };
          
          setSelectedUrlPairs(prev => [...prev, newPair]);
          setUrls(['']);
          setFetchingSheets(false);
          return;
        } catch (error) {
          console.error('[useDashboard] Error parsing title key:', error);
        }
      }
    }

    try {
      console.log('[useDashboard] Validating URL:', value);
      const isValid = handleUrlValidation(value, setUrlValidationError);
      if (!isValid) {
        console.log('[useDashboard] URL validation failed');
        setFetchingSheets(false);
        return;
      }

      setSelectedUrl(value);
      console.log('[useDashboard] Calling getSheetNames for URL:', value);
      const workbook = await getSheetNames(value);
      console.log('[useDashboard] getSheetNames response:', workbook);
      
      if (workbook?.error) {
        console.log('[useDashboard] Workbook error:', workbook.error);
        setUrlPermissionError(workbook.error);
        setUrls(['']);
        return;
      }

      if (workbook?.success) {
        console.log('[useDashboard] Workbook success:', { 
          doc_name: workbook.doc_name, 
          sheet_names: workbook.sheet_names 
        });

        setWorkbookCache(prev => ({
          ...prev,
          [value]: {
            doc_name: workbook.doc_name,
            sheet_names: workbook.sheet_names ?? []
          }
        }));

        const sheetNames = workbook.sheet_names ?? [];
        if (sheetNames.length) {
          console.log('[useDashboard] Setting available sheets:', {
            url: value,
            sheets: sheetNames
          });
          
          setAvailableSheets(prev => ({
            ...prev,
            [value]: sheetNames
          }));

          if (sheetNames.length === 1) {
            console.log('[useDashboard] Single sheet found, auto-selecting');
            const sheet = sheetNames[0];
            const newPair: InputSheet = { url: value, sheet_name: sheet };
            setSelectedUrlPairs(prev => [...prev, newPair]);
            setUrls(['']);
            updateRecentUrls(value, sheet, workbook.doc_name);
          } else {
            console.log('[useDashboard] Multiple sheets found, showing selector');
            setShowSheetSelector(true);
          }
        }
      }
    } catch (error) {
      console.error('[useDashboard] Error handling URL change:', error);
      setError('Failed to process URL');
    } finally {
      console.log('[useDashboard] handleSheetChange completed, fetchingSheets set to false');
      setFetchingSheets(false);
    }
  };

  const handleOutputSheetChange = async (value: string, fromDropdown = false) => {
    setOutputUrl(value);
    setOutputTypeError(null);
    setDestinationUrlError(null);
    setDestinationUrls([value]);
    setFetchingSheets(true);

    if (!value) {
      setFetchingSheets(false);
      return;
    }

    if (fromDropdown) {
      const titleKey = value;
      if (documentTitles[titleKey]) {
        try {
          const { url, sheet_name } = JSON.parse(titleKey);
          const displayTitle = documentTitles[titleKey];
          const doc_name = displayTitle.split(' - ')[0];
          
          const destinationPair: InputSheet = { 
            url, 
            sheet_name,
            doc_name
          };
          
          setSelectedDestinationPair(destinationPair);
          setDestinationUrls(['']);
          setOutputUrl('');
          setFetchingSheets(false);
          return;
        } catch (error) {
          console.error('Error parsing title key:', error);
        }
      }
    }

    try {
      const isValid = await handleUrlValidation(
        value,
        setDestinationUrlError
      );

      if (!isValid) {
        setOutputUrl('');
        return;
      }

      const workbook = await getSheetNames(value);
      
      if (workbook?.error) {
        setDestinationUrlError(workbook.error);
        setOutputUrl('');
        return;
      }

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

          const destinationPair: InputSheet = {
            url: value,
            sheet_name: sheet,
            doc_name: workbook.doc_name
          };
          setSelectedDestinationPair(destinationPair);
          setDestinationUrls(['']);
          
          await updateRecentUrls(value, sheet, workbook.doc_name);
        } else if (sheetNames.length > 1) {
          setShowDestinationSheetSelector(true);
        }
      }
    } catch (error) {
      console.error('Error in handleOutputSheetChange:', error);
      setDestinationUrlError('Failed to process URL');
      setOutputUrl('');
    } finally {
      setFetchingSheets(false);
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
      
      setSelectedDestinationPair(destinationPair);
      setDestinationUrls(['']);

      const titleKey = formatTitleKey(url, sheet);
      const displayTitle = formatDisplayTitle(workbook.doc_name, sheet);
      setDocumentTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle
      }));
      
      await updateRecentUrls(url, sheet, workbook.doc_name);
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
      const isDuplicate = selectedUrlPairs.some(
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
      setSelectedUrlPairs(prev => [...prev, newPair]);
      setUrls(['']);

      const titleKey = formatTitleKey(url, selectedSheet);
      const displayTitle = formatDisplayTitle(cachedWorkbook.doc_name, selectedSheet);
      
      setDocumentTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle
      }));

      await updateRecentUrls(url, selectedSheet, cachedWorkbook.doc_name);

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

    if (outputType === 'online' && !selectedDestinationPair) {
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
        destination_url: selectedDestinationPair?.url,
        sheet_name: selectedOutputSheet,
        doc_name: selectedDestinationPair?.doc_name,
        modify_existing: outputType === 'online' ? allowSheetModification : undefined
      };

      const result = await queryService.processQuery(
        query,
        selectedUrlPairs,
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

  const removeSelectedUrlPair = (index: number) => {
    setSelectedUrlPairs(prev => prev.filter((_, i) => i !== index));
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
    outputUrl,
    isProcessing,
    recentUrls,
    documentTitles,
    setDocumentTitles,
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
    selectedUrlPairs,
    selectedOutputSheet,
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
    removeSelectedUrlPair,
    isUpdating,
    updateSheetModificationPreference,
    handleCancel,
    isDestinationUrlProcessing,
    isRetrievingDestinationData,
    destinationSheets,
    showDestinationSheetSelector,
    setShowDestinationSheetSelector,
    handleDestinationSheetSelection,
    workbookCache,
    setWorkbookCache,
    setSelectedOutputSheet,
    destinationUrls,
    selectedDestinationPair,
    setSelectedDestinationPair,
    processingState,
    handleInputPicker: inputPicker.launchProviderPicker,
    isInputPickerProcessing: inputPicker.isProcessing,
    handleOutputPicker: outputPicker.launchProviderPicker,
    isOutputPickerProcessing: outputPicker.isProcessing,
    permissions,
    fetchingSheets,
    selectedSheetUrl: inputPicker.selectedSheetUrl,
    workbookInfo: inputPicker.workbookInfo,
    inputAvailableSheets: inputPicker.availableSheets,
    handleInputSheetSelection: inputPicker.handleSheetNameSelection,
    showInputSheetSelector: inputPicker.showSheetSelector,
    setShowInputSheetSelector: inputPicker.setShowSheetSelector,
  } as const;
}