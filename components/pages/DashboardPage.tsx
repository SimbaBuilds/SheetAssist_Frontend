import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const ACCEPTED_FILE_TYPES = '.xlsx,.csv,.json,.docx,.txt,.pdf,.jpeg,.png'
const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_QUERY_LENGTH = 500

const EXAMPLE_QUERIES = [
  "Add this receipt to the sheet",
  "Match the student number to populate the grades sheet with phone numbers from the household contacts sheet",
  "Convert this pdf to a sheet with headers 'teacher' 'course load'",
  "Combine these pdfs into one large pdf and sort the pages alphabetically by last name",
  "Extract all unpaid invoices from the finance sheet",
  "Match client ID from the contract sheet to populate missing addresses in the billing sheet",
  "Convert this directory of legal case PDFs into a single document and create a table of contents by case name",
  "Pull employee contact info from the HR sheet and create a phone directory sorted by department",
  "Add new clients from this CSV to the existing CRM sheet, avoiding duplicates by matching email addresses",
  "Extract contact information for all vendors and group by service type from the procurement sheet",
  "Create a performance summary by combining employee evaluation scores from each department sheet",
  "Generate a summary of outstanding balances by client from the accounts receivable sheet and sort by due date",
  "Filter and count items sold per category in the product sales sheet, summarizing by month"
]

export function DashboardPage() {
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([''])
  const [query, setQuery] = useState('')
  const [outputType, setOutputType] = useState<'download' | 'online'>('download')
  const [outputUrl, setOutputUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    const invalidFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE)
    if (invalidFiles.length > 0) {
      setError(`Some files exceed the ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
      return
    }

    setFiles(prev => [...prev, ...selectedFiles])
    setError('')
  }

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)

    // Add new empty field if last field is filled and we haven't reached MAX_FILES
    if (index === urls.length - 1 && value && urls.length < MAX_FILES) {
      setUrls([...newUrls, ''])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError('')

    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      urls.filter(url => url).forEach(url => formData.append('urls', url))
      formData.append('query', query)
      formData.append('outputType', outputType)
      if (outputType === 'online') {
        formData.append('outputUrl', outputUrl)
      }

      // TODO: Implement API call
      console.log('Submitting form data:', {
        files: files.map(f => f.name),
        urls: urls.filter(url => url),
        query,
        outputType,
        outputUrl
      })

    } catch (error) {
      setError('An error occurred while processing your request')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">AI File Processing</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Input */}
        <div>
          <Label htmlFor="files">Upload Files (Max {MAX_FILES} files, {MAX_FILE_SIZE / 1024 / 1024}MB each)</Label>
          <Input
            id="files"
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileChange}
            className="mt-1"
          />
          {files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Selected files:</p>
              <ul className="text-sm text-gray-600">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {file.name}
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

        {/* URL Inputs */}
        <div>
          <Label>URLs (Excel Online, Google Sheets, etc.)</Label>
          {urls.map((url, index) => (
            <Input
              key={index}
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder="Enter URL"
              className="mt-1"
            />
          ))}
        </div>

        {/* Query Input */}
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="query">What would you like to do?</Label>
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
        <div>
          <Label>Output Preference</Label>
          <RadioGroup value={outputType} onValueChange={(value: 'download' | 'online') => setOutputType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="download" id="download" />
              <Label htmlFor="download">Download File</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="online" id="online" />
              <Label htmlFor="online">Add to Online Document</Label>
            </div>
          </RadioGroup>

          {outputType === 'online' && (
            <Input
              type="url"
              value={outputUrl}
              onChange={(e) => setOutputUrl(e.target.value)}
              placeholder="Enter destination document URL"
              className="mt-2"
              required
            />
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? 'Processing...' : 'Process Files'}
        </Button>
      </form>
    </div>
  )
}
