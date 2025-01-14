'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserAccount } from '@/hooks/useUserAccount'
import { useState } from 'react'
import type { UserProfile, UserUsage } from '@/lib/supabase/tables'
import type { User } from '@supabase/supabase-js'
import { PLAN_REQUEST_LIMITS, PLAN_IMAGE_LIMITS, VIS_GEN_LIMITS } from '@/lib/constants/pricing'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from '@/components/ui/use-toast'

import { useSubscription } from '@/hooks/useSubscription'
import { SUBSCRIPTION_PLANS } from '@/lib/types/stripe'
import Link from 'next/link'

interface UserAccountPageProps {
  profile: UserProfile & {
    subscription_status?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
    current_period_end?: string
    price_id?: string
  }
  user: User
  usage: UserUsage & {
    overage_this_month?: number
    overage_hard_limit?: number
  }
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
    updateOverageLimit,
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
  const visLimit = VIS_GEN_LIMITS[plan]
  
  // Default to 0 if usage data is not available
  const requestsThisMonth = currentUsage?.requests_this_month ?? 0
  const imagesThisMonth = currentUsage?.images_processed_this_month ?? 0
  const visualizationsThisMonth = currentUsage?.visualizations_this_month ?? 0
  
  const requestUsagePercentage = (requestsThisMonth / requestLimit) * 100
  const imageUsagePercentage = (imagesThisMonth / imageLimit) * 100
  const visUsagePercentage = (visualizationsThisMonth / visLimit) * 100

  const {
    isLoading: isSubscriptionLoading,
    checkout,
    openPortal,
    isPortalLoading,
  } = useSubscription()

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
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
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
            <CardDescription className="space-y-2">
              <span className="block">
                <p className="text-xs text-foreground">
                  Please accept all Google or Microsoft permissions to get the most out of this application.<br/>
                  See <Link href="/scopes-note" className="underline">here</Link> for a note on drive permissions. <br/>
                </p>
              </span>
              <span className="block">
              </span>
              <span className="block">
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Google Sheets</h3>
                <p className="text-xs text-muted-foreground">
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
                <h3 className="font-medium">Microsoft Excel Online</h3>
                <p className="text-xs text-muted-foreground">
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


        {/* Requests, Image, and Visualization Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Data Processing Requests This Month</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Any time you submit a request in the main part of the dashboard
                </p>
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
                <Label>Input Images Processed This Month</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  This includes any png and jpeg images as well as image-like scanned pages in pdfs
                </p>
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
              
              <div className="mt-4">
                <Label>Visualizations Generated This Month</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Any time you click "Generate Visualization"
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm">
                    {visualizationsThisMonth} / {visLimit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </div>
                </div>
                <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${visUsagePercentage >= 90 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${Math.min(visUsagePercentage, 100)}%` }}
                  />
                </div>
              </div>

              {plan === 'pro' && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="overageLimit">Monthly Overage Limit</Label>
                    <div className="text-xs text-muted-foreground">
                      Set a maximum monthly spending limit for usage beyond your plan's included quantities.
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Current overage: ${((currentUsage?.overage_this_month ?? 0)).toFixed(2)} / 
                      ${((currentUsage?.overage_hard_limit ?? 0)).toFixed(2)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="overageLimit"
                          type="number"
                          min="0"
                          step="1"
                          className="pl-7"
                          placeholder="0"
                          value={currentUsage?.overage_hard_limit || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            if (value === null || (value >= 0 && Number.isInteger(value))) {
                              updateOverageLimit(value);
                            }
                          }}
                          disabled={isUpdating}
                        />
                      </div>
                      {currentUsage?.overage_hard_limit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOverageLimit(null)}
                          disabled={isUpdating}
                        >
                          Remove Limit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold capitalize">{plan} Tier</p>
              </div>
              <div className="space-x-2">
                {plan === 'free' ? (
                  <Button
                    onClick={() => {
                      if (!SUBSCRIPTION_PLANS.PRO.priceId) {
                        toast({
                          title: "Error",
                          description: "Invalid subscription plan configuration",
                          className: "destructive",
                        })
                        return
                      }
                      checkout(SUBSCRIPTION_PLANS.PRO.priceId)
                    }}
                    disabled={isLoading || isSubscriptionLoading}
                  >
                    {isSubscriptionLoading ? (
                      <div className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        Processing...
                      </div>
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={openPortal}
                    disabled={isLoading || isPortalLoading}
                  >
                    {isPortalLoading ? (
                      <div className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        Loading Portal...
                      </div>
                    ) : (
                      'Manage Subscription'
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Plan Features */}
            <div className="mt-6 space-y-4">
              {/* <h4 className="font-medium">Plan Features</h4> */}
              <div className="grid gap-4 md:grid-cols-2">
                {plan === 'free' ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Upgrade to Pro:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 200 data processing requests/month</li>
                        <li>• 200 visualizations/month</li>
                        <li>• 200 input images/month</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pro Plan Includes:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 200 data processing requests/month</li>
                      <li>• 200 visualizations/month</li>
                      <li>• 200 input images/month</li>
                      <li>• Usage based pricing once limits reached</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Current Period */}
            {currentProfile?.current_period_end && (
              <div className="mt-4 text-sm text-muted-foreground">
                Current period ends on{' '}
                {new Date(currentProfile.current_period_end).toLocaleDateString()}
              </div>
            )}
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
                  <p className="text-xs text-muted-foreground">
                    When enabled, this application will append to the sheet that you have selected <br />
                   instead of adding a new sheet to the workbook.
                  </p>
                </div>
                <Switch
                  checked={currentProfile?.direct_sheet_modification ?? false}
                  onCheckedChange={(checked) => {
                    console.log('[UserAccountPage] Sheet modification toggle changed:', {
                      previousValue: currentProfile?.direct_sheet_modification,
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
