import DashboardPage from '@/components/authorized/DashboardPage'
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardPage />
    </Suspense>
  )
} 