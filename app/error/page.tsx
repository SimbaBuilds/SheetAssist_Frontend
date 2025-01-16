import { ErrorDisplay } from '@/components/public/ErrorDisplay'
import { Suspense } from 'react'

export default function Error() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorDisplay />
    </Suspense>
  )
}