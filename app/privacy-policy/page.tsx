import PrivacyPolicyPage from '@/components/public/PrivacyPolicyPage'
import { Suspense } from 'react'

export default function PrivacyPolicy() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrivacyPolicyPage />
    </Suspense>
  )
} 