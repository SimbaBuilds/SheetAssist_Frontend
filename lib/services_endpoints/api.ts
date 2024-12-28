import axios from 'axios';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Add request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      const { error: signOutError } = await supabase.auth.signOut();
      if (!signOutError) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api; 