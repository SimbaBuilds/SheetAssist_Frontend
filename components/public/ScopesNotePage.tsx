'use client'
export const dynamic = 'force-dynamic'

import Link from "next/link"


export default function ScopesNotePage() {
  return (
    <div className="container max-w-3xl mx-auto py-4 space-y-6 pt-20">
      <div className="space-y-3 text-left">
        <h1 className="text-2xl font-bold">Note on Google and Microsoft Permissions</h1>
        <p className="text-sm text-foreground">
           This application can integrate with your Google and Microsoft services to further streamline your workflows. Due to limitations in these services&apos; permission systems, we must request broader access than ideal:
        </p>
        <ul className="list-disc pl-10 text-sm text-foreground space-y-2">
          <li>Google Drive: Google&apos;s drive.file scope (designed for file-specific permissions) allows reading to user specified files but not writing to them. To append data to your spreadsheets, we must request write access to all your spreadsheets.  Unfortunately, this Google scope also includes “delete” access.  Additionally, we ask for drive read-all access for our document and sheet title fetching feature in the dashboard interface.</li>
          <li>Microsoft OneDrive: Microsoft appears to provide more granular permissions, but, unfortunately, their user consent screen still states, “read, write, and delete all files the user has access to,” even when the user specifies only file-specific permissions.</li>
        </ul>
      </div>
      <div className="space-y-4">
        <div className="space-y-3 text-left">
          {/* <h2 className="text-lg font-semibold">Your Data and Privacy</h2> */}
          <p className="text-sm text-foreground">
           All the above notwithstanding:
          </p>
          <ul className="list-disc pl-10 text-sm text-foreground space-y-2">
            <li>This application can only append (using &quot;true append&quot; functions) data to an online sheet or add data to a newly created sheet in a workbook. <strong>This application cannot delete, store, or modify your online files.</strong></li>
            <li>Furthermore, the AI language models working on the backend do not have direct access to your files.  They work only with preprocessed versions of your data, and they are given some of your request details as context—the models cannot &quot;go rogue&quot; and perform direct actions on your files.</li>
          </ul>
          <p className="text-sm text-foreground">
           If you have any questions about the above, please <Link href="/contact-us" className="underline hover:text-primary">contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
