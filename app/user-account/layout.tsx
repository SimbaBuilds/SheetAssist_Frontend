import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UserAccountLayout({
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
      {children}
    </div>
  )
}
