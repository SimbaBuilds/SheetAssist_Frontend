import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import { Toaster } from "@/components/ui/use-toast"
import { Suspense } from 'react'
import { LoadingSpinner } from "@/components/public/LoadingSpinner";
import Analytics from "@/components/analytics/Analytics";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: "SheetAssist",
  description: "AI-powered spreadsheet automation and data visualization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Analytics />
        <Suspense fallback={<LoadingSpinner />}>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
