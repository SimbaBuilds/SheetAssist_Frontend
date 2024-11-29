'use client'

import { useSetupPermissions } from '@/hooks/useSetupPermissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function SetupPermissionsPage() {
  const { 
    isLoading, 
    error, 
    handleGoogleSetup, 
    handleMicrosoftSetup, 
    handleSkip,
    isReauth,
    provider 
  } = useSetupPermissions()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const getReauthMessage = () => {
    if (!isReauth) return null
    
    const serviceName = provider === 'google' ? 'Google' : 'Microsoft'
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          Your {serviceName} authentication has expired. Please reconnect your account to continue using the service.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            {isReauth ? 'Reconnect Your Account' : 'Setup Document Access'}
          </CardTitle>
          <CardDescription>
            {isReauth 
              ? 'Please reconnect your account to continue accessing your documents.'
              : 'Connect your accounts to enable AI assistance with your documents.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {getReauthMessage()}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogleSetup}
              disabled={isReauth && provider !== 'google'}
            >
              <Icons.google className="mr-2 h-4 w-4" />
              {isReauth && provider === 'google' 
                ? 'Reconnect Google Account'
                : 'Connect Google Account'}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleMicrosoftSetup}
              disabled={isReauth && provider !== 'microsoft'}
            >
              <Icons.microsoft className="mr-2 h-4 w-4" />
              {isReauth && provider === 'microsoft'
                ? 'Reconnect Microsoft Account'
                : 'Connect Microsoft Account'}
            </Button>
          </div>
        </CardContent>

        {!isReauth && (
          <CardFooter>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
} 