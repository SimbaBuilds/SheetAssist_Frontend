'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserAccount } from '@/hooks/useUserAccount'
import { useState } from 'react'
import type { UserProfile, UserUsage     } from '@/types/supabase_tables'
import type { User } from '@supabase/supabase-js'

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
  } = useUserAccount({ 
    initialProfile: profile,
    initialUsage: usage,
    user 
  })

  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')

  const currentProfile = isLoading ? profile : userProfile

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
            <CardDescription>Update your personal information</CardDescription>
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
            <CardDescription>Manage your service connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Google Integration</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.google_permissions_set ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <Button
                variant={profile.google_permissions_set ? "outline" : "default"}
                onClick={handleGooglePermissions}
                disabled={profile.google_permissions_set}
              >
                {profile.google_permissions_set ? 'Connected' : 'Connect'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Microsoft Integration</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.microsoft_permissions_set ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <Button
                variant={profile.microsoft_permissions_set ? "outline" : "default"}
                onClick={handleMicrosoftPermissions}
                disabled={profile.microsoft_permissions_set}
              >
                {profile.microsoft_permissions_set ? 'Connected' : 'Connect'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Your current usage metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Requests This Week</h3>
                <p className="text-2xl font-bold">
                  {usage?.requests_this_week ?? 0}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Requests This Month</h3>
                <p className="text-2xl font-bold">
                  {usage?.requests_this_month ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Your current plan and usage limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Current Plan</h3>
                <p className="text-2xl font-bold capitalize">{profile.plan || 'Free'}</p>
              </div>
              <Button variant="outline">
                Upgrade Plan
              </Button>
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
