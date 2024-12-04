import { DOWNLOAD_FILE_TYPES } from '@/constants/file-types'
import { AcceptedMimeType } from '@/constants/file-types'
export type DownloadFileType = typeof DOWNLOAD_FILE_TYPES[number]['value']


export interface DashboardInitialData {
  output_type?: 'download' | 'online' | null;
  last_query?: string;
  recent_urls?: string[];
  allow_sheet_modification?: boolean;
  show_sheet_modification_warning?: boolean;
}

export interface OutputPreferences {
  type: 'download' | 'online'
  destination_url?: string
  format?: DownloadFileType
  modify_existing?: boolean

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

export interface TruncatedSandboxResult {
  original_query: string;
  print_output: string;
  error: string;
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
  result: TruncatedSandboxResult;
  status: 'success' | 'error';
  message: string;
  files?: FileInfo[];
  num_images_processed: number;
}

// Add FastAPI file response type
export interface FileResponse {
  url: string;
  filename: string;
  content_type: string;
}