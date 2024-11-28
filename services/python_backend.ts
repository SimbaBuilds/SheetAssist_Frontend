import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileMetadata, QueryRequest, ProcessedQueryResult, FileInfo } from '@/types/dashboard';
import { AcceptedMimeType } from '@/constants/file-types';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface DocumentTitle {
  url: string;
  title: string;
}

// Function to process the query
export const processQuery = async (
  query: string,
  webUrls: string[] = [],
  files?: File[],
  outputPreferences?: OutputPreferences
): Promise<ProcessedQueryResult> => {
  const formData = new FormData();
  
  // Create files metadata array with index only if files exist
  const filesMetadata: FileMetadata[] = files?.map((file, index) => ({
    name: file.name,
    type: file.type as AcceptedMimeType,
    extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
    size: file.size,
    index
  })) ?? [];

  // Part 1: JSON payload with metadata
  const jsonData: QueryRequest = {
    query,
    web_urls: webUrls,
    files_metadata: filesMetadata,
    output_preferences: outputPreferences
  };
  formData.append('json_data', JSON.stringify(jsonData));

  // Part 2: Append files only if they exist
  if (files?.length) {
    files.forEach((file, index) => {
      formData.append('files', file); // Changed to match FastAPI's expected format
    });
  }

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

// Download function
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

// Function to get document titles from URLs
export const getDocumentTitles = async (urls: string[]): Promise<DocumentTitle[]> => {
  try {
    const response: AxiosResponse<DocumentTitle[]> = await api.post('/get_document_titles', { urls });
    return response.data;
  } catch (error) {
    console.error('Error fetching document titles:', error);
    throw error;
  }
};
