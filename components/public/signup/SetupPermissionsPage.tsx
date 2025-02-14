'use client'

import { Button } from '@/components/ui/button'
import { GoogleIcon, MicrosoftIcon } from '@/components/icons'
import { useSetupPermissions } from '@/hooks/useSetupPermissions'
import Link from 'next/link'

export function SetupPermissionsPage() {
  const {
    handleGoogleSetup,
    handleMicrosoftSetup,
    handleSkip
  } = useSetupPermissions()
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-background rounded-lg shadow-lg p-6 space-y-6">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold">Set Up Permissions</h1>
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
          <p className="text-xs text-foreground">
                  Please accept all Google or Microsoft permissions to get the most out of this application.
                </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSetup}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <GoogleIcon />
            Set up Google Sheets Integration
          </Button>

          <Button
            onClick={handleMicrosoftSetup}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <MicrosoftIcon />
            Set up Microsoft Excel Online Integration
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