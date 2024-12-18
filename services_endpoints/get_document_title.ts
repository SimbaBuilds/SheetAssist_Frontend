import { AxiosResponse } from 'axios';
import api from './api';
import { Workbook } from '@/types/dashboard';


// Function to get document titles from URLs
export const getDocumentTitle = async (url: string): Promise<Workbook> => {
    try {
      const response: AxiosResponse<Workbook> = await api.post('/get_document_title', { url });
      return response.data;
    } catch (error) {
      console.error('Error fetching document titles:', error);
      throw error;
    }
  };