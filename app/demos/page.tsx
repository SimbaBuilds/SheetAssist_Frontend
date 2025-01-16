import { DemosPage } from '@/components/public/DemosPage'
import { Suspense } from 'react'

export default function Demos() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemosPage />
    </Suspense>
  )
} 