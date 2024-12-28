import { Metadata } from 'next'
import SignUpPage from '@/components/public/signup/SignUpPage'

export const metadata: Metadata = {
  title: 'Sign Up - Sheet Assist',
  description: 'Create your account to get started with Sheet Assist',
}

export default function Page() {
  return <SignUpPage />
} 