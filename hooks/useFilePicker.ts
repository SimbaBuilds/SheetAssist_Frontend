import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { FilePermissions } from '@/types/supabase_tables'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface FileInfo {
  fileId: string
  provider: 'google' | 'microsoft'
}

interface PickerResult {
  fileId: string
  url: string
  success: boolean
  error?: string
}

declare global {
  interface Window {
    google: any
    gapi: any
    OneDrive: any
  }
}

export function useFilePicker() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  // Extract file ID and provider from URL
  function extractFileInfo(url: string): FileInfo | null {
    try {
      const urlObj = new URL(url)
      
      // Google Drive/Sheets URL patterns
      if (urlObj.hostname.includes('google.com')) {
        // Handle various Google URL formats
        const patterns = {
          // New Google Sheets URL format
          sheets: /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
          // General Drive URL format
          drive: /\/file\/d\/([a-zA-Z0-9-_]+)/,
          // Alternative format with ID in query params
          alt: /id=([a-zA-Z0-9-_]+)/
        }

        for (const [key, pattern] of Object.entries(patterns)) {
          const match = url.match(pattern)
          if (match?.[1]) {
            return {
              fileId: match[1],
              provider: 'google'
            }
          }
        }
      }
      
      // Microsoft Excel Online/OneDrive URL patterns
      if (urlObj.hostname.includes('live.com') || 
          urlObj.hostname.includes('office.com') || 
          urlObj.hostname.includes('sharepoint.com')) {
        // Handle various Microsoft URL formats
        const patterns = {
          // OneDrive personal URL format
          onedrive: /resid=([a-zA-Z0-9!%]+)/i,
          // SharePoint/Business URL format
          sharepoint: /id=([a-zA-Z0-9!%]+)/i,
          // Alternative format with ID in path
          alt: /([a-zA-Z0-9!%]+)\?/
        }

        for (const [key, pattern] of Object.entries(patterns)) {
          const match = url.match(pattern)
          if (match?.[1]) {
            return {
              fileId: decodeURIComponent(match[1]),
              provider: 'microsoft'
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting file info:', error)
      return null
    }
  }

  // Check if user has permission for the file
  async function checkFilePermission(fileId: string, provider: 'google' | 'microsoft'): Promise<boolean> {
    if (!user?.id) {
      console.error('No user ID available for permission check')
      return false
    }

    try {
      const { data, error } = await supabase
        .from('file_permissions')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', user.id)
        .eq('provider', provider)
        .single()

      if (error) {
        console.error('Error checking file permission:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('Error in checkFilePermission:', error)
      return false
    }
  }

  // Store new file permission
  async function storeFilePermission(fileId: string, provider: 'google' | 'microsoft'): Promise<boolean> {
    if (!user?.id) {
      console.error('No user ID available for storing permission')
      return false
    }

    try {
      const { error } = await supabase
        .from('file_permissions')
        .insert({
          user_id: user.id,
          file_id: fileId,
          provider
        })

      if (error) {
        console.error('Error storing file permission:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in storeFilePermission:', error)
      return false
    }
  }

  // Main function to handle URL verification
  async function verifyFileAccess(url: string): Promise<{
    hasPermission: boolean
    fileInfo: FileInfo | null
    error?: string
  }> {
    console.log('[useFilePicker] Starting file access verification for URL:', url);
    const fileInfo = extractFileInfo(url)

    if (!fileInfo) {
      console.log('[useFilePicker] Invalid URL');
      return {
        hasPermission: false,
        fileInfo: null,
        error: 'Invalid URL'
      }
    }

    try {
      console.log('[useFilePicker] Checking access token for provider:', fileInfo.provider);
      const { data: accessData, error: tokenError } = await supabase
        .from('user_documents_access')
        .select('access_token')
        .eq('user_id', user?.id)
        .eq('provider', fileInfo.provider)
        .single()

      if (tokenError || !accessData?.access_token) {
        return handleAuthError(
          tokenError || new Error('No access token found'),
          fileInfo.provider,
          {
            hasPermission: false,
            fileInfo: null,
            error: 'Authentication expired'
          }
        );
      }

      const hasPermission = await checkFilePermission(fileInfo.fileId, fileInfo.provider)

      return {
        hasPermission,
        fileInfo,
        error: hasPermission ? undefined : 'Permission not found'
      }
    } catch (error) {
      console.log('[useFilePicker] Error in verifyFileAccess:', error);
      if (error instanceof Error && 
          (error.message.includes('authentication expired') || 
           error.message.includes('invalid_grant') ||
           error.message.includes('invalid_token'))) {
        return handleAuthError(
          error,
          fileInfo.provider,
          {
            hasPermission: false,
            fileInfo: null,
            error: 'Authentication expired'
          }
        );
      }

      console.error('Error verifying file access:', error)
      return {
        hasPermission: false,
        fileInfo,
        error: 'Failed to verify file access'
      }
    }
  }

  // Load Google Picker API
  const loadGooglePickerApi = async (): Promise<void> => {
    if (typeof window === 'undefined') return

    if (!window.gapi) {
      await new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = resolve
        document.body.appendChild(script)
      })
    }

    await new Promise((resolve) => {
      window.gapi.load('picker', resolve)
    })
  }

  // Add cleanup function for Google API
  const cleanupGoogleApi = () => {
    console.log('[useFilePicker] Starting Google API cleanup');
    if (typeof window !== 'undefined') {
      // Remove Google API script
      const gapiScript = document.querySelector('script[src*="apis.google.com"]');
      if (gapiScript) {
        console.log('[useFilePicker] Removing Google API script');
        gapiScript.remove();
      } else {
        console.log('[useFilePicker] No Google API script found to remove');
      }
      
      // Clear any Google API instances
      if (window.gapi) {
        console.log('[useFilePicker] Clearing window.gapi');
        delete window.gapi;
      }
      if (window.google?.picker) {
        console.log('[useFilePicker] Clearing window.google.picker');
        delete window.google.picker;
      }
    }
    console.log('[useFilePicker] Google API cleanup completed');
  };

  // Single auth error handler with type parameter
  const handleAuthError = <T extends { error: string }>(
    error: unknown, 
    provider: string,
    returnValue: T
  ): T => {
    console.log('[useFilePicker] Handling auth error:', { provider, error });
    
    if (provider === 'google') {
      console.log('[useFilePicker] Initiating Google cleanup');
      cleanupGoogleApi();
    }

    toast({
      title: "Authentication Error",
      description: "Your account connection has expired. Please reconnect your account.",
      className: "bg-destructive text-destructive-foreground",
    });

    console.log('[useFilePicker] Setting up redirect timeout');
    setTimeout(() => {
      console.log('[useFilePicker] Executing redirect to /user-account');
      router.replace('/user-account');
    }, 100);
    
    console.log('[useFilePicker] Returning error response');
    return returnValue;
  };

  // Update openGooglePicker
  const openGooglePicker = async (): Promise<PickerResult> => {
    try {
      await loadGooglePickerApi()

      // Get fresh access token
      const { data, error: tokenError } = await supabase
        .from('user_documents_access')
        .select('access_token')
        .eq('user_id', user?.id)
        .eq('provider', 'google')
        .single()

      if (tokenError || !data?.access_token) {
        return handleAuthError(
          tokenError || new Error('No access token found'),
          'google',
          {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired'
          }
        );
      }

      const access_token = data.access_token

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.SPREADSHEETS)
        .setOAuthToken(access_token)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0]
            return {
              fileId: doc.id,
              url: doc.url,
              success: true
            }
          }
        })
        .build()

      picker.setVisible(true)

      return new Promise((resolve) => {
        picker.setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0]
            resolve({
              fileId: doc.id,
              url: doc.url,
              success: true
            })
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve({
              fileId: '',
              url: '',
              success: false,
              error: 'Selection cancelled'
            })
          }
        })
      })
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('authentication expired') || 
           error.message.includes('invalid_grant') ||
           error.message.includes('invalid_token'))) {
        return handleAuthError(
          error,
          'google',
          {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired'
          }
        );
      }
      
      console.error('Error opening Google Picker:', error)
      return {
        fileId: '',
        url: '',
        success: false,
        error: 'Failed to open file picker'
      }
    }
  }

  // Update openMicrosoftPicker
  const openMicrosoftPicker = async (): Promise<PickerResult> => {
    console.log('[openMicrosoftPicker] Starting Microsoft picker initialization');
    
    try {
      // Get fresh access token
      console.log('[openMicrosoftPicker] Fetching access token');
      const { data, error: tokenError } = await supabase
        .from('user_documents_access')
        .select('access_token')
        .eq('user_id', user?.id)
        .eq('provider', 'microsoft')
        .single()

      if (tokenError || !data?.access_token) {
        console.error('[openMicrosoftPicker] Token error:', tokenError);
        return handleAuthError(
          tokenError || new Error('No access token found'),
          'microsoft',
          {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired'
          }
        );
      }

      const access_token = data.access_token
      console.log('[openMicrosoftPicker] Access token retrieved successfully');

      // Load OneDrive picker if not already loaded
      if (!window.OneDrive) {
        console.log('[openMicrosoftPicker] Loading OneDrive.js script');
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://js.live.net/v7.2/OneDrive.js'
          script.onload = () => {
            console.log('[openMicrosoftPicker] OneDrive.js script loaded successfully');
            resolve(null);
          }
          script.onerror = (error) => {
            console.error('[openMicrosoftPicker] Error loading OneDrive.js:', error);
            resolve(null);
          }
          document.body.appendChild(script)
        })
      }

      return new Promise((resolve) => {
        const odOptions = {
          clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
          action: "query",
          multiSelect: false,
          advanced: {
            filter: ".xlsx,.xls",
            redirectUri: `${window.location.origin}/auth/microsoft-permissions-callback`,
            endpointHint: "api.onedrive.com",
            accessToken: access_token,
            viewType: "files",
            sourceInputMode: "files",
            readonlyMode: true,
            // queryParameters: "select=id,webUrl,name"
          },
          success: (response: any) => {
            console.log('[openMicrosoftPicker] Raw response:', response);

            let fileInfo;
            if (Array.isArray(response.value)) {
              fileInfo = response.value[0];
            } else if (response.value) {
              fileInfo = response.value;
            } else {
              fileInfo = response;
            }

            console.log('[openMicrosoftPicker] Processed file info:', fileInfo);

            if (fileInfo) {
              const fileId = fileInfo.id || 
                            fileInfo.driveItem?.id ||
                            fileInfo.resourceId ||
                            (typeof fileInfo === 'string' ? fileInfo : null);

              const webUrl = fileInfo.webUrl ||
                            fileInfo.driveItem?.webUrl ||
                            fileInfo.resourceUrl ||
                            fileInfo.link;

              console.log('[openMicrosoftPicker] Extracted details:', {
                fileId,
                webUrl,
                originalFileInfo: fileInfo
              });

              if (fileId || webUrl) {
                resolve({
                  fileId: fileId || '',
                  url: webUrl || '',
                  success: true
                });
                return;
              }
            }

            console.warn('[openMicrosoftPicker] Could not extract file details from response');
            resolve({
              fileId: '',
              url: '',
              success: false,
              error: 'Could not extract file details'
            });
          },
          cancel: () => {
            console.log('[openMicrosoftPicker] Picker cancelled by user');
            resolve({
              fileId: '',
              url: '',
              success: false,
              error: 'Selection cancelled'
            });
          },
          error: (error: any) => {
            console.error('[openMicrosoftPicker] Picker error:', {
              error,
              message: error?.message,
              stack: error?.stack
            });
            resolve({
              fileId: '',
              url: '',
              success: false,
              error: error.message || 'Failed to open file picker'
            });
          }
        };

        console.log('[openMicrosoftPicker] Launching picker with options:', {
          ...odOptions,
          advanced: {
            ...odOptions.advanced,
            accessToken: '[REDACTED]'
          }
        });

        try {
          window.OneDrive.open(odOptions);
          console.log('[openMicrosoftPicker] Picker launched successfully');
        } catch (error) {
          console.error('[openMicrosoftPicker] Error launching picker:', error);
          resolve({
            fileId: '',
            url: '',
            success: false,
            error: 'Failed to launch picker'
          });
        }
      });
    } catch (error) {
      console.error('[openMicrosoftPicker] Top-level error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof Error && 
          (error.message.includes('authentication expired') || 
           error.message.includes('invalid_grant') ||
           error.message.includes('invalid_token'))) {
        return handleAuthError(
          error,
          'microsoft',
          {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired'
          }
        );
      }
      
      return {
        fileId: '',
        url: '',
        success: false,
        error: 'Failed to open file picker'
      }
    }
  }

  // Update launchPicker
  const launchPicker = async (provider: 'google' | 'microsoft'): Promise<PickerResult> => {
    try {
      const result = await (provider === 'google' ? openGooglePicker() : openMicrosoftPicker())
      
      if (result.success && result.fileId) {
        await storeFilePermission(result.fileId, provider)
      }

      return result
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('authentication expired') || 
           error.message.includes('invalid_grant') ||
           error.message.includes('invalid_token'))) {
        return handleAuthError(
          error,
          provider,
          {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired'
          }
        );
      }

      console.error('Error launching picker:', error)
      return {
        fileId: '',
        url: '',
        success: false,
        error: 'Failed to launch picker'
      }
    }
  }

  return {
    verifyFileAccess,
    storeFilePermission,
    launchPicker
  }
} 