import { Suspense } from 'react'
import { RouteLoadingIndicator } from '@/components/public/signup/RouteLoadingIndicator'

export default function DemosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}