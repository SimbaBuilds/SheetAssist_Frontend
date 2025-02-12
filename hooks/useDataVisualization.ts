import type { SeabornSequentialPalette } from '@/lib/types/dashboard'

import { useState, useRef } from 'react'
import { processDataVisualization } from '@/lib/services/data_visualization'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  validateVisualizationFile,
  formatTitleKey,
  formatDisplayTitle,
  getUrlProvider
} from '@/lib/utils/dashboard-utils'
import type { 
  VisualizationOptions,
  InputSheet,
  VisualizationResult,
} from '@/lib/types/dashboard'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { usePicker } from '@/hooks/usePicker'

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
  const [selectedVisualizationSheet, setSelectedVisualizationSheet] = useState<InputSheet | null>(null);
  const [isVisualizationUrlProcessing, setIsVisualizationUrlProcessing] = useState(false)
  const [showVisualizationDialog, setShowVisualizationDialog] = useState(false)
  const [visualizationAbortController, setVisualizationAbortController] = useState<AbortController | null>(null)
  const visualizationFileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuth()
  const supabase = createClient()
  const { 
    hasReachedVisualizationLimit, 
    hasReachedOverageLimit, 
    currentPlan 
  } = useUsageLimits()

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

      let updatedSheets = data?.recent_sheets || [];

      // Remove any existing entries for this URL and sheet combination
      updatedSheets = updatedSheets.filter((sheet: { url: string, sheet_name: string }) => 
        !(sheet.url === url && sheet.sheet_name === sheetName)
      );

      // Get provider from URL
      const provider = getUrlProvider(url);
      if (!provider) {
        throw new Error('Invalid URL provider');
      }

      // Calculate token expiry (30 minutes from now)
      const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Add new sheet entry to the beginning
      updatedSheets = [
        { 
          url, 
          doc_name: docName, 
          sheet_name: sheetName,
          provider,
          picker_token: pickerToken || '',
          token_expiry: tokenExpiry
        },
        ...updatedSheets
      ].slice(0, 6); // Keep only the 6 most recent

      await supabase
        .from('user_usage')
        .upsert({ 
          user_id: user.id,
          recent_sheets: updatedSheets
        });

      // Update sheetTitles
      const titleKey = formatTitleKey(url, sheetName);
      const displayTitle = formatDisplayTitle(docName, sheetName);

      setSheetTitles((prev) => ({
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
    onSelect: (inputSheet) => {
      setSelectedVisualizationSheet(inputSheet);
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

  const handleVisualizationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVisualizationFileError(null)
    setVisualizationSheetUrl('') // Clear URL when file is selected

    const file = e.target.files?.[0]
    if (!file) return

    const error = validateVisualizationFile(file)
    if (error) {
      setVisualizationFileError({ file, error })
      return
    }

    setVisualizationFile(file)
  }

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
            doc_name: selectedVisualizationSheet.doc_name
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

  const handleVisualizationOptionChange = (value: 'surprise' | 'custom') => {
    if (value === 'surprise') {
      setCustomInstructions(undefined)
    } else if (value === 'custom') {
      setCustomInstructions('')  // Initialize with empty string for custom mode
    }
  }

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
    setColorPalette,
    setCustomInstructions,
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
