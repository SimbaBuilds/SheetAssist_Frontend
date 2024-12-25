import { DOWNLOAD_FILE_TYPES } from '@/constants/file-types'
import { AcceptedMimeType } from '@/constants/file-types'
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
}

export interface FileMetadata {
  name: string
  type: AcceptedMimeType
  extension: string
  size: number
  index: number
  file_id?: string
  page_count?: number
}

export interface InputUrl {
    url: string
    sheet_name?: string | null
}

export interface QueryRequest {
  query: string
  input_urls?: InputUrl[]
  files_metadata?: FileMetadata[]
  output_preferences?: OutputPreferences
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

export interface QueryResponse {
  result: TruncatedSandboxResult;
  status: 'success' | 'error' | 'processing';
  message: string;
  files?: FileInfo[];
  num_images_processed: number;
  total_pages?: number;
  job_id?: string;
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
  input_urls?: InputUrl[]
  files_metadata?: FileMetadata[]
  options: VisualizationOptions
}

export interface VisualizationOptions {
  chart_type: string
  color_palette?: string
  custom_instructions?: string
  // Add other visualization-specific options
}

export interface VisualizationResult {
  status: 'success' | 'error'
  image_data?: string  // base64 encoded image data with or without data URI prefix
  generated_image_name?: string
  error?: string
  message?: string
}