import { DOWNLOAD_FILE_TYPES } from '@/constants/file-types'
import { AcceptedMimeType } from '@/constants/file-types'
export type DownloadFileType = typeof DOWNLOAD_FILE_TYPES[number]['value']


export interface DashboardInitialData {
  output_type?: 'download' | 'online'
  last_query?: string
  recent_urls?: string[]
}

export interface OutputPreferences {
  type: 'download' | 'online'
  destination_url?: string
  file_type?: DownloadFileType
}

export interface FileMetadata {
  name: string
  type: AcceptedMimeType
  extension: string
  size: number
  index: number
}

export interface QueryRequest {
  query: string
  web_urls?: string[]
  files_metadata?: FileMetadata[]
  output_preferences?: OutputPreferences
}

export interface CompleteQueryRequest {
  json: QueryRequest
  files: {
    [key: `file_${number}`]: File
  }
}

export interface SandboxResult {
  original_query: string;
  print_output: string;
  code: string;
  error: string;
  return_value: any;
  timed_out: boolean;
  return_value_snapshot?: string;
}

// Add new types for download functionality
export interface FileInfo {
  file_path: string;
  media_type: string;
  filename: string;
  download_url: string;
}

export interface ProcessedQueryResult {
  result: SandboxResult;
  status: 'success' | 'error';
  message: string;
  files?: FileInfo[];
}

// Add FastAPI file response type
export interface FileResponse {
  url: string;
  filename: string;
  content_type: string;
}