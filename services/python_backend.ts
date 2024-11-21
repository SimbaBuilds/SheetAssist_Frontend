import { AxiosResponse } from 'axios';
import api from './api';
import { OutputPreferences, FileMetadata, QueryRequest, ProcessedQueryResult, FileInfo } from '@/types/dashboard';
import { AcceptedMimeType } from '@/constants/file-types';



// Function to process the query
export const processQuery = async (
  query: string,
  webUrls: string[] = [],
  files: File[] = [],
  outputPreferences?: OutputPreferences
): Promise<ProcessedQueryResult> => {
  const formData = new FormData();
  
  // Create files metadata array with index
  const filesMetadata: FileMetadata[] = files.map((file, index) => ({
    name: file.name,
    type: file.type as AcceptedMimeType,
    extension: `.${file.name.split('.').pop()?.toLowerCase() || ''}`,
    size: file.size,
    index
  }));

  // Part 1: JSON payload with metadata
  const jsonData: QueryRequest = {
    query,
    web_urls: webUrls,
    files_metadata: filesMetadata,
    output_preferences: outputPreferences
  };
  formData.append('json', new Blob([JSON.stringify(jsonData)], {
    type: 'application/json'
  }));

  // Part 2: Actual files
  files.forEach((file, index) => {
    // file_${index} corresponds to filesMetadata[index]
    formData.append(`file_${index}`, file);
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
