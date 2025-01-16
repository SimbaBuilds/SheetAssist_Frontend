import { Suspense } from 'react'
import { RouteLoadingIndicator } from '@/components/public/signup/RouteLoadingIndicator'

export default function ScopesNoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<RouteLoadingIndicator />}>
        {children}
      </Suspense>
    </div>
  )
} 