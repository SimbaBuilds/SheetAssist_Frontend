'use client'
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  error?: string
  errorCode?: string
  errorDescription?: string
}

export function ErrorDisplay({ error, errorCode, errorDescription }: ErrorDisplayProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          Authentication Error
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">
            {errorDescription || error || 'An unknown error occurred'}
          </p>
          {errorCode && (
            <p className="text-sm text-red-500 mt-2">
              Error Code: {errorCode}
            </p>
          )}
        </div>
        <div className="space-y-4">
          <Button
            onClick={() => router.push('/auth/login')}
            variant="default"
            className="w-full"
          >
            Return to Login
          </Button>
          <p className="text-sm text-muted-foreground">
            If this error persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
} 