import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDashboard } from '@/hooks/useDashboard'
import { useSetupPermissions } from '@/hooks/useSetupPermissions'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { DownloadFileType, SheetTitleKey } from '@/types/dashboard'
import { DOWNLOAD_FILE_TYPES, ACCEPTED_FILE_EXTENSIONS } from '@/constants/file-types'
import { ProcessingResultDialog } from '@/components/authorized/ProcessingResultDialog'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from 'react'
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from 'lucide-react'
import {
  Command,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SheetSelector } from '@/components/SheetSelector'

const formatDisplayTitle = (doc_name: string, sheet_name?: string): string => {
  if (sheet_name) {
    return `${doc_name} - ${sheet_name}`;
  }
  return doc_name;
}

const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_QUERY_LENGTH = 500

const EXAMPLE_QUERIES = [
  "Add this to the sheet",
  "Add this pdf to the word doc",
  "Convert this pdf to a sheet with headers product, units sold, and revenue.",
  "Remove all rows where the 'Status' column is marked as 'Inactive'.",
  "Create a performance summary by combining employee evaluation scores from each department sheet",
  "Filter rows where the 'Email' column contains '.edu' and export them to a new sheet",
  "Extract all unpaid invoices from the finance sheet",
  "Remove duplicate entries based on the 'Employee ID' column", 
  "Merge rows by ID",
  "Combine these into one document",
  "Populate the student sheet with phone numbers from the household contacts sheet",
  "Match client ID from the contract sheet to populate missing addresses in the billing sheet",
  "Highlight rows where the 'Sales' column exceeds $10,000.", 
  "Convert this directory of legal case PDFs into a single document with descriptive headers",
  "Sort the spreadsheet by the 'Date' column in descending order.", 
  "Add new clients from this CSV to the existing CRM sheet, avoiding duplicates by matching email addresses",
  "Extract contact information for all vendors and group by service type from the procurement sheet",
  "Filter and count items sold per category in the product sales sheet, summarizing by month"
]



export default function DashboardPage() {
  const {
    urls,
    query,
    files,
    error,
    outputType,
    outputUrl,
    isProcessing,
    showPermissionsPrompt,
    urlPermissionError,
    urlValidationError,
    recentUrls,
    documentTitles,
    downloadFileType,
    fileErrors,
    outputTypeError,
    processedResult,
    showResultDialog,
    allowSheetModification,
    showModificationWarning,
    destinationUrlError,
    isLoadingTitles,
    availableSheets,
    showSheetSelector,
    selectedUrl,
    permissions,
    setShowPermissionsPrompt,
    setFiles,
    setQuery,
    setOutputType,
    setDownloadFileType,
    setOutputTypeError,
    setShowResultDialog,
    setAllowSheetModification,
    setShowModificationWarning,
    setShowSheetSelector,
    handleSheetSelection,
    handleFileChange,
    handleUrlChange,
    handleUrlFocus,
    handleSubmit,
    addUrlField,
    removeUrlField,
    handleOutputUrlChange,
    handleWarningAcknowledgment,
    continueSubmitAfterWarning,

  } = useDashboard()

  const {
    handleGoogleSetup,
    handleMicrosoftSetup,
  } = useSetupPermissions()

  const [dontShowAgain, setDontShowAgain] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {showPermissionsPrompt && (
        <div className="mb-8 p-4 border rounded-lg bg-yellow-50">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Set Up Integrations</h3>
                <p className="text-sm text-gray-600">
                  Connect your accounts to work with your spreadsheets.
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
                    <p className="text-sm text-gray-500">Google Sheets</p>
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
                    <p className="text-sm text-gray-500">Excel Online</p>
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
      
      <form onSubmit={(e) => {
        e.preventDefault();
        const hasFiles = files.length > 0;
        const hasUrls = urls.some(url => url && url.trim() !== '');
        
        if (!hasFiles && !hasUrls) {
          setOutputTypeError('Please attach a file or enter a URL');
          return;
        }
        
        handleSubmit(e);
      }} className="space-y-6">
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
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.22z"
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

        {/* URL Inputs */}
        <div className="space-y-4">
          <Label>Input URLs</Label>
          <div className="space-y-2">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="relative w-full">
                        <Input
                          type="url"
                          value={url}
                          onChange={(e) => handleUrlChange(index, e.target.value)}
                          onFocus={handleUrlFocus}
                          placeholder="Enter spreadsheet URL"
                          className="w-full"
                        />
                        {url && documentTitles[url] && (
                          <p className="mt-1 text-sm text-gray-600">
                            {documentTitles[url]}
                          </p>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Command>
                        <CommandGroup>
                          {isLoadingTitles ? (
                            <CommandItem disabled>Loading recent documents...</CommandItem>
                          ) : (
                            recentUrls.map((recentUrl) => (
                              <CommandItem
                                key={recentUrl.url}
                                value={recentUrl.url}
                                onSelect={() => handleUrlChange(index, recentUrl.url)}
                              >
                                {recentUrl.doc_name ? formatDisplayTitle(recentUrl.doc_name, recentUrl.sheet_name) : recentUrl.url}
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {urls.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeUrlField(index)}
                  >
                    ×
                  </Button>
                )}
                {index === urls.length - 1 && urls.length < MAX_FILES && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addUrlField}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {urlPermissionError && (
            <div className="text-red-500 text-sm">{urlPermissionError}</div>
          )}
          {urlValidationError && (
            <div className="text-red-500 text-sm">{urlValidationError}</div>
          )}
        </div>

        {/* Sheet Selector */}
        <SheetSelector
          url={selectedUrl}
          sheets={availableSheets[selectedUrl] || []}
          onSelect={handleSheetSelection}
          onClose={() => setShowSheetSelector(false)}
          open={showSheetSelector}
        />

        {/* Query Input */}
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="query">What can we do for you?</Label>
            <div className="flex gap-2 items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setQuery('')}
                type="button"
                disabled={!query}
              >
                Clear
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm">
                    See examples
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
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
            <Label>Output Preferences</Label>
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
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.22z"
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
                    <span>Online Spreadsheet</span>
                    <Badge variant="secondary" className="text-xs">
                      Direct Modification Enabled
                    </Badge>
                  </div>
                ) : (
                  "Online Spreadsheet"
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

          {outputType === 'online' && (
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <div className="relative w-full">
                    <Input
                      type="url"
                      value={outputUrl}
                      onChange={(e) => {
                        handleOutputUrlChange(e.target.value)
                        setOutputTypeError(null)
                      }}
                      onFocus={handleUrlFocus}
                      placeholder="Enter destination spreadsheet URL"
                      className="w-full"
                    />
                    {outputUrl && documentTitles[outputUrl] && (
                      <p className="mt-1 text-sm text-gray-600">
                        {documentTitles[outputUrl]}
                      </p>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandGroup>
                      {isLoadingTitles ? (
                        <CommandItem disabled>Loading recent documents...</CommandItem>
                      ) : (
                        recentUrls.map((recentUrl) => (
                          <CommandItem
                            key={recentUrl.url}
                            value={recentUrl.url}
                            onSelect={() => handleOutputUrlChange(recentUrl.url)}
                          >
                            {recentUrl.doc_name ? formatDisplayTitle(recentUrl.doc_name, recentUrl.sheet_name) : recentUrl.url}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {destinationUrlError && (
                <div className="text-red-500 text-sm mt-2">{destinationUrlError}</div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Append to Existing Sheet</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          When enabled, this application will append to an existing sheet instead of adding a new sheet to the workbook.  
                          Note: For Google Sheets, data will be appended to the sheet at the URL provided as Google URLs are sheet specific, Microsoft Excel URLs are sheet agnostic and data will always be appended to the first sheet in the workbook.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={allowSheetModification}
                  onCheckedChange={(checked) => {
                    console.log('[DashboardPage] Sheet modification toggle changed:', {
                      previousValue: allowSheetModification,
                      newValue: checked
                    })
                    setAllowSheetModification(checked)
                  }}
                  disabled={isProcessing}
                />
              </div>
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
        isOpen={isProcessing || showResultDialog}
        onClose={() => setShowResultDialog(false)}
        outputType={outputType}
        isLoading={isProcessing}
        destinationTitle={outputUrl ? documentTitles[outputUrl] : undefined}
      />

      {showModificationWarning && (
        <AlertDialog 
          open={showModificationWarning} 
          onOpenChange={(open) => {
            console.log('[DashboardPage] Modification warning dialog state changed:', {
              previousState: showModificationWarning,
              newState: open
            })
            setShowModificationWarning(open)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Warning: Direct Sheet Modification</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  You have sheet modification enabled. This application will append to an existing sheet 
                  instead of creating a new sheet in the workbook.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dontShowAgain"
                    checked={dontShowAgain}
                    onCheckedChange={(checked: boolean | 'indeterminate') => setDontShowAgain(checked as boolean)}
                  />
                  <label
                    htmlFor="dontShowAgain"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Don&apos;t show this warning again
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleWarningAcknowledgment(dontShowAgain)
                  continueSubmitAfterWarning()
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
