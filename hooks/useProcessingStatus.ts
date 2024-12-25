import { useState, useEffect } from 'react';
import { QueryResponse } from '@/types/dashboard';

interface UseProcessingStatusProps {
  isLoading: boolean;
  result: QueryResponse | null;
}

export function useProcessingStatus({ 
  isLoading, 
  result
}: UseProcessingStatusProps) {
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [progress, setProgress] = useState<{
    processed: number;
    total: number | null;
  } | null>(null);

  useEffect(() => {
    if (result) {
      // Always use the result message if available
      const message = result.message || 
        (result.status === 'processing' 
          ? `Processing page ${result.num_images_processed || 0}${result.total_pages ? ` of ${result.total_pages}` : ''}`
          : 'Processing your request.  This may take a few minutes...');
      
      console.log('[useProcessingStatus] Setting message:', message, 'from result:', result);
      
      setProcessingMessage(message);

      if (typeof result.num_images_processed === 'number') {
        setProgress({
          processed: result.num_images_processed,
          total: result.total_pages || null
        });
      }

      console.log('[useProcessingStatus] Updated status:', {
        message,
        processed: result.num_images_processed,
        total: result.total_pages,
        status: result.status
      });
    } else {
      // Set default message when no result is available but we're loading
      if (isLoading) {
        setProcessingMessage('Processing your request.  This may take a few minutes...');
      } else {
        setProcessingMessage('');
        setProgress(null);
      }
    }
  }, [isLoading, result]);

  return {
    processingMessage,
    progress,
    status: result?.status || (isLoading ? 'processing' : null)
  };
} 