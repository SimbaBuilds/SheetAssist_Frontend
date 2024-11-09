import { Metadata } from 'next'
import SignUpPage from '@/components/pages/signup/SignUpPage'

export const metadata: Metadata = {
  title: 'Sign Up - AI File',
  description: 'Create your account to get started with AI File',
}

export default function Page() {
  return <SignUpPage />
} 