"use client"

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDigit, Clock, Database } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="container mx-auto px-6 py-12">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 text-primary">Welcome to Spreadsheet Assist</h1>
        <p className="text-2xl mb-8 text-secondary-foreground">Streamline Your Data Processing Workflows</p>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex justify-center space-x-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6">Get Started</Button>
            </Link>
            <Link href="/demos">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">Watch Demos</Button>
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/try-spreadsheet-assist">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">Try for Free</Button>
            </Link>
            <p className="text-sm mt-2 text-muted-foreground">
              Free service includes 10 free actions per month.
            </p>
          </div>
        </div>
      </section>   


      <section className="mb-16">
        <h2 className="text-4xl font-semibold mb-8 text-center text-primary">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-card dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <FileDigit className="mr-2 h-8 w-8 text-primary" />
                Timely Digitization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">No 4 month lead time: have your records digitized as soon as you can scan them in.</p>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-gray-800">
          <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Database className="mr-2 h-8 w-8 text-primary" />
                Efficient Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">No more jam-packed file rooms. Store all your records digitally and access them with ease.</p>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-gray-800">
          <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Clock className="mr-2 h-8 w-8 text-primary" />
                Time-Saving Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">Save hours of labor per week for your team with Reggie, your records manager, spreadsheet expert, and email assistant.</p>
            </CardContent>
          </Card>
        </div>
      </section>



      <section className="mb-16">
        <h2 className="text-4xl font-semibold mb-8 text-center text-primary">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-card dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl">Digitization for Smaller Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-4 text-primary">$100</p>
              <p className="text-lg">One-time fee for digitization service.</p>
              <p className="text-lg">For organizations with less than 1000 people (staff and students).</p>
              <Button className="mt-4 text-lg px-6 py-3">Choose Option</Button>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl">Reggie Assistant for Smaller Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-4 text-primary">$40/month</p>
              <p className="text-lg">Includes Reggie assistant and digitization.</p>
              <p className="text-lg">For organizations with less than 1000 people (staff and students).</p>
              <Button className="mt-4 text-lg px-6 py-3">Choose Plan</Button>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl">Digitization and Reggie Assistant for Larger Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-4 text-primary">Pricing Varies</p>
              <p className="text-lg">For organizations with 1000+ people.</p>
              <p className="text-lg">See pricing <Link href="/pricing-details" className="underline text-primary hover:text-primary/80">details</Link>.</p>
              <Button className="mt-4 text-lg px-6 py-3">Choose Plan</Button>
            </CardContent>
          </Card>
        </div>
      </section>



    </div>
  );
}
