import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <div>
      {/* You can add dashboard-wide layout elements here */}
      {children}
    </div>
  )
}
