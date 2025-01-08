import type { SeabornSequentialPalette } from '@/lib/types/dashboard'

import { useState } from 'react'
import { processDataVisualization } from '@/lib/services/data_visualization'
import { getDocumentTitle } from '@/lib/services/get_document_title'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  validateVisualizationFile,
  formatTitleKey,
  formatDisplayTitle,
  handleUrlValidation,
} from '@/lib/utils/dashboard-utils'
import type { 
  VisualizationOptions,
  InputUrl,
  VisualizationResult,
} from '@/lib/types/dashboard'
import { useUsageLimits } from '@/hooks/useUsageLimits'

interface FileError {
  file: File;
  error: string;
}

interface SequentialPalette {
  name: string;
  description: string;
  preview: string[];
}

interface UseDataVisualizationProps {
  documentTitles: { [key: string]: string };
  setDocumentTitles: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export function useDataVisualization({ documentTitles, setDocumentTitles }: UseDataVisualizationProps) {
  const [workbookCache, setWorkbookCache] = useState<{ [url: string]: { doc_name: string, sheet_names: string[] } }>({});
  const [isVisualizationExpanded, setIsVisualizationExpanded] = useState(false)
  const [visualizationUrl, setVisualizationUrl] = useState('')
  const [visualizationFile, setVisualizationFile] = useState<File | null>(null)
  const [visualizationSheet, setVisualizationSheet] = useState<string | null>(null)
  const [colorPalette, setColorPalette] = useState<SeabornSequentialPalette | ''>('')
  const [customInstructions, setCustomInstructions] = useState<string | undefined>()
  const [isVisualizationProcessing, setIsVisualizationProcessing] = useState(false)
  const [isRetrievingVisualizationData, setIsRetrievingVisualizationData] = useState(false)
  const [visualizationError, setVisualizationError] = useState('')
  const [visualizationFileError, setVisualizationFileError] = useState<FileError | null>(null)
  const [visualizationUrlError, setVisualizationUrlError] = useState<string | null>(null)
  const [visualizationResult, setVisualizationResult] = useState<VisualizationResult | null>(null)
  const [showVisualizationSheetSelector, setShowVisualizationSheetSelector] = useState(false)
  const [visualizationSheets, setVisualizationSheets] = useState<string[]>([])
  const [visualizationUrls, setVisualizationUrls] = useState<string[]>(['']);
  const [selectedVisualizationPair, setSelectedVisualizationPair] = useState<InputUrl | null>(null);
  const [isVisualizationUrlProcessing, setIsVisualizationUrlProcessing] = useState(false)
  const [showVisualizationDialog, setShowVisualizationDialog] = useState(false)
  const [visualizationAbortController, setVisualizationAbortController] = useState<AbortController | null>(null)
  const [selectedPaletteType, setSelectedPaletteType] = useState<'sequential'>('sequential');

  const { user } = useAuth()
  const supabase = createClient()
  const { 
    hasReachedVisualizationLimit, 
    hasReachedOverageLimit, 
    currentPlan 
  } = useUsageLimits()

  const updateRecentUrls = async (url: string, sheetName: string, docName: string) => {
    if (!user?.id || !url.trim() || !sheetName.trim() || !docName.trim()) {
      console.error('Missing required data for updateRecentUrls:', { url, sheetName, docName })
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('recent_sheets')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      let updatedUrls = data?.recent_sheets || []

      // Remove any existing entries for this URL and sheet combination
      updatedUrls = updatedUrls.filter((sheet: { url: string, sheet_name: string }) => 
        !(sheet.url === url && sheet.sheet_name === sheetName)
      )

      // Add new sheet entry to the beginning
      updatedUrls = [
        { url, doc_name: docName, sheet_name: sheetName },
        ...updatedUrls
      ].slice(0, 6) // Keep only the 6 most recent

      await supabase
        .from('user_usage')
        .upsert({ 
          user_id: user.id,
          recent_sheets: updatedUrls
        })

      // Update documentTitles
      const titleKey = formatTitleKey(url, sheetName)
      const displayTitle = formatDisplayTitle(docName, sheetName)

      setDocumentTitles((prev) => ({
        ...prev,
        [titleKey]: displayTitle,
      }))
    } catch (error) {
      console.error('Error updating recent URLs:', error)
    }
  }

  const handleVisualizationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVisualizationFileError(null)
    setVisualizationUrl('') // Clear URL when file is selected

    const file = e.target.files?.[0]
    if (!file) return

    const error = validateVisualizationFile(file)
    if (error) {
      setVisualizationFileError({ file, error })
      return
    }

    setVisualizationFile(file)
  }

  const handleVisualizationUrlChange = async (value: string, fromDropdown = false) => {
    setVisualizationUrlError(null);
    setVisualizationFile(null);
    setVisualizationUrls([value]);

    if (!value) return;

    if (fromDropdown) {
      const titleKey = value;
      if (documentTitles[titleKey]) {
        try {
          const { url, sheet_name } = JSON.parse(titleKey);
          const displayTitle = documentTitles[titleKey];
          const doc_name = displayTitle.split(' - ')[0];
          
          const visualizationPair: InputUrl = { 
            url, 
            sheet_name,
            doc_name
          };
          
          setSelectedVisualizationPair(visualizationPair);
          setVisualizationUrls(['']);
          setVisualizationUrl(url);
          return;
        } catch (error) {
          console.error('Error parsing title key:', error);
        }
      }
    }

    setIsVisualizationUrlProcessing(true);
    try {
      const isValid = handleUrlValidation(value, setVisualizationUrlError);
      if (!isValid) {
        setVisualizationUrl('');
        setIsVisualizationUrlProcessing(false);
        return;
      }

      setVisualizationUrl(value);
      const workbook = await getDocumentTitle(value);
      
      if (workbook?.error) {
        setVisualizationUrlError(workbook.error);
        setVisualizationUrls(['']);
        return;
      }

      const sheetNames = workbook.sheet_names ?? [];
      setVisualizationSheets(sheetNames);

      setWorkbookCache(prev => ({
        ...prev,
        [value]: {
          doc_name: workbook.doc_name,
          sheet_names: sheetNames,
        },
      }));

      if (sheetNames.length === 1) {
        const sheet = sheetNames[0];
        const titleKey = formatTitleKey(value, sheet);
        const displayTitle = formatDisplayTitle(workbook.doc_name, sheet);

        setDocumentTitles(prev => ({
          ...prev,
          [titleKey]: displayTitle,
        }));

        // Create visualization pair with doc_name
        const visualizationPair: InputUrl = {
          url: value,
          sheet_name: sheet,
          doc_name: workbook.doc_name // Include doc_name from API response
        };
        setSelectedVisualizationPair(visualizationPair);
        setVisualizationUrls(['']);
        
        await updateRecentUrls(value, sheet, workbook.doc_name);
      } else if (sheetNames.length > 1) {
        setShowVisualizationSheetSelector(true);
      }
    } catch (error) {
      console.error('Error in handleVisualizationUrlChange:', error);
      setVisualizationUrlError('Failed to process URL');
      setVisualizationUrl('');
    } finally {
      setIsVisualizationUrlProcessing(false);
    }
  };

  const handleVisualizationSheetSelection = async (url: string, sheet: string) => {
    setShowVisualizationSheetSelector(false);
    setIsRetrievingVisualizationData(true);

    try {
      const workbook = await getDocumentTitle(url);
      if (!workbook?.success) {
        throw new Error(workbook?.error || 'Failed to fetch document information');
      }

      // Create visualization pair with doc_name from API response
      const visualizationPair: InputUrl = { 
        url, 
        sheet_name: sheet,
        doc_name: workbook.doc_name
      };
      
      setSelectedVisualizationPair(visualizationPair);

      const titleKey = formatTitleKey(url, sheet);
      const displayTitle = formatDisplayTitle(workbook.doc_name, sheet);

      setDocumentTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle,
      }));

      await updateRecentUrls(url, sheet, workbook.doc_name);
      
      setVisualizationUrls(['']);
      setVisualizationUrl(url);
    } catch (error) {
      console.error('Failed to retrieve workbook information:', error);
      setVisualizationUrlError('Failed to retrieve workbook information');
    } finally {
      setIsRetrievingVisualizationData(false);
    }
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

    if (!selectedVisualizationPair?.url && !visualizationFile) {
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

      const webUrls = selectedVisualizationPair 
        ? [{ 
            url: selectedVisualizationPair.url, 
            sheet_name: selectedVisualizationPair.sheet_name,
            doc_name: selectedVisualizationPair.doc_name
          }] 
        : [];
      
      const files = visualizationFile ? [visualizationFile] : undefined;

      const result = await processDataVisualization(
        options,
        webUrls,
        files,
        controller.signal
      );

      // Only update if request wasn't cancelled
      if (!controller.signal.aborted) {
        if (result.error) {
          setVisualizationError(result.message || result.error);
          return;
        }
        
        if (!result.image_data) {
          setVisualizationError(result.message || 'No image data received from server');
          return;
        }
        
        setVisualizationResult(result);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'AbortError') {
        setVisualizationError('Request was cancelled');
        return;
      }
      console.error('Error processing visualization:', error);
      setVisualizationError(error instanceof Error ? error.message : 'An error occurred while processing your request');
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
    visualizationUrl,
    visualizationFile,
    visualizationSheet,
    colorPalette,
    customInstructions,
    isVisualizationProcessing,
    isRetrievingVisualizationData,
    visualizationError,
    visualizationFileError,
    visualizationUrlError,
    visualizationResult,
    showVisualizationSheetSelector,
    visualizationSheets,
    setIsVisualizationExpanded,
    setVisualizationUrl,
    setColorPalette,
    setCustomInstructions,
    setShowVisualizationSheetSelector,
    handleVisualizationFileChange,
    handleVisualizationUrlChange,
    handleVisualizationSheetSelection,
    handleVisualizationSubmit,
    handleVisualizationOptionChange,
    isVisualizationUrlProcessing,
    setVisualizationSheet,
    visualizationUrls,
    selectedVisualizationPair,
    setSelectedVisualizationPair,
    showVisualizationDialog,
    setShowVisualizationDialog,
    handleVisualizationCancel,
  } as const
}
