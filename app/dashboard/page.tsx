'use client'

import { Suspense } from 'react'
import DashboardPage from '@/components/authorized/DashboardPage'

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardPage />
    </Suspense>
  )
} 