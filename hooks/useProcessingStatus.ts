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
    console.log('[useProcessingStatus] Status update:', {
      isLoading,
      result,
      currentMessage: processingMessage,
      currentProgress: progress
    });

    if (!isLoading) {
      setProcessingMessage('');
      setProgress(null);
      return;
    }

    // Update message and progress when result changes
    if (result) {
      console.log('[useProcessingStatus] Updating with result:', {
        message: result.message,
        numProcessed: result.num_images_processed,
        totalPages: result.total_pages
      });

      setProcessingMessage(result.message || 'Processing your request...');
      
      if (result.num_images_processed !== undefined) {
        setProgress({
          processed: result.num_images_processed,
          total: result.total_pages || null
        });
      }
    } else {
      setProcessingMessage('Processing your request...');
      setProgress(null);
    }
  }, [isLoading, result]);

  return {
    processingMessage,
    progress
  };
} 