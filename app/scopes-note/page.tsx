import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const ScopesNotePage = dynamic(() => import('@/components/public/ScopesNotePage'), {
  loading: () => <div>Loading...</div>
})

export default function ScopesNote() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScopesNotePage />
    </Suspense>
  )
} 