import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const ErrorDisplay = dynamic(() => import('@/components/public/ErrorDisplay').then(mod => mod.ErrorDisplay), {
  loading: () => <div>Loading...</div>
})

export default function Error() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorDisplay />
    </Suspense>
  )
}