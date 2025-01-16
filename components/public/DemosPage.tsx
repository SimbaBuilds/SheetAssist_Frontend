'use client'
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

interface VideoDemo {
  title: string;
  description: string;
  youtubeId: string;
  url: string;
}

const demoVideos: Record<string, VideoDemo[]> = {
  "Batch Processing with AI": [
    {
      title: "",
      description: "",
      youtubeId: "MWcOGVkues4",
      url: "https://youtu.be/MWcOGVkues4"
    }
  ],
  "Spreadsheet Operations": [
    {
      title: "Text-Based PDF",
      description: "Convert long text-based PDFs to sheets",
      youtubeId: "tQ7oQQkNo3U",
      url: "https://youtu.be/tQ7oQQkNo3U"
    },
    {
      title: "Sheet Operation (Mock Student Data)",
      description: "",
      youtubeId: "bPjA79I2vas",
      url: "https://youtu.be/bPjA79I2vas"
    },
    {
      title: "Sheet Operation (Merge -- .csv to .xlsx)",
      description: "If you are not comfortable or cannot give us access to your Google/Microsoft files, SheetAssist can still automate your workflows",
      youtubeId: "n8Azg2f1ghU",
      url: "https://youtu.be/n8Azg2f1ghU"
    },
    {
      title: "Complex Prompt",
      description: "Give nuanced requests to our AI powered application -- we look forward to seeing what interesting requests you come up with!",
      youtubeId: "3ifN5SSA22Q",
      url: "https://youtu.be/3ifN5SSA22Q"
    }
  ],
  "Data Visualization": [
    {
      title: "",
      description: "",
      youtubeId: "pWZ7yMLMaQg",
      url: "https://youtu.be/pWZ7yMLMaQg"
    }
  ]
}

const demoFeatures = [
  {
    title: "Batch Processing with AI",
    description: "Vision-Enabled Document Processing",
    details: [
      "Extracts text and data from PDFs, images, and scanned documents with vision-enabled AI",
      "Transfers dozens of pages of scanned documents to a spreadsheet in minutes"
    ]
  },
  {
    title: "Spreadsheet Operations",
    description: "Advanced Spreadsheet Management",
    details: [
      "Merges, cleans, sorts, filters, and transforms spreadsheets given simple natural language commands",
      "Performs advanced functions like generating pivot tables, conducting statistical analyses, and running VLOOKUP-like operations"
    ]
  },
  {
    title: "Data Visualization",
    description: "Intuitive Visual Analytics",
    details: [
      "Generates data visualizations using intuitive styling with or without custom instructions"
    ]
  }
]

function VideoCard({ video }: { video: VideoDemo }) {
  return (
    <div className="space-y-4">
      <Link href={video.url} target="_blank" rel="noopener noreferrer">
        <div className="relative aspect-video overflow-hidden rounded-lg hover:opacity-90 transition-opacity">
          <Image
            src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
            alt={video.title}
            fill
            className="object-cover"
          />
        </div>
      </Link>
      <div className="space-y-2">
        <h3 className="font-medium text-sm">{video.title}</h3>
        <p className="text-sm text-muted-foreground">{video.description}</p>
      </div>
    </div>
  )
}

export function DemosPage() {
  return (
    <div className="container max-w-3xl mx-auto py-4 space-y-8 pt-20">
      <div className="space-y-3 text-left">
        <h1 className="text-2xl font-bold">Product Demos</h1>
        {/* <p className="text-sm text-foreground">
          Explore our key features and see how they can transform your data management workflow:
        </p> */}
      </div>

      <div className="space-y-16">
        {demoFeatures.map((feature, index) => (
          <div key={index} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 text-sm text-foreground space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex}>{detail}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="grid gap-8 sm:grid-cols-2">
              {demoVideos[feature.title]?.map((video, videoIndex) => (
                <VideoCard key={videoIndex} video={video} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-6">
        <p className="text-sm text-foreground">
          Ready to get started? <Link href="/auth/signup" className="underline hover:text-primary">Sign up now</Link> or <Link href="/contact-us" className="underline hover:text-primary">contact us</Link> to learn more about how we can help streamline your workflow.
        </p>
      </div>
    </div>
  )
}
