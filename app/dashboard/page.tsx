'use client'

import { createClient } from '@/utils/supabase/client'
import { DashboardPage } from '@/components/pages/DashboardPage'

export default function Dashboard() {

  // Pass the initial data to the client component
  return <DashboardPage/>
} 