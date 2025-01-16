'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function NotFoundContent() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || ''

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center space-y-4 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">404 - Page Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {from ? `The page "${from}" could not be found.` : 'The page you&apos;re looking for does&apos;t exist.'}
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go back home</Link>
      </Button>
    </div>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">404 - Page Not Found</h1>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  )
} 