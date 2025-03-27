import { ExamplesPage } from '@/components/public/ExamplesPage'
import { Suspense } from 'react'

export default function Examples() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExamplesPage />
    </Suspense>
  )
} 