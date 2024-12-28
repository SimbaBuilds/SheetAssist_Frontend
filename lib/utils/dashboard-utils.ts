import type { SheetTitleKey } from '@/lib/types/dashboard'
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '@/lib/constants/file-types'

// URL-related utilities
export const getUrlProvider = (url: string): 'google' | 'microsoft' | null => {
  if (url.includes('google.com') || url.includes('docs.google.com') || url.includes('sheets.google.com')) {
    return 'google'
  }
  if (url.includes('onedrive.live.com') || url.includes('live.com') || url.includes('sharepoint.com')) {
    return 'microsoft'
  }
  return null
}

export const checkUrlPermissions = (
  url: string, 
  permissions: { google: boolean | null; microsoft: boolean | null }
) => {
  const provider = getUrlProvider(url)
  if (!provider) return { hasPermission: false, provider: null }
  return { 
    hasPermission: !!permissions[provider], 
    provider 
  }
}

// Formatting utilities
export const formatTitleKey = (url: string | null | undefined, sheet_name: string | null | undefined): string => {
  if (!url || !sheet_name) {
    console.warn('Attempted to create title key with missing data:', { url, sheet_name })
    return ''
  }
  return JSON.stringify({ url, sheet_name } as SheetTitleKey)
}

export const formatDisplayTitle = (doc_name: string, sheet_name?: string): string => {
  if (sheet_name) {
    return `${doc_name} - ${sheet_name}`
  }
  return doc_name
}

// File validation utilities
export const validateFile = (file: File): string | null => {
  // Check file type
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
  const fileMimeType = file.type.toLowerCase()

  // Find matching file type definition
  const matchingType = [...ACCEPTED_FILE_TYPES.documents, ...ACCEPTED_FILE_TYPES.images]
    .find(type => type.extension === fileExtension || type.mimeType === fileMimeType)

  if (!matchingType) {
    return `File type ${fileExtension} (${fileMimeType}) is not supported`
  }

  return null
}

export const validateVisualizationFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
  }

  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
  const allowedExtensions = ['.xlsx', '.csv']
  
  if (!allowedExtensions.includes(fileExtension)) {
    return `File type ${fileExtension} is not supported. Please use .xlsx or .csv files.`
  }

  return null
}

// Add this new utility function to check cumulative file size
export const validateCumulativeFileSize = (
  newFile: File,
  existingFiles: File[],
  maxSize: number
): string | null => {
  const totalSize = existingFiles.reduce((sum, file) => sum + file.size, 0) + newFile.size;
  if (totalSize > maxSize) {
    return `Total file size would exceed ${maxSize / 1024 / 1024}MB limit`
  }
  return null;
}

// Error handling utilities
export const handleAuthError = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'response' in error) {
    const errorDetail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
    if (errorDetail?.includes('Google authentication expired')) {
      return true
    } else if (errorDetail?.includes('Microsoft authentication expired')) {
      return true
    }
  }
  return false
} 

// Add these new utility functions:

interface FileAccessResult {
  hasPermission: boolean;
  fileInfo: { provider: string } | null;
  error?: string;
}

export async function handleUrlValidation(
  value: string,
  verifyFileAccess: Function,
  launchPicker: Function,
  setError: (error: string | null) => void
): Promise<boolean> {
  setError(null);

  if (!value) {
    setError('Please enter a URL');
    return false;
  }

  // Basic URL validation
  try {
    new URL(value);
  } catch {
    setError('Please enter a valid URL starting with http:// or https://');
    return false;
  }

  // Verify file access
  const { hasPermission, fileInfo, error } = await verifyFileAccess(value);
  
  if (!fileInfo) {
    setError('Invalid URL format');
    return false;
  }

  if (!hasPermission) {
    const pickerResult = await launchPicker(fileInfo.provider);
    if (!pickerResult.success) {
      setError(pickerResult.error || 'Failed to get file permission');
      return false;
    }
  }

  return true;
}

export async function fetchAndHandleSheets(
  workbook: any,
  setSheets: (sheets: string[]) => void,
  setSheet: (sheet: string | null) => void,
  setShowSelector: (show: boolean) => void
): Promise<void> {
  if (workbook.sheet_names?.length) {
    setSheets(workbook.sheet_names);
    if (workbook.sheet_names.length === 1) {
      setSheet(workbook.sheet_names[0]);
    } else {
      setShowSelector(true);
    }
  }
} 