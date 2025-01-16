'use client'

import { ErrorDisplay } from '@/components/public/ErrorDisplay'
import { Suspense } from 'react'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorDisplay 
        errorDescription={error.message || 'Something went wrong'} 
        error={error.digest}
      />
    </Suspense>
  )
}