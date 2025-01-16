import ContactUsPage from '@/components/public/ContactUsPage'
import { Suspense } from 'react'

export default function ContactUs() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContactUsPage />
    </Suspense>
  )
} 