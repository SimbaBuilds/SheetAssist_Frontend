'use client'

import { Button } from '@/components/ui/button'
import { GoogleIcon, MicrosoftIcon, LoadingSpinner } from '@/components/icons'
import { useSetupPermissions } from '@/hooks/useSetupPermissions'

export function SetupPermissionsPage() {
  const {
    isLoading,
    error,
    handleGoogleSetup,
    handleMicrosoftSetup,
    handleSkip
  } = useSetupPermissions()

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
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Set Up Permissions</h1>
          <p className="text-muted-foreground">
            Allow us access to your spreadsheets to get the most out of this application. < br/>
            Our application will only read and add to the workbooks you select -- no deletions or
            modifications will be made.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSetup}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <GoogleIcon />
            Set up Google Integration
          </Button>

          <Button
            onClick={handleMicrosoftSetup}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <MicrosoftIcon />
            Set up Microsoft Integration
          </Button>

          <Button
            onClick={handleSkip}
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