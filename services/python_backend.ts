import { AxiosResponse } from 'axios';
import api from './api';

// Types matching the Python models
export interface QueryRequest {
  web_urls?: string[];
  files?: File[];
  query: string;
  output_preferences?: {
    type: 'download' | 'online';
    destination_url?: string;
  };
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
}

// Function to process the query
export const processQuery = async (
  query: string,
  webUrls: string[] = [],
  files: File[] = [],
  outputPreferences?: { type: 'download' | 'online'; destination_url?: string }
): Promise<ProcessedQueryResult> => {
  // Create form data if files are present
  const formData = new FormData();
  
  // Add the JSON data
  const jsonData = {
    query,
    web_urls: webUrls,
    output_preferences: outputPreferences
  };
  formData.append('json', new Blob([JSON.stringify(jsonData)], {
    type: 'application/json'
  }));

  // Add files if any
  files.forEach((file, index) => {
    formData.append(`files`, file);
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
