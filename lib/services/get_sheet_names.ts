import { AxiosResponse } from 'axios';
import api from './api';
import { Workbook } from '@/lib/types/dashboard';


// Function to get document titles from URLs
export const getSheetNames = async (url: string): Promise<Workbook> => {
    console.log('[getSheetNames] Starting API call with URL:', url);
    try {
      const response: AxiosResponse<Workbook> = await api.post('/get_sheet_names', { url });
      console.log('[getSheetNames] API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[getSheetNames] Error fetching sheet names:', error);
      throw error;
    }
  };