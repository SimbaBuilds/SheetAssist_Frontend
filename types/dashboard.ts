import { DOWNLOAD_FILE_TYPES } from '@/constants/file-types'

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