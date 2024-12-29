import { Metadata } from 'next'
import SignUpPage from '@/components/public/signup/SignUpPage'

export const metadata: Metadata = {
  title: 'Sign Up - SheetAssist',
  description: 'Create your account to get started with SheetAssist',
}

export default function Page() {
  return <SignUpPage />
} 