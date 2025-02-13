import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
  accessToken?: string
  provider: 'google' | 'microsoft'
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
      // First check if permission already exists
      const { data: existingPermission } = await supabase
        .from('file_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('file_id', fileId)
        .eq('provider', provider)
        .single()

      // If permission already exists, return true without inserting
      if (existingPermission) {
        return true
      }

      // Insert new permission if none exists
      const { error: insertError } = await supabase
        .from('file_permissions')
        .insert({
          user_id: user.id,
          file_id: fileId,
          provider
        })

      if (insertError) {
        console.error('Error storing file permission:', insertError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in storeFilePermission:', error)
      return false
    }
  }

  // Refresh access token
  async function refreshAccessToken(
    provider: 'google' | 'microsoft',
    userId: string,
    supabase: any
  ): Promise<{ success: boolean; access_token?: string }> {
    console.log(`[refreshAccessToken] Attempting to refresh ${provider} token for user ${userId}`);
    
    try {
      // Get current tokens
      const { data: tokenData, error: fetchError } = await supabase
        .from('user_documents_access')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (fetchError || !tokenData) {
        console.error(`[refreshAccessToken] Error fetching tokens:`, fetchError);
        return { success: false };
      }

      const refreshToken = tokenData.refresh_token;
      
      if (provider === 'google') {
        const params = new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        });

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}:${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET}`).toString('base64')}`
          },
          body: params.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[refreshAccessToken] Google refresh failed:', data);
          if (data.error === 'invalid_grant') {
            console.error('[refreshAccessToken] Invalid refresh token, user needs to reauthorize');
            return { success: false };
          }
          throw new Error(data.error_description || 'Failed to refresh token');
        }

        // Update tokens in database - Note Google doesn't return a new refresh token
        const { error: updateError } = await supabase
          .from('user_documents_access')
          .update({
            access_token: data.access_token,
            expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', provider);

        if (updateError) {
          console.error(`[refreshAccessToken] Error updating tokens:`, updateError);
          return { success: false };
        }

        return { success: true, access_token: data.access_token };
      } else if (provider === 'microsoft') {
        const params = new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'email Files.Read Files.ReadWrite.Selected offline_access User.Read',
          redirect_uri: `${window.location.origin}/auth/microsoft-permissions-callback`
        });

        // Remove client secret for SPA compliance
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': window.location.origin
          },
          body: params.toString(),
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[refreshAccessToken] Microsoft refresh failed:', data);
          if (data.error === 'invalid_grant' || data.error === 'invalid_request') {
            console.error('[refreshAccessToken] Token refresh failed, user needs to reauthorize');
            return { success: false };
          }
          throw new Error(data.error_description || 'Failed to refresh token');
        }

        // Update tokens in database
        const { error: updateError } = await supabase
          .from('user_documents_access')
          .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token, // Microsoft may return a new refresh token
            expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', provider);

        if (updateError) {
          console.error(`[refreshAccessToken] Error updating tokens:`, updateError);
          return { success: false };
        }

        return { success: true, access_token: data.access_token };
      }
      
      return { success: false };
    } catch (error) {
      console.error(`[refreshAccessToken] Unexpected error:`, error);
      return { success: false };
    }
  }

  // Main function to handle URL verification
  async function verifyFileAccess(url: string): Promise<{
    hasPermission: boolean
    fileInfo: FileInfo | null
    error?: string
  }> {
    console.log('[verifyFileAccess] Starting file access verification for URL:', url);
    const fileInfo = extractFileInfo(url)

    if (!fileInfo || !user?.id) {
      console.log('[verifyFileAccess] Invalid URL or no user ID');
      return {
        hasPermission: false,
        fileInfo: null,
        error: 'Invalid URL or user not authenticated'
      }
    }

    try {
      // First attempt to get access token
      let { data: accessData, error: tokenError } = await supabase
        .from('user_documents_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', fileInfo.provider)
        .single();

      // If token exists but might be expired, try refreshing
      if (accessData && new Date(accessData.expires_at) < new Date()) {
        console.log('[verifyFileAccess] Token expired, attempting refresh');
        const refreshResult = await refreshAccessToken(fileInfo.provider, user.id, supabase);
        
        if (refreshResult.success && refreshResult.access_token) {
          accessData.access_token = refreshResult.access_token;
        } else {
          return handleAuthError(
            new Error('Token refresh failed'),
            fileInfo.provider,
            {
              hasPermission: false,
              fileInfo: null,
              error: 'Authentication expired'
            }
          );
        }
      }

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
    provider: 'google' | 'microsoft',
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

      // Get access token with potential refresh
      let { data: accessData, error: tokenError } = await supabase
        .from('user_documents_access')
        .select('*')
        .eq('user_id', user?.id)
        .eq('provider', 'google')
        .single();

      if (accessData && new Date(accessData.expires_at) < new Date()) {
        console.log('[openGooglePicker] Token expired, attempting refresh');
        const refreshResult = await refreshAccessToken('google', user?.id!, supabase);
        
        if (refreshResult.success && refreshResult.access_token) {
          accessData.access_token = refreshResult.access_token;
        } else {
          return {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired',
            provider: 'google' as const
          };
        }
      }

      if (tokenError || !accessData?.access_token) {
        return {
          fileId: '',
          url: '',
          success: false,
          error: 'Authentication expired',
          provider: 'google' as const
        };
      }

      const access_token = accessData.access_token;
      console.log('[openGooglePicker] Access token retrieved successfully');

      return new Promise((resolve) => {
        // Create and render a Picker for selecting Google Sheets
        const view = new window.google.picker.View(window.google.picker.ViewId.SPREADSHEETS);
        view.setMimeTypes('application/vnd.google-apps.spreadsheet');

        const picker = new window.google.picker.PickerBuilder()
          .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setAppId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!)
          .setOAuthToken(access_token)
          .addView(view)
          .setOrigin(window.location.protocol + '//' + window.location.host)
          .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!)
          .setCallback((data: any) => {
            console.log('[openGooglePicker] Picker callback data:', data);
            
            if (data.action === window.google.picker.Action.PICKED) {
              const doc = data.docs[0];
              console.log('[openGooglePicker] Selected document:', doc);
              
              // Get the OAuth token either from the picker response or use the existing one
              const oauthToken = data.oauthToken || access_token;
              
              if (!oauthToken) {
                console.error('[openGooglePicker] No OAuth token available');
                resolve({
                  fileId: '',
                  url: '',
                  success: false,
                  error: 'No OAuth token received from picker',
                  provider: 'google' as const
                });
                return;
              }

              resolve({
                fileId: doc.id,
                url: doc.url,
                success: true,
                accessToken: oauthToken,
                provider: 'google' as const
              });
            } else if (data.action === window.google.picker.Action.CANCEL) {
              console.log('[openGooglePicker] Picker cancelled by user');
              resolve({
                fileId: '',
                url: '',
                success: false,
                error: 'Selection cancelled',
                provider: 'google' as const
              });
            }
          })
          .build();

        picker.setVisible(true);
        console.log('[openGooglePicker] Picker dialog opened');
      });
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('authentication expired') || 
           error.message.includes('invalid_grant') ||
           error.message.includes('invalid_token'))) {
        return {
          fileId: '',
          url: '',
          success: false,
          error: 'Authentication expired',
          provider: 'google' as const
        };
      }
      
      console.error('Error opening Google Picker:', error)
      return {
        fileId: '',
        url: '',
        success: false,
        error: 'Failed to open file picker',
        provider: 'google' as const
      }
    }
  }

  // Update openMicrosoftPicker
  const openMicrosoftPicker = async (): Promise<PickerResult> => {
    console.log('[openMicrosoftPicker] Starting Microsoft picker initialization');
    
    try {
      // Get access token with potential refresh
      let { data: accessData, error: tokenError } = await supabase
        .from('user_documents_access')
        .select('*')
        .eq('user_id', user?.id)
        .eq('provider', 'microsoft')
        .single();

      if (accessData && new Date(accessData.expires_at) < new Date()) {
        console.log('[openMicrosoftPicker] Token expired, attempting refresh');
        const refreshResult = await refreshAccessToken('microsoft', user?.id!, supabase);
        
        if (refreshResult.success && refreshResult.access_token) {
          accessData.access_token = refreshResult.access_token;
        } else {
          return {
            fileId: '',
            url: '',
            success: false,
            error: 'Authentication expired',
            provider: 'microsoft' as const
          };
        }
      }

      if (tokenError || !accessData?.access_token) {
        console.error('[openMicrosoftPicker] Token error:', tokenError);
        return {
          fileId: '',
          url: '',
          success: false,
          error: 'Authentication expired',
          provider: 'microsoft' as const
        };
      }

      const access_token = accessData.access_token;
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

              // Construct the web URL for Excel Online
              const webUrl = fileInfo.webUrl ||
                            fileInfo.driveItem?.webUrl ||
                            fileInfo.resourceUrl ||
                            fileInfo.link ||
                            (fileId ? `https://onedrive.live.com/edit.aspx?resid=${encodeURIComponent(fileId)}` : null);

              console.log('[openMicrosoftPicker] Extracted details:', {
                fileId,
                webUrl,
                originalFileInfo: fileInfo
              });

              if (fileId) {
                resolve({
                  fileId: fileId,
                  url: webUrl || `https://onedrive.live.com/edit.aspx?resid=${encodeURIComponent(fileId)}`,
                  success: true,
                  accessToken: access_token,
                  provider: 'microsoft' as const
                });
                return;
              }
            }

            console.warn('[openMicrosoftPicker] Could not extract file details from response');
            resolve({
              fileId: '',
              url: '',
              success: false,
              error: 'Could not extract file details',
              provider: 'microsoft' as const
            });
          },
          cancel: () => {
            console.log('[openMicrosoftPicker] Picker cancelled by user');
            resolve({
              fileId: '',
              url: '',
              success: false,
              error: 'Selection cancelled',
              provider: 'microsoft' as const
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
              error: error.message || 'Failed to open file picker',
              provider: 'microsoft' as const
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
            error: 'Failed to launch picker',
            provider: 'microsoft' as const
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
        return {
          fileId: '',
          url: '',
          success: false,
          error: 'Authentication expired',
          provider: 'microsoft' as const
        };
      }
      
      return {
        fileId: '',
        url: '',
        success: false,
        error: 'Failed to open file picker',
        provider: 'microsoft' as const
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
        return {
          fileId: '',
          url: '',
          success: false,
          error: 'Authentication expired',
          provider
        };
      }

      console.error('Error launching picker:', error)
      return {
        fileId: '',
        url: '',
        success: false,
        error: 'Failed to launch picker',
        provider
      }
    }
  }

  return {
    verifyFileAccess,
    storeFilePermission,
    launchPicker
  }
} 