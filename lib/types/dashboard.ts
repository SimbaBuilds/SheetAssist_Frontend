import { DOWNLOAD_FILE_TYPES } from '@/lib/constants/file-types'
import { AcceptedMimeType } from '@/lib/constants/file-types'
export type DownloadFileType = typeof DOWNLOAD_FILE_TYPES[number]['value']



export interface DashboardInitialData {
  output_type?: 'download' | 'online' | null;
  last_query?: string;
  recent_sheets?: OnlineSheet[];
  direct_sheet_modification?: boolean;
}

export interface OutputPreferences {
  type: 'download' | 'online';
  destination_url?: string;
  format?: DownloadFileType;
  modify_existing?: boolean;
  sheet_name?: string | null;
  doc_name?: string | null;
}

export interface FileUploadMetadata {
  name: string
  type: AcceptedMimeType
  extension: string
  size: number
  index: number
  file_id?: string
  page_count?: number
  s3_key?: string
  s3_url?: string
}

export interface InputSheet {
    url: string
    sheet_name?: string | null
    doc_name?: string | null
}

export interface QueryRequest {
  query: string
  input_urls?: InputSheet[]
  files_metadata?: FileUploadMetadata[]
  output_preferences?: OutputPreferences,
  job_id?: string
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

export interface Job {
  job_id: string;
  user_id: string;
  status: 'created' | 'processing' | 'completed' | 'error' | 'canceled' | 'completed_with_error(s)';
  total_pages: number | null;
  processed_pages: number | null;
  output_preferences: OutputPreferences;
  created_at: string;  // ISO timestamp
  completed_at: string | null;  // ISO timestamp
  error_message: string | null;
  result_snapshot: string | null;
  result_file_path: string | null;
  result_media_type: string | null;
  started_at: string | null;  // ISO timestamp
  page_chunks: JSON | null;
  current_chunk: number | null;
  query: string;
  message: string | null;
  images_processed: number;
  total_images_processed: number | null;
  chunk_status: string[] | null;
  type: 'standard' | 'visualization' | 'batch' | null;
}

//Handles batch and standard requests
export interface QueryResponse {
  original_query?: string;
  status: 'created' | 'processing' | 'completed' | 'error' | 'canceled';
  message: string;
  files?: FileInfo[];
  num_images_processed: number;
  job_id?: string;
  error?: string;
  total_pages?: number;
}



// Add FastAPI file response type
export interface FileResponse {
  url: string;
  filename: string;
  content_type: string;
}


export interface Workbook {
  url: string;
  doc_name: string;
  provider: string | null;
  sheet_names: string[] | null;
  error?: string;
  success: boolean;
}


export interface OnlineSheet {
  url: string;
  provider?: string;
  doc_name: string;
  sheet_name: string;
  
}

export interface SheetTitleKey {
  url: string;
  sheet_name?: string;
}

export interface DocumentTitleMap {
  [key: string]: string;  // key will be JSON.stringify(SheetTitleKey)
}

// Add new type for processing state
export interface ProcessingState {
  status: 'idle' | 'processing' | 'created' | 'completed' | 'completed_with_error(s)' | 'error' | 'canceled';
  message: string;
  progress?: {
    processed: number;
    total: number | null;
  };
  details?: string;
}

export const SEABORN_SEQUENTIAL_PALETTES = {
  rocket: {
    name: 'Rocket',
    description: 'Wide-range luminance, purple to yellow',
    preview: ['#432874', '#721f81', '#9f1c7c', '#c21a6c', '#dc2f55', '#ed4b3d', '#f67736', '#f9a644', '#f6d962'],
  },
  mako: {
    name: 'Mako',
    description: 'Wide-range luminance, blue to white',
    preview: ['#0f2030', '#1b3344', '#2b4c5e', '#3f6578', '#588091', '#749ba9', '#92b6c1', '#b2d0d9', '#d4eaf1'],
  },
  flare: {
    name: 'Flare',
    description: 'Limited luminance, orange-red',
    preview: ['#e68c3f', '#e57d3c', '#e26b3c', '#dd573e', '#d64042', '#cc2348', '#bf0050'],
  },
  crest: {
    name: 'Crest',
    description: 'Limited luminance, blue-green',
    preview: ['#1f4f7b', '#186b93', '#1a7c9e', '#238da5', '#339da8', '#4aaca8', '#58b4a7'],
  }
} as const;

export type SeabornSequentialPalette = keyof typeof SEABORN_SEQUENTIAL_PALETTES;

export interface VisualizationRequest {
  input_urls?: InputSheet[]
  files_metadata?: FileUploadMetadata[]
  options: VisualizationOptions
}

export interface VisualizationOptions {
  chart_type: string
  color_palette?: string
  custom_instructions?: string
  // Add other visualization-specific options
}

export interface VisualizationResult {
  success: boolean
  image_data?: string  // base64 encoded image data with or without data URI prefix
  generated_image_name?: string
  error?: string
  message?: string
}

