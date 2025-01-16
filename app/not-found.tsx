'use client'
export const dynamic = "force-dynamic"

import { ErrorDisplay } from '@/components/public/ErrorDisplay'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  )
}

function NotFoundContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'Page not found'
  
  return <ErrorDisplay errorDescription={message} />
} 