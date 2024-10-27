"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DemosPage() {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Reggie in Action</h1>
      <Tabs defaultValue="digitization" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="digitization">Digitization Process</TabsTrigger>
          <TabsTrigger value="assistant">Reggie Assistant</TabsTrigger>
        </TabsList>
        <TabsContent value="digitization">
          <Card>
            <CardHeader>
              <CardTitle>Digitization Demos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-w-16 aspect-h-9 mb-6">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <p className="mb-4">
                Watch our step-by-step guide on how to digitize your paper records using Reggie's efficient process.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assistant">
          <Card>
            <CardHeader>
              <CardTitle>Reggie Assistant Demo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-w-16 aspect-h-9 mb-6">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <p className="mb-4">
                See Reggie's spreadsheet skills in action and learn how it can save hours of work for your team.
              </p>
              <Button onClick={() => setShowInstructions(!showInstructions)}>
                {showInstructions ? 'Hide Instructions' : 'Try Reggie Assistant'}
              </Button>
              {showInstructions && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
                  <ol className="list-decimal list-inside">
                    <li>Sign up for a Reggie account</li>
                    <li>Grant necessary permissions</li>
                    <li>Follow the on-screen instructions to use Reggie's spreadsheet capabilities</li>
                    <li>You'll get 10 free emails to Reggie without signing up for a plan</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}