import api from './api';
import { FileInfo } from '@/lib/types/dashboard';


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