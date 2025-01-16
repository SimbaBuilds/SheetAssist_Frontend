import ScopesNotePage from '@/components/public/ScopesNotePage'
import { Suspense } from 'react'

export default function ScopesNote() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScopesNotePage />
    </Suspense>
  )
} 