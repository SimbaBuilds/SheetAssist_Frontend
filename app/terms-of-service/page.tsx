import TermsOfServicePage from '@/components/public/TermsOfServicePage'
import { Suspense } from 'react'

export default function TermsOfService() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TermsOfServicePage />
    </Suspense>
  )
} 