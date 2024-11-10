'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-background rounded-lg shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">Verify Your Email</h1>
        
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            {message || 'Please check your email and click the verification link to continue.'}
          </p>
          <div className="space-y-2">
            {/* <Button
              onClick={() => router.push('/auth/login')}
              variant="outline"
              className="w-full"
            >
              Return to Login
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  )
}
