import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDashboard } from '@/hooks/useDashboard';
import { useSetupPermissions } from '@/hooks/useSetupPermissions';
import { PlusIcon, ArrowTopRightOnSquareIcon as ExternalLinkIcon } from '@heroicons/react/24/outline'
import type { DownloadFileType } from '@/types/dashboard'
import { DOWNLOAD_FILE_TYPES, ACCEPTED_FILE_EXTENSIONS } from '@/constants/file-types'
import { ProcessingResultDialog } from '@/components/authorized/ProcessingResultDialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_QUERY_LENGTH = 500

const EXAMPLE_QUERIES = [
  "Add this to the sheet",
  "Populate the student sheet with phone numbers from the household contacts sheet",
  "Convert this pdf to a sheet with headers product, units sold, and revenue.",
  "Combine these pdfs into one large pdf and sort the pages alphabetically by last name",
  "Extract all unpaid invoices from the finance sheet",
  "Combine these",
  "Match client ID from the contract sheet to populate missing addresses in the billing sheet",
  "Convert this directory of legal case PDFs into a single document with descriptive headers",
  "Add new clients from this CSV to the existing CRM sheet, avoiding duplicates by matching email addresses",
  "Extract contact information for all vendors and group by service type from the procurement sheet",
  "Create a performance summary by combining employee evaluation scores from each department sheet",
  "Filter and count items sold per category in the product sales sheet, summarizing by month"
]

type DashboardPageProps = {
  initialData?: any // Type this according to your data structure
}

type OutputType = 'download' | 'online' | null

export function DashboardPage({ initialData }: DashboardPageProps) {
  const {
    showPermissionsPrompt,
    setShowPermissionsPrompt,
    files,
    setFiles,
    urls,
    query,
    setQuery,
    outputType,
    setOutputType,
    outputUrl,
    setOutputUrl,
    isProcessing,
    error,
    permissions,
    urlPermissionError,
    handleFileChange,
    handleUrlChange,
    handleSubmit,
    recentUrls,
    downloadFileType,
    setDownloadFileType,
    fileErrors,
    outputTypeError,
    setOutputTypeError,
    processedResult,
    showResultDialog,
    setShowResultDialog,
    allowSheetModification,
    setAllowSheetModification,
  } = useDashboard(initialData)

  const {
    handleGoogleSetup,
    handleMicrosoftSetup,
  } = useSetupPermissions()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {showPermissionsPrompt && (
        <div className="mb-8 p-4 border rounded-lg bg-yellow-50">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Set Up Integrations</h3>
                <p className="text-sm text-gray-600">
                  Connect your accounts to work with your documents and spreadsheets.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPermissionsPrompt(false)}
              >
                Dismiss
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-4 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Google Integration</h4>
                    <p className="text-sm text-gray-500">Google Docs & Sheets</p>
                  </div>
                  {permissions.google ? (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleGoogleSetup}
                    >
                      Connect Google
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Microsoft Integration</h4>
                    <p className="text-sm text-gray-500">Excel & Word Online</p>
                  </div>
                  {permissions.microsoft ? (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleMicrosoftSetup}
                    >
                      Connect Microsoft
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* <h1 className="text-2xl font-bold mb-8">AI File Processing</h1> */}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Input */}
        <div>
          <Label htmlFor="files">
            Upload Files (Max {MAX_FILES} files, Max {MAX_FILE_SIZE / 1024 / 1024}MB each)
          </Label>
          <div className="mt-1 space-y-2">
            <Input
              id="files"
              type="file"
              multiple
              accept={ACCEPTED_FILE_EXTENSIONS}
              onChange={handleFileChange}
              className={`${fileErrors.length > 0 ? 'border-red-500' : ''}`}
            />
            
            {fileErrors.length > 0 && (
              <div className="text-sm text-red-500 space-y-1">
                {fileErrors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error.error}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-sm text-gray-500">
              Accepted file types: .txt, .docx, .json, .pdf, .csv, .xlsx, .png, .jpeg, .jpg
            </div>

            {files.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Selected files:</p>
                <ul className="text-sm text-gray-600">
                  {files.map((file, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-400">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Recent URLs */}
        {recentUrls.length > 0 && (
          <div className="mb-4">
            <Label>Recent URLs</Label>
            <div className="mt-2 space-y-2">
              {recentUrls.map((url, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 group"
                >
                  <span className="text-sm text-gray-600 truncate flex-1">
                    {url}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Find an empty URL input or add to the end
                        const emptyIndex = urls.findIndex(u => !u)
                        const targetIndex = emptyIndex >= 0 ? emptyIndex : urls.length - 1
                        handleUrlChange(targetIndex, url)
                      }}
                      className="h-7 px-2"
                    >
                      <span className="sr-only">Use URL</span>
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open(url, '_blank')
                      }}
                      className="h-7 px-2"
                    >
                      <span className="sr-only">Open URL</span>
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* URL Inputs */}
        <div>
          <Label>URLs (Google Sheet, Excel Online, Google Doc, or Microsoft Word Online -- max 10 URLs)</Label>
          {urls.map((url, index) => (
            <Input
              key={index}
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder="Enter URL(s)"
              className={`mt-1 ${urlPermissionError && url ? 'border-red-500' : ''}`}
            />
          ))}
          {urlPermissionError && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
              {urlPermissionError}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-primary hover:text-primary/90 p-0 h-auto font-normal"
                onClick={() => {
                  if (urlPermissionError.includes('Google')) {
                    handleGoogleSetup()
                  } else if (urlPermissionError.includes('Microsoft')) {
                    handleMicrosoftSetup()
                  }
                }}
              >
                Connect now
              </Button>
            </div>
          )}
        </div>

        {/* Query Input */}
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="query">What can we do for you?</Label>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" size="sm">
                  See examples
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Example Queries</DialogTitle>
                </DialogHeader>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {EXAMPLE_QUERIES.map((query, index) => (
                    <li
                      key={index}
                      className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        setQuery(query)
                        const dialogClose = document.querySelector('[data-dialog-close]') as HTMLButtonElement
                        dialogClose?.click()
                      }}
                    >
                      {query}
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
          </div>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={MAX_QUERY_LENGTH}
            className="w-full mt-1 p-2 border rounded-md"
            rows={3}
            required
          />
          <div className="text-sm text-gray-500 text-right">
            {query.length}/{MAX_QUERY_LENGTH}
          </div>
        </div>

        {/* Output Type Selection */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Output Preference</Label>
            {outputTypeError && (
              <span className="text-sm text-red-500 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                {outputTypeError}
              </span>
            )}
          </div>
          <RadioGroup 
            value={outputType ?? undefined}
            onValueChange={(value) => {
              setOutputType(value as 'download' | 'online')
              setOutputTypeError(null)
            }}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="download" id="download" />
              <Label htmlFor="download">Downloadable File</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="online" id="online" />
              <Label htmlFor="online">
                {allowSheetModification ? (
                  <div className="flex items-center gap-2">
                    <span>Modify Existing Sheet</span>
                    <Badge variant="secondary" className="text-xs">
                      Direct Modification
                    </Badge>
                  </div>
                ) : (
                  "Add as New Sheet"
                )}
              </Label>
            </div>
          </RadioGroup>

          {outputType === 'download' && (
            <div className="pl-6">
              <Label className="mb-2">Select File Type</Label>
              <RadioGroup 
                value={downloadFileType} 
                onValueChange={(value: DownloadFileType) => {
                  setDownloadFileType(value)
                  setOutputTypeError(null)
                }}
                className="space-y-2"
              >
                {DOWNLOAD_FILE_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={`file-type-${type.value}`} />
                    <Label htmlFor={`file-type-${type.value}`}>{type.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {outputType === 'online' && allowSheetModification && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Changes will be made directly to the existing sheet. Make sure you have a backup.
              </AlertDescription>
            </Alert>
          )}

          {outputType === 'online' && (
            <div className="space-y-2">
              <Input
                type="url"
                value={outputUrl}
                onChange={(e) => {
                  setOutputUrl(e.target.value)
                  setOutputTypeError(null)
                }}
                placeholder="Enter destination URL"
                className={`mt-2 ${outputTypeError && !outputUrl ? 'border-red-500' : ''}`}
                required
              />
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? 'Processing...' : 'Submit'}
        </Button>
      </form>

      <ProcessingResultDialog
        result={processedResult}
        isOpen={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        outputType={outputType}
      />
    </div>
  )
}
