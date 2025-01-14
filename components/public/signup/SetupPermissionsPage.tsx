'use client'

import { Button } from '@/components/ui/button'
import { GoogleIcon, MicrosoftIcon, LoadingSpinner } from '@/components/icons'
import { useSetupPermissions } from '@/hooks/useSetupPermissions'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'

export function SetupPermissionsPage() {
  const {
    isLoading,
    error,
    handleGoogleSetup,
    handleMicrosoftSetup,
    handleSkip
  } = useSetupPermissions()
  
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleAction = (action: () => void) => {
    if (!acceptedTerms) {
      toast({
        title: "Please accept the terms",
        description: "You must accept the terms and conditions to continue.",
        className: "destructive",
      })
      return
    }
    action()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">Loading permissions setup...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-red-600 font-semibold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-background rounded-lg shadow-lg p-6 space-y-6">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold">Set Up Permissions</h1>
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
          <p className="text-xs text-foreground">
                  Please accept all Google or Microsoft permissions to get the most out of this application.<br/>
                  See <Link href="/scopes-note" className="underline">here</Link> for a note on drive permissions. <br/>
                </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 border rounded-lg">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              I understand and agree to grant the requested permissions. See our{" "}
              <Link href="/terms-of-service" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </Link>
              {" "}for details.
            </label>
          </div>

          <Button
            onClick={() => handleAction(handleGoogleSetup)}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <GoogleIcon />
            Set up Google Sheets Integration
          </Button>

          <Button
            onClick={() => handleAction(handleMicrosoftSetup)}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <MicrosoftIcon />
            Set up Microsoft Excel Online Integration
          </Button>

          <Button
            onClick={() => handleAction(handleSkip)}
            variant="ghost"
            className="w-full"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
} 