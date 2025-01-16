import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const TermsOfServicePage = dynamic(() => import('@/components/public/TermsOfServicePage'), {
  loading: () => <div>Loading...</div>
})

export default function TermsOfService() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TermsOfServicePage />
    </Suspense>
  )
} 