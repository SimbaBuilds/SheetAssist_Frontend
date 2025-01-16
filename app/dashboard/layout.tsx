import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { RouteLoadingIndicator } from '@/components/public/signup/RouteLoadingIndicator'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<RouteLoadingIndicator />}>
      {children}
      </Suspense>
    </div>
  )
}
