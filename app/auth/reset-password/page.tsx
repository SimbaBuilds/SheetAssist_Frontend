import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordPage from '@/components/public/ResetPasswordPage'
import { Toaster } from 'sonner'

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  // If there's no recovery code in the URL, redirect to login
  if (!searchParams.code) {
    redirect('/auth/login')
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <ResetPasswordPage />
    </>
  )
} 