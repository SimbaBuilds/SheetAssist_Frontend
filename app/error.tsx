'use client';

import { Button } from "@/components/ui/button";
import { ErrorDisplay } from '@/components/public/ErrorDisplay';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
      <ErrorDisplay
        errorDescription={error.message || 'Something went wrong'}
        error={error.name}
      />
      <Button 
        onClick={reset}
        variant="default"
      >
        Try again
      </Button>
    </div>
  );
} 