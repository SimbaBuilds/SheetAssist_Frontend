import { ErrorDisplay } from '@/components/public/ErrorDisplay'
import { Suspense } from 'react'

interface Props {
  searchParams: {
    message?: string
  }
}

export default function NotFound({ searchParams }: Props) {
  const message = searchParams?.message || 'Page not found'
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorDisplay errorDescription={message} />
    </Suspense>
  )
} 