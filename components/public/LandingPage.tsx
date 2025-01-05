"use client"

import { useEffect, useRef } from 'react';
import Typed from 'typed.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PLAN_REQUEST_LIMITS, PLAN_IMAGE_LIMITS, VIS_GEN_LIMITS } from '@/lib/constants/pricing';
import Link from 'next/link';
import { EXAMPLE_QUERIES } from '@/components/authorized/DashboardPage';

export default function LandingPage() {
  const typedRef = useRef(null);

  useEffect(() => {
    const typed = new Typed(typedRef.current, {
      strings: EXAMPLE_QUERIES,
      typeSpeed: 40,
      backSpeed: 10,
      loop: true,
      backDelay: 1000, // Pause for 2 seconds after typing is complete
      loopCount: Infinity,
    });

    return () => {
      typed.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">SheetAssist</h1>
        <p className="text-xl md:text-1xl text-muted-foreground max-w-3xl mx-auto mb-12">
          Automates data entry, spreadsheet operations, and data visualization with AI.<br/> 
          Integrates with Google and Microsoft services. <br/> 
          Delivers consistent, reliable results. <br/>
          Saves you hours. 
        </p>
        <Button size="lg" asChild>
          <Link href="/login">Get Started</Link>
        </Button>
      </div>

      {/* Example Use Cases Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Capabilities</h2>
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Spreadsheet Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
              Merges, cleans, sorts, filters, and transforms spreadsheets given simple natural language commands. 
              Performs advanced functions like generating pivot tables, conducting statistical analyses, and running VLOOKUP-like operations.             
              </p>
      
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch Processing with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Extracts text and data from PDFs, images, and scanned documents with vision-enabled AI.
                Transfers dozens of pages of scanned documents to a spreadsheet in minutes.
              </p>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Generates data visualizations using intuitive styling with or without custom instructions.
              </p>
            </CardContent>
          </Card>


        </div>

        <div className="text-center mb-6">
          <p className="text-muted-foreground">Example Requests:</p>
        </div>
        
        <div className="h-20 flex items-center justify-center">
          <span 
            ref={typedRef}
            className="text-xl md:text-2xl text-primary"
          />
        </div>
      </div>

      {/* Plans Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Plans</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                  <span>{PLAN_REQUEST_LIMITS.free} standard requests per month</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>{VIS_GEN_LIMITS.free} visualizations per month</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>{PLAN_IMAGE_LIMITS.free} input images per month</span>
                </li>
              </ul>
              <Button className="w-full mt-6" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="relative border-primary">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <div className="text-3xl font-bold">$10<span className="text-xl font-normal">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>{PLAN_REQUEST_LIMITS.pro} standard requests per month</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>{VIS_GEN_LIMITS.pro} visualizations per month</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>{PLAN_IMAGE_LIMITS.pro} input images per month</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Usage based pricing once limits reached</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Cancel any time</span>
                </li>
              </ul>
              <Button className="w-full mt-6" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Business Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Business</CardTitle>
              <div className="text-3xl font-bold">Varies</div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Custom volume</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2" />
                  <span>Custom integrations</span>
                </li>
              </ul>
              <Button className="w-full mt-6" variant="outline" asChild>
                <Link href="/contact">Contact Us</Link>
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