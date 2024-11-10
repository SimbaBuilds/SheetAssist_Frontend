'use client'

import { createClient } from '@/utils/supabase/client'
import { DashboardPage } from '@/components/pages/DashboardPage'

export default async function Dashboard() {
  const supabase = createClient()
  
  // Fetch any initial data needed for the dashboard
  const { data: initialData, error } = await supabase.from('your_table').select()
  
  // Pass the initial data to the client component
  return <DashboardPage initialData={initialData} />
} 