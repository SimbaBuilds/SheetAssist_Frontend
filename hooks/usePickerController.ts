import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFilePicker } from '@/hooks/useFilePicker';
import { getSheetNames } from '@/lib/services/get_sheet_names';
import type { OnlineSheet } from '@/lib/types/dashboard';
import { getUrlProvider, isTokenExpired } from '@/lib/utils/dashboard-utils';
import { TOKEN_EXPIRY } from '@/lib/constants/token_expiry';
import { toast } from '@/components/ui/use-toast';

type PickerType = 'input' | 'output' | 'visualization';
type Provider = 'google' | 'microsoft' | 'recent';

interface UsePickerProps {
  type: PickerType;
  onSelect: (inputUrl: OnlineSheet) => void;
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
    
  };

  const launchProviderPicker = async (provider: Provider, selectedItem?: OnlineSheet) => {
    if (!user?.id) {
      onError('User not authenticated');
      return;
    }

    // Handle recent selection
    if (provider === 'recent' && selectedItem) {
      console.log('[launchProviderPicker] Checking token expiry for recent sheet:', {
        url: selectedItem.url,
        sheet_name: selectedItem.sheet_name,
        token_expiry: selectedItem.token_expiry
      });

      if (isTokenExpired(selectedItem.token_expiry)) {
        // Re-launch picker with the original provider
        if (selectedItem.provider && (selectedItem.provider === 'google' || selectedItem.provider === 'microsoft')) {
          toast({
            title: "Access Expired",
            description: `Our access to your sheets expires ${TOKEN_EXPIRY} minutes after your selection.`,
            className: "bg-destructive text-destructive-foreground"
          });
          return launchProviderPicker(selectedItem.provider);
        } else {
          onError('Invalid provider for expired token');
          return;
        }
      }

      onSelect(selectedItem);
      return;
    }

    if (provider !== 'recent' && onPermissionRedirect?.(provider)) {
      return;
    }

    try {
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

        if (!pickerResult.success || !pickerResult.url) {
          throw new Error(pickerResult.error || 'Failed to select file');
        }

        if (!pickerResult.accessToken) {
          throw new Error('No access token available');
        }
        const workbook = await getSheetNames(pickerResult.url, provider, pickerResult.accessToken);
        
        if (!workbook.success || workbook.error) {
          // Check for browser cache related errors
          if (workbook.error?.toLowerCase().includes('browser cache and cookies')) {
            toast({
              title: "Access Error",
              description: `Error accessing ${provider} sheets. Please clear your browser cache and cookies and try again.`,
              className: "bg-destructive text-destructive-foreground"
            });
            return;
          }
          // Check for Microsoft reconnection error
          if (workbook.error?.includes('Please reconnect your microsoft account')) {
            toast({
              title: "Authentication Error",
              description: "Your Microsoft account connection has expired. Redirecting to reconnect.",
              className: "bg-destructive text-destructive-foreground"
            });
            // Add 3 second delay before redirect
            setTimeout(() => {
              window.location.href = '/auth/setup-permissions?provider=microsoft&reauth=true';
            }, 3000);
            return;
          }
          throw new Error(workbook.error || 'Failed to get sheet names');
        }

        if (!workbook.sheet_names?.length) {
          throw new Error('No sheets found in the document');
        }

        setIsProcessing(false);

        if (workbook.sheet_names.length === 1) {
          const OnlineSheet: OnlineSheet = {
            url: pickerResult.url,
            sheet_name: workbook.sheet_names[0],
            doc_name: workbook.doc_name,
            picker_token: pickerResult.accessToken,
            token_expiry: new Date(Date.now() + TOKEN_EXPIRY * 60 * 1000).toISOString(),
            provider: provider
          };
          onSelect(OnlineSheet);
          updateRecentSheets?.(pickerResult.url, workbook.sheet_names[0], workbook.doc_name, pickerResult.accessToken);
        } else {
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
    
    if (!selectedSheetUrl || !sheetName) {
      onError('Missing URL or sheet name');
      return;
    }

    try {
      const OnlineSheet: OnlineSheet = {
        url: selectedSheetUrl,
        sheet_name: sheetName,
        doc_name: workbookInfo?.doc_name || '',
        picker_token: workbookInfo?.picker_token || null,
        token_expiry: new Date(Date.now() + TOKEN_EXPIRY * 60 * 1000).toISOString(),
        provider: getUrlProvider(selectedSheetUrl)
      };

      setShowSheetSelector(false);
      onSelect(OnlineSheet);
      
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