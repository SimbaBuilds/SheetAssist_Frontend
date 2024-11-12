'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserAccount } from '@/hooks/useUserAccount'
import { useState } from 'react'

export function UserAccountPage() {
  const {
    isLoading,
    userProfile,
    userUsage,
    isUpdating,
    updateUserName,
    handleGooglePermissions,
    handleMicrosoftPermissions,
  } = useUserAccount()

  const [firstName, setFirstName] = useState(userProfile?.first_name || '')
  const [lastName, setLastName] = useState(userProfile?.last_name || '')

  if (isLoading) {
    return <AccountPageSkeleton />
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <h1 className="text-3xl font-bold">Account Settings</h1>

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
                {userProfile?.google_permissions_set ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <Button
              variant={userProfile?.google_permissions_set ? "outline" : "default"}
              onClick={handleGooglePermissions}
              disabled={userProfile?.google_permissions_set}
            >
              {userProfile?.google_permissions_set ? 'Connected' : 'Connect'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Microsoft Integration</h3>
              <p className="text-sm text-muted-foreground">
                {userProfile?.microsoft_permissions_set ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <Button
              variant={userProfile?.microsoft_permissions_set ? "outline" : "default"}
              onClick={handleMicrosoftPermissions}
              disabled={userProfile?.microsoft_permissions_set}
            >
              {userProfile?.microsoft_permissions_set ? 'Connected' : 'Connect'}
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
              <p className="text-2xl font-bold">{userUsage?.requests_this_week || 0}</p>
            </div>
            <div>
              <h3 className="font-medium">Requests This Month</h3>
              <p className="text-2xl font-bold">{userUsage?.requests_this_month || 0}</p>
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
              <p className="text-2xl font-bold capitalize">{userProfile?.plan || 'Free'}</p>
            </div>
            <Button variant="outline">
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountPageSkeleton() {
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    </div>
  )
}
