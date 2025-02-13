import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFilePicker } from '@/hooks/useFilePicker';
import { getSheetNames } from '@/lib/services/get_sheet_names';
import type { InputSheet } from '@/lib/types/dashboard';

type PickerType = 'input' | 'output' | 'visualization';
type Provider = 'google' | 'microsoft' | 'recent';

interface UsePickerProps {
  type: PickerType;
  onSelect: (inputUrl: InputSheet) => void;
  onError: (error: string) => void;
  updateRecentSheets?: (url: string, sheetName: string, docName: string, pickerToken?: string) => void;
  onPermissionRedirect?: (provider: 'google' | 'microsoft') => boolean;
}

export function usePicker({ type, onSelect, onError, updateRecentSheets, onPermissionRedirect }: UsePickerProps) {
  const { user } = useAuth();
  const { launchPicker } = useFilePicker();
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetUrl, setSelectedSheetUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [workbookInfo, setWorkbookInfo] = useState<{ doc_name: string; picker_token?: string | null } | null>(null);
  const [pickerActive, setPickerActive] = useState(false);

  const handleMultipleSheets = (url: string, sheets: string[], docName: string, pickerToken?: string) => {
    console.log(`[${type}] Setting multiple sheets state:`, {
      url,
      sheetsCount: sheets.length,
      docName
    });
    
    // Update all states synchronously
    setSelectedSheetUrl(url);
    setWorkbookInfo({ doc_name: docName, picker_token: pickerToken });
    setAvailableSheets(sheets);
    setShowSheetSelector(true);
    setPickerActive(false); // Important: Reset picker active when showing sheet selector
    
    console.log(`[${type}] Sheet selector states updated:`, {
      url,
      sheets,
      docName,
      selectorOpen: true,
      pickerActive: false
    });
  };

  const launchProviderPicker = async (provider: Provider, selectedItem?: InputSheet) => {
    if (!user?.id) {
      onError('User not authenticated');
      return;
    }

    // Handle recent selection
    if (provider === 'recent' && selectedItem) {
      onSelect(selectedItem);
      return;
    }

    if (provider !== 'recent' && onPermissionRedirect?.(provider)) {
      return;
    }

    try {
      console.log(`[${type}] Starting provider picker for ${provider}`);
      setPickerActive(true);
      setIsProcessing(true);
      
      // Reset states
      setShowSheetSelector(false);
      setAvailableSheets([]);
      setSelectedSheetUrl('');
      setWorkbookInfo(null);
      
      // Only call launchPicker for google or microsoft
      if (provider !== 'recent') {
        const pickerResult = await launchPicker(provider);
        console.log(`[${type}] Picker result:`, pickerResult);

        if (!pickerResult.success || !pickerResult.url) {
          throw new Error(pickerResult.error || 'Failed to select file');
        }

        console.log(`[${type}] Getting sheet names for URL:`, pickerResult.url);
        if (!pickerResult.accessToken) {
          throw new Error('No access token available');
        }
        const workbook = await getSheetNames(pickerResult.url, provider, pickerResult.accessToken);
        console.log(`[${type}] Workbook response:`, workbook);
        
        if (!workbook.success || workbook.error) {
          throw new Error(workbook.error || 'Failed to get sheet names');
        }

        if (!workbook.sheet_names?.length) {
          throw new Error('No sheets found in the document');
        }

        setIsProcessing(false);

        if (workbook.sheet_names.length === 1) {
          console.log(`[${type}] Single sheet found, auto-selecting`);
          const inputSheet: InputSheet = {
            url: pickerResult.url,
            sheet_name: workbook.sheet_names[0],
            doc_name: workbook.doc_name,
            picker_token: pickerResult.accessToken
          };
          onSelect(inputSheet);
          updateRecentSheets?.(pickerResult.url, workbook.sheet_names[0], workbook.doc_name, pickerResult.accessToken);
        } else {
          console.log(`[${type}] Multiple sheets found (${workbook.sheet_names.length}), showing selector`);
          handleMultipleSheets(pickerResult.url, workbook.sheet_names, workbook.doc_name, pickerResult.accessToken);
        }
      }
    } catch (error) {
      console.error(`[${type}] Error in launchProviderPicker:`, error);
      onError(error instanceof Error ? error.message : 'Failed to process file selection');
      setIsProcessing(false);
    } finally {
      setPickerActive(false);
    }
  };

  const handleSheetNameSelection = async (sheetName: string) => {
    console.log(`[${type}] handleSheetNameSelection called:`, {
      sheetName,
      url: selectedSheetUrl,
      hasWorkbookInfo: !!workbookInfo
    });
    
    if (!selectedSheetUrl || !sheetName) {
      onError('Missing URL or sheet name');
      return;
    }

    try {
      const inputSheet: InputSheet = {
        url: selectedSheetUrl,
        sheet_name: sheetName,
        doc_name: workbookInfo?.doc_name || '',
        picker_token: workbookInfo?.picker_token
      };

      setShowSheetSelector(false);
      onSelect(inputSheet);
      
      if (workbookInfo?.doc_name) {
        updateRecentSheets?.(selectedSheetUrl, sheetName, workbookInfo.doc_name, workbookInfo.picker_token || undefined);
      }
    } catch (error) {
      console.error(`[${type}] Error in handleSheetNameSelection:`, error);
      onError(error instanceof Error ? error.message : 'Failed to process sheet selection');
    }
  };

  return {
    launchProviderPicker,
    handleSheetNameSelection,
    showSheetSelector,
    setShowSheetSelector,
    availableSheets,
    isProcessing,
    selectedSheetUrl,
    setSelectedSheetUrl,
    workbookInfo,
    pickerActive
  };
} 