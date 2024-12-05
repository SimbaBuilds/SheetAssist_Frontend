'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserAccount } from '@/hooks/useUserAccount'
import { useState } from 'react'
import type { UserProfile, UserUsage } from '@/types/supabase_tables'
import type { User } from '@supabase/supabase-js'
import { PLAN_REQUEST_LIMITS, PLAN_IMAGE_LIMITS } from '@/types/supabase_tables'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'

interface UserAccountPageProps {
  profile: UserProfile
  user: User
  usage: UserUsage
}

export function UserAccountPage({ profile, user, usage }: UserAccountPageProps) {
  const {
    isLoading,
    userProfile,
    userUsage,
    isUpdating,
    updateUserName,
    handleGooglePermissions,
    handleMicrosoftPermissions,
    isDeletingAccount,
    deleteAccount,
    updateSheetModificationPreference,
    handleGoogleReconnect,
    handleMicrosoftReconnect,
  } = useUserAccount({ 
    initialProfile: profile,
    initialUsage: usage,
    user 
  })

  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')

  const currentProfile = isLoading ? profile : (userProfile ?? profile)
  const currentUsage = isLoading ? usage : (userUsage ?? usage)

  // Default to 'free' plan if profile is not available
  const plan = currentProfile?.plan ?? 'free'
  const requestLimit = PLAN_REQUEST_LIMITS[plan]
  const imageLimit = PLAN_IMAGE_LIMITS[plan]
  
  // Default to 0 if usage data is not available
  const requestsThisMonth = currentUsage?.requests_this_month ?? 0
  const imagesThisMonth = currentUsage?.images_processed_this_month ?? 0
  
  const requestUsagePercentage = (requestsThisMonth / requestLimit) * 100
  const imageUsagePercentage = (imagesThisMonth / imageLimit) * 100

  if (isLoading) {
    return <AccountPageSkeleton />
  }

  return (
    <div className="flex justify-center min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-8 px-4">
        <h1 className="text-3xl font-bold text-center">Account Settings</h1>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={() => updateUserName(firstName, lastName)}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
            <CardDescription>
              Manage your connected document services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Google Integration</h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.google_permissions_set ?? false ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <div className="space-x-2">
                {profile?.google_permissions_set ? (
                  <Button
                    variant="outline"
                    onClick={handleGoogleReconnect}
                    disabled={isUpdating}
                  >
                    Reconnect
                  </Button>
                ) : (
                  <Button
                    onClick={handleGooglePermissions}
                    disabled={isUpdating}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Microsoft Integration</h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.microsoft_permissions_set ?? false ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <div className="space-x-2">
                {profile?.microsoft_permissions_set ? (
                  <Button
                    variant="outline"
                    onClick={handleMicrosoftReconnect}
                    disabled={isUpdating}
                  >
                    Reconnect
                  </Button>
                ) : (
                  <Button
                    onClick={handleMicrosoftPermissions}
                    disabled={isUpdating}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Monthly Requests</h3>
                <p className="text-2xl font-bold">
                  {requestsThisMonth}
                  <span className="text-muted-foreground text-lg">
                    /{requestLimit}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Requests available this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Requests and Image Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Your current usage and limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Total Requests This Month</Label>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm">
                    {requestsThisMonth} / {requestLimit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </div>
                </div>
                <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${requestUsagePercentage >= 90 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${Math.min(requestUsagePercentage, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Label>Images Processed This Month</Label>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm">
                    {imagesThisMonth} / {imageLimit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </div>
                </div>
                <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${imageUsagePercentage >= 90 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${Math.min(imageUsagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Current Plan</h3>
                <p className="text-2xl font-bold capitalize">{plan}</p>
              </div>
              <Button variant="outline">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sheet Modification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Append to Existing Sheet</h3>
                  <p className="text-sm text-muted-foreground">
                    When enabled, this application will append to the existing sheet at the destination URL <br />
                  provided instead of adding a new sheet to the workbook.  Note: For Google Sheets, data will<br /> 
                  be appended to the sheet at the URL provided as Google URLs are sheet specific, Microsoft Excel URLs are sheet agnostic and data will always be appended to the first sheet in the workbook.


                  </p>
                </div>
                <Switch
                  checked={currentProfile?.allow_sheet_modification ?? false}
                  onCheckedChange={(checked) => {
                    console.log('[UserAccountPage] Sheet modification toggle changed:', {
                      previousValue: currentProfile?.allow_sheet_modification,
                      newValue: checked
                    })
                    updateSheetModificationPreference(checked)
                  }}
                  disabled={isUpdating}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeletingAccount}>
                      {isDeletingAccount ? "Deleting..." : "Delete Account"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all of your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={deleteAccount}
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AccountPageSkeleton() {
  return (
    <div className="flex justify-center min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-8 px-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <div className="space-y-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
