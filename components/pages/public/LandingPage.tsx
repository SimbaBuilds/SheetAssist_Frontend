"use client"

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">AI File</h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12">
          AI tool for your spreadsheets, pdfs, text documents, and images. 
          Integrate with Google and Microsoft services. 
          Instantly transfer images to spreadsheets. 
          Combine/convert spreadsheets and pdfs.
        </p>
        <Button size="lg" asChild>
          <Link href="/login">Get Started</Link>
        </Button>
      </div>

      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <div className="text-3xl font-bold">$0</div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>10 tasks per month</span>
                </li>
                {/* <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Basic features</span>
                </li> */}
              </ul>
              <Button className="w-full mt-6" variant="outline" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Base Tier */}
          <Card className="relative border-primary">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground rounded-full text-sm">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle>Base</CardTitle>
              <div className="text-3xl font-bold">$10<span className="text-xl font-normal">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>200 tasks per month</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Two week free trial</span>
                </li>
                {/* <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>All features included</span>
                </li> */}
              </ul>
              <Button className="w-full mt-6" asChild>
                <Link href="/login">Start Free Trial</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <div className="text-3xl font-bold">$20<span className="text-xl font-normal">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>1000 tasks per month</span>
                </li>
                {/* <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Priority support</span>
                </li> */}
                {/* <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>All features included</span>
                </li> */}
              </ul>
              <Button className="w-full mt-6" variant="outline" asChild>
                <Link href="/login">Get Pro</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}