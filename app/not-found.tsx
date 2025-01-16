'use client'

import { ErrorDisplay } from '@/components/public/ErrorDisplay'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function NotFoundContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'Page not found'
  
  return <ErrorDisplay errorDescription={message} />
}

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  )
} 