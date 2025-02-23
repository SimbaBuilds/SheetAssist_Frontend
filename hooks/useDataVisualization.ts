import type { SeabornSequentialPalette } from '@/lib/types/dashboard'

import { useState, useRef, useEffect } from 'react'
import { processDataVisualization } from '@/lib/services/data_visualization'
import { OnlineSheet } from '@/lib/types/dashboard'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  validateVisualizationFile,
  formatTitleKey,
  formatDisplayTitle,
  getUrlProvider,
  isTokenExpired,
  logFormState
} from '@/lib/utils/dashboard-utils'
import type { 
  VisualizationOptions,
  VisualizationResult,
} from '@/lib/types/dashboard'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { usePicker } from '@/hooks/usePickerController'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface FileError {
  file: File;
  error: string;
}


interface UseDataVisualizationProps {
  sheetTitles: { [key: string]: string };
  setSheetTitles: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export function useDataVisualization({ sheetTitles, setSheetTitles }: UseDataVisualizationProps) {
  const [isVisualizationExpanded, setIsVisualizationExpanded] = useState(false)
  const [visualizationFile, setVisualizationFile] = useState<File | null>(null)
  const [visualizationSheet, setVisualizationSheet] = useState<string | null>(null)
  const [colorPalette, setColorPalette] = useState<SeabornSequentialPalette | ''>('')
  const [customInstructions, setCustomInstructions] = useState<string | undefined>()
  const [isVisualizationProcessing, setIsVisualizationProcessing] = useState(false)
  const [isRetrievingVisualizationData, setIsRetrievingVisualizationData] = useState(false)
  const [visualizationError, setVisualizationError] = useState('')
  const [visualizationFileError, setVisualizationFileError] = useState<FileError | null>(null)
  const [visualizationResult, setVisualizationResult] = useState<VisualizationResult | null>(null)
  const [selectedVisualizationSheet, setSelectedVisualizationSheet] = useState<OnlineSheet | null>(null)
  const [isVisualizationUrlProcessing, setIsVisualizationUrlProcessing] = useState(false)
  const [showVisualizationDialog, setShowVisualizationDialog] = useState(false)
  const [visualizationAbortController, setVisualizationAbortController] = useState<AbortController | null>(null)
  const [recentUrls, setRecentUrls] = useState<OnlineSheet[]>([])
  const visualizationFileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuth()
  const supabase = createClient()
  const { 
    hasReachedVisualizationLimit, 
    hasReachedOverageLimit, 
    currentPlan 
  } = useUsageLimits()
  const router = useRouter()

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

      // Update recentUrls state - filter out expired and matching sheets
      setRecentUrls((prev: OnlineSheet[]) => {
        const filteredSheets = prev.filter((sheet: OnlineSheet) => 
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

  const {
    launchProviderPicker: handleVisualizationPicker,
    handleSheetNameSelection: handleVisualizationSheetSelection,
    showSheetSelector: showVisualizationSheetSelector,
    setShowSheetSelector: setShowVisualizationSheetSelector,
    availableSheets: visualizationSheets,
    isProcessing: isVisualizationPickerProcessing,
    selectedSheetUrl: visualizationSheetUrl,
    setSelectedSheetUrl: setVisualizationSheetUrl,
    workbookInfo: visualizationWorkbookInfo,
    pickerActive: visualizationPickerActive
  } = usePicker({
    type: 'visualization',
    onSelect: (OnlineSheet) => {
      setSelectedVisualizationSheet(OnlineSheet);
      setVisualizationFile(null); // Clear file when URL is selected
      setVisualizationError(''); // Clear any previous errors
    },
    onError: (error) => {
      setVisualizationError(error);
    },
    updateRecentSheets
  });

  const handleClearVisualization = () => {
    setSelectedVisualizationSheet(null);
    setVisualizationSheet(null);
    setVisualizationSheetUrl('');
  };

  const clearVisualizationFile = () => {
    setVisualizationFile(null);
    setVisualizationFileError(null);
    if (visualizationFileInputRef.current) {
      visualizationFileInputRef.current.value = '';
    }
  };

  //FULL FORMDATA LOGGING
  // useEffect(() => {
  //   // Log visualization form state whenever key elements change
  //   logFormState('Visualization Form State', {
  //     visualizationFile: visualizationFile ? {
  //       name: visualizationFile.name,
  //       size: visualizationFile.size
  //     } : null,
  //     selectedVisualizationSheet: selectedVisualizationSheet ? {
  //       url: selectedVisualizationSheet.url,
  //       sheet_name: selectedVisualizationSheet.sheet_name,
  //       doc_name: selectedVisualizationSheet.doc_name,
  //       picker_token: selectedVisualizationSheet.picker_token,
  //       display_title: sheetTitles[formatTitleKey(selectedVisualizationSheet.url, selectedVisualizationSheet.sheet_name)] || 'Unknown'
  //     } : null,
  //     colorPalette,
  //     customInstructions: customInstructions === undefined ? 'surprise me' : customInstructions
  //   });
  // }, [visualizationFile, selectedVisualizationSheet, colorPalette, customInstructions, sheetTitles]);

  const handleVisualizationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVisualizationFileError(null);
    setVisualizationSheetUrl('');

    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateVisualizationFile(file);
    if (error) {
      setVisualizationFileError({ file, error });
      logFormState('Visualization File Error', { error });
      return;
    }

    setVisualizationFile(file);
    logFormState('Visualization File Updated', {
      file: { name: file.name, size: file.size }
    });
  };

  const handleColorPaletteChange = (value: SeabornSequentialPalette | '') => {
    setColorPalette(value);
    logFormState('Color Palette Updated', { colorPalette: value });
  };

  const handleCustomInstructionsChange = (value: string) => {
    setCustomInstructions(value);
    logFormState('Custom Instructions Updated', { 
      customInstructions: value || 'surprise me'
    });
  };

  const handleVisualizationOptionChange = (value: 'surprise' | 'custom') => {
    if (value === 'surprise') {
      setCustomInstructions(undefined);
    } else if (value === 'custom') {
      setCustomInstructions('');
    }
    logFormState('Visualization Option Updated', { 
      option: value,
      customInstructions: value === 'surprise' ? 'surprise me' : ''
    });
  };

  const handleVisualizationCancel = async () => {
    if (visualizationAbortController) {
      console.log('Cancelling visualization request...')
      visualizationAbortController.abort()
      setVisualizationAbortController(null)
      setIsVisualizationProcessing(false)
      setShowVisualizationDialog(false)
      setVisualizationError('Request was canceled')
    }
  }

  const handleVisualizationSubmit = async () => {
    if (hasReachedVisualizationLimit) {
      const limitMessage = currentPlan === 'free'
        ? 'Monthly visualization limit reached. Please upgrade to Pro for more visualizations.'
        : 'Overage limit reached. Please increase your limit in account settings.';
      setVisualizationError(limitMessage);
      return;
    }

    setVisualizationError('');
    setVisualizationResult(null);

    if (!selectedVisualizationSheet?.url && !visualizationFile) {
      setVisualizationError('Please provide either a URL or file');
      return;
    }

    if (!colorPalette) {
      setVisualizationError('Please select a color palette');
      return;
    }

    // Check for expired tokens and processing time
    if (selectedVisualizationSheet) {
      try {
        // Get estimated processing time (visualization typically takes 1-2 minutes)
        const estimatedMinutes = 2;

        // Check token expiry
        if (selectedVisualizationSheet.token_expiry) {
          const expiryTime = new Date(selectedVisualizationSheet.token_expiry).getTime();
          const minutesUntilExpiry = (expiryTime - Date.now()) / (1000 * 60);

          if (10 > minutesUntilExpiry) {
            console.log('[handleVisualizationSubmit] Estimated processing time exceeds token expiry:', {
              estimatedMinutes,
              minutesUntilExpiry,
              expiryTime
            });

            setVisualizationError(`Estimated processing time (${Math.ceil(estimatedMinutes)} minutes) exceeds token expiry. Please reconnect to ${selectedVisualizationSheet.provider}.`);
            toast({
              title: "Token Expired",
              description: `Estimated processing time exceeds access duration. Redirecting to service re-connect.`,
              className: "bg-destructive text-destructive-foreground"
            });
            // Add 3 second delay before redirect
            setTimeout(() => {
              router.push(`/auth/setup-permissions?provider=${selectedVisualizationSheet.provider}&reauth=true`);
            }, 3000);
            return;
          }
        }
      } catch (error) {
        console.error('[handleVisualizationSubmit] Error checking processing time:', error);
        setVisualizationError('Failed to estimate processing time');
        return;
      }
    }

    // Clean up any existing abort controller
    if (visualizationAbortController) {
      visualizationAbortController.abort();
      setVisualizationAbortController(null);
    }

    // Create new AbortController
    const controller = new AbortController();
    setVisualizationAbortController(controller);

    setIsVisualizationProcessing(true);
    setShowVisualizationDialog(true);


    try {
      const options: VisualizationOptions = {
        chart_type: 'auto',
        color_palette: colorPalette || undefined,
        custom_instructions: customInstructions || undefined
      };

      const webSheets = selectedVisualizationSheet 
        ? [{ 
            url: selectedVisualizationSheet.url, 
            sheet_name: selectedVisualizationSheet.sheet_name,
            doc_name: selectedVisualizationSheet.doc_name,
            picker_token: selectedVisualizationSheet.picker_token || null,
            provider: selectedVisualizationSheet.provider || null
          }] 
        : [];
      
      const files = visualizationFile ? [visualizationFile] : undefined;

      const result = await processDataVisualization(
        options,
        webSheets,
        files,
        controller.signal
      );

      // Only update if request wasn't cancelled
      if (!controller.signal.aborted) {
        if (!result.success) {
          setVisualizationError(result.error || result.message || 'An error occurred');
          return;
        }
        
        if (!result.image_data) {
          setVisualizationError(result.message || 'No image data received from server');
          return;
        }
        
        setVisualizationResult(result);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Error processing visualization:', error);
        setVisualizationError(
          error instanceof Error ? error.message : 'An error occurred while processing your request'
        );
      }
    } finally {
      // Only clean up if not aborted
      if (!controller.signal.aborted) {
        setIsVisualizationProcessing(false);
        setShowVisualizationDialog(false);
        setVisualizationAbortController(null);
      }
    }
  };

  return {
    isVisualizationExpanded,
    visualizationSheetUrl,
    visualizationFile,
    visualizationSheet,
    colorPalette,
    customInstructions,
    isVisualizationProcessing,
    isRetrievingVisualizationData,
    visualizationError,
    visualizationFileError,
    visualizationResult,
    showVisualizationSheetSelector,
    visualizationSheets,
    setIsVisualizationExpanded,
    setVisualizationSheetUrl,
    setColorPalette: handleColorPaletteChange,
    setCustomInstructions: handleCustomInstructionsChange,
    handleVisualizationFileChange,
    handleVisualizationSubmit,
    handleVisualizationOptionChange,
    selectedVisualizationSheet,
    showVisualizationDialog,
    setShowVisualizationDialog,
    handleVisualizationCancel,
    handleVisualizationPicker,
    handleVisualizationSheetSelection,
    setShowVisualizationSheetSelector,
    isVisualizationUrlProcessing,
    setVisualizationSheet,
    isVisualizationPickerProcessing,
    handleClearVisualization,
    clearVisualizationFile,
    visualizationWorkbookInfo,
    visualizationPickerActive,
    visualizationFileInputRef
  } as const
}
