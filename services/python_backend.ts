import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences } from '@/types/dashboard';

// Types matching the Python models
export interface QueryRequest {
  web_urls?: string[];
  files?: File[];
  query: string;
  output_preferences?: OutputPreferences;
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

export interface ProcessedQueryResult {
  result: SandboxResult;
  message: string;
  files?: FileInfo[];
}

// Add new types for download functionality
export interface FileInfo {
  file_path: string;
  media_type: string;
  filename: string;
  download_url?: string;
}

// Function to process the query
export const processQuery = async (
  query: string,
  webUrls: string[] = [],
  files: File[] = [],
  outputPreferences?: OutputPreferences
): Promise<ProcessedQueryResult> => {
  const formData = new FormData();
  
  // Add the JSON data with properly typed output_preferences
  const jsonData: QueryRequest = {
    query,
    web_urls: webUrls,
    output_preferences: outputPreferences
  };
  
  formData.append('json', new Blob([JSON.stringify(jsonData)], {
    type: 'application/json'
  }));

  // Add files if any
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    const response: AxiosResponse<ProcessedQueryResult> = await api.post(
      '/process_query',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
};

// Add download function
export const downloadFile = async (fileInfo: FileInfo): Promise<void> => {
  try {
    const response = await api.get(`/download`, {
      params: {
        file_path: fileInfo.file_path
      },
      responseType: 'blob'
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: fileInfo.media_type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo.filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};
