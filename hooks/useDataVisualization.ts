import type { SeabornSequentialPalette } from '@/lib/types/dashboard'

import { useState } from 'react'
import { useFilePicker } from '@/hooks/useFilePicker'
import { processDataVisualization } from '@/lib/services_endpoints/data_visualization'
import { getDocumentTitle } from '@/lib/services_endpoints/get_document_title'
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
  const { verifyFileAccess, launchPicker } = useFilePicker()

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
          setSelectedVisualizationPair({ url, sheet_name });
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
      const isValid = await handleUrlValidation(
        value,
        verifyFileAccess,
        launchPicker,
        setVisualizationUrlError
      );

      if (!isValid) {
        setVisualizationUrl('');
        setIsVisualizationUrlProcessing(false);
        return;
      }

      setVisualizationUrl(value);

      const workbook = await getDocumentTitle(value);
      if (!workbook?.success) {
        throw new Error(workbook?.error || 'Failed to fetch document information');
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

        setSelectedVisualizationPair({ url: value, sheet_name: sheet });
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
      let cachedWorkbook = workbookCache[url];

      if (!cachedWorkbook || !cachedWorkbook.doc_name) {
        const workbook = await getDocumentTitle(url);
        if (!workbook?.success) {
          throw new Error(workbook?.error || 'Failed to fetch document information');
        }
        
        cachedWorkbook = {
          doc_name: workbook.doc_name,
          sheet_names: workbook.sheet_names ?? [],
        };

        setWorkbookCache(prev => ({
          ...prev,
          [url]: cachedWorkbook,
        }));
      }

      const titleKey = formatTitleKey(url, sheet);
      const displayTitle = formatDisplayTitle(cachedWorkbook.doc_name, sheet);

      setDocumentTitles(prev => ({
        ...prev,
        [titleKey]: displayTitle,
      }));

      await updateRecentUrls(url, sheet, cachedWorkbook.doc_name);
      
      setSelectedVisualizationPair({ url, sheet_name: sheet });
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
      
      // Log the cancellation
      const user = await supabase.auth.getUser()
      const userId = user.data.user?.id
      if (userId) {
        try {
          await supabase.from('request_log').insert({
            user_id: userId,
            query: 'visualization_cancelled',
            doc_names: selectedVisualizationPair ? [selectedVisualizationPair.url] : [],
            file_names: visualizationFile ? [visualizationFile.name] : [],
            status: 'canceled',
            success: false
          })
        } catch (error) {
          console.error('Error logging cancellation:', error)
        }
      }
    }
  }

  const handleVisualizationSubmit = async () => {
    setVisualizationError('')
    setVisualizationResult(null)

    if (!selectedVisualizationPair?.url && !visualizationFile) {
      setVisualizationError('Please provide either a URL or file')
      return
    }

    if (!colorPalette) {
      setVisualizationError('Please select a color palette')
      return
    }

    // Clean up any existing abort controller
    if (visualizationAbortController) {
      visualizationAbortController.abort()
      setVisualizationAbortController(null)
    }

    // Create new AbortController
    const controller = new AbortController()
    setVisualizationAbortController(controller)

    setIsVisualizationProcessing(true)
    setShowVisualizationDialog(true)

    try {
      const options: VisualizationOptions = {
        chart_type: 'auto',
        color_palette: colorPalette || undefined,
        custom_instructions: customInstructions || undefined
      }

      const webUrls = selectedVisualizationPair 
        ? [{ 
            url: selectedVisualizationPair.url, 
            sheet_name: selectedVisualizationPair.sheet_name 
          }] 
        : []
      
      const files = visualizationFile ? [visualizationFile] : undefined

      const result = await processDataVisualization(
        options,
        webUrls,
        files,
        controller.signal
      )
      
      // Add debugging
      console.log('Visualization result type:', typeof result.image_data)
      console.log('Visualization result length:', result.image_data?.length)
      console.log('Visualization result preview:', result.image_data?.substring(0, 100))
      
      // Only update if request wasn't cancelled
      if (!controller.signal.aborted) {
        if (!result.image_data) {
          setVisualizationError('No image data received from server')
          return
        }
        setVisualizationResult(result)
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'AbortError') {
        console.log('Request was cancelled')
        return
      }
      console.error('Error processing visualization:', error)
      setVisualizationError('An error occurred while processing your request')
    } finally {
      // Only clean up if not aborted
      if (!controller.signal.aborted) {
        setIsVisualizationProcessing(false)
        setShowVisualizationDialog(false)
        setVisualizationAbortController(null)
      }
    }
  }

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
