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
import { useRouter } from 'next/navigation'



const MAX_FILES = 5
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
    selectedUrlPairs,
    selectedOutputSheet,
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
    handleOutputUrlChange,
    handleWarningAcknowledgment,
    continueSubmitAfterWarning,
    formatTitleKey,
    formatDisplayTitle,    
    isRetrievingData,
    removeSelectedUrlPair,
    updateSheetModificationPreference,
    isUpdating,
  } = useDashboard()

  const {
    handleGoogleSetup,
    handleMicrosoftSetup,
  } = useSetupPermissions()

  const [dontShowAgain, setDontShowAgain] = useState(false)
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* {showPermissionsPrompt && (
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
      )} */}

      {/* <h1 className="text-2xl font-bold mb-8">AI File Processing</h1> */}
      
      <form onSubmit={(e) => {
        e.preventDefault();
        const hasFiles = files.length > 0;
        const hasInputUrls = selectedUrlPairs.length > 0;
        
        if (!hasFiles && !hasInputUrls) {
          setOutputTypeError('Please attach a file or select an input URL');
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
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="url">Input Sheet URLs</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      Google Sheet URLs are sheet specific — please use the address specific to the URL. Microsoft Office URLs are sheet agnostic -- you will be prompted to select the desired sheet.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="mt-1">
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="text"
                  value={urls[0]}
                  onChange={(e) => handleUrlChange(0, e.target.value)}
                  onFocus={handleUrlFocus}
                  placeholder="Paste Google Sheet or Excel Online URL here or select from recent documents"
                  className={`${urlValidationError ? 'border-red-500' : ''}`}
                  disabled={selectedUrlPairs.length >= 6 || isRetrievingData}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-2"
                      type="button"
                      disabled={selectedUrlPairs.length >= 6 || isRetrievingData}
                    >
                      Recent
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="end">
                    <Command>
                      <CommandGroup>
                        {recentUrls.map((sheet, index) => {
                          const titleKey = sheet.sheet_name ? formatTitleKey(sheet.url, sheet.sheet_name) : '';
                          const displayTitle = titleKey && documentTitles[titleKey] 
                            ? documentTitles[titleKey] 
                            : formatDisplayTitle(sheet.doc_name, sheet.sheet_name || '');
                          return (
                            <CommandItem
                              key={index}
                              onSelect={() => handleUrlChange(0, titleKey, true)}
                            >
                              {displayTitle}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Display selected URL pairs */}
          {selectedUrlPairs.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Documents</Label>
              <div className="space-y-2">
                {selectedUrlPairs.map((pair, index) => {
                  const titleKey = pair.sheet_name ? formatTitleKey(pair.url, pair.sheet_name) : '';
                  const displayTitle = titleKey && documentTitles[titleKey] 
                    ? documentTitles[titleKey] 
                    : `${pair.url}${pair.sheet_name ? ` - ${pair.sheet_name}` : ''}`;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <span className="text-sm truncate flex-1">{displayTitle}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSelectedUrlPair(index)}
                        className="ml-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedUrlPairs.length >= 6 && (
            <p className="text-sm text-amber-600">
              Maximum number of input URLs (6) reached. Remove some to add more.
            </p>
          )}

          {urlValidationError && (
            <div className="text-sm text-red-500">{urlValidationError}</div>
          )}
          {urlPermissionError && (
            <div className="text-sm text-red-500">{urlPermissionError}</div>
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
              <Label htmlFor="online">Online Spreadsheet</Label>
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
              <div>
                <Label htmlFor="destination">Destination</Label>
                <div className="mt-1">
                  <div className="flex gap-2">
                    <Input
                      id="destination"
                      type="text"
                      value={outputUrl}
                      onChange={(e) => handleOutputUrlChange(e.target.value)}
                      onFocus={handleUrlFocus}
                      placeholder="Paste Google Sheet or Excel Online URL here or select from recent documents"
                      className={`${destinationUrlError ? 'border-red-500' : ''}`}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="px-2"
                          type="button"
                        >
                          Recent
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandGroup>
                            {recentUrls.map((sheet, index) => {
                              const titleKey = formatTitleKey(sheet.url, sheet.sheet_name);
                              const displayTitle = documentTitles[titleKey] || formatDisplayTitle(sheet.doc_name, sheet.sheet_name);
                              return (
                                <CommandItem
                                  key={index}
                                  onSelect={() => handleOutputUrlChange(titleKey, true)}
                                >
                                  {displayTitle}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {destinationUrlError && (
                <div className="text-sm text-red-500">{destinationUrlError}</div>
              )}

              {/* Show selected output sheet if available */}
              {selectedOutputSheet && outputUrl && (
                <div className="text-sm text-gray-600">
                  Destination Sheet: {(() => {
                    const titleKey = formatTitleKey(outputUrl, selectedOutputSheet);
                    return documentTitles[titleKey] || `${outputUrl} - ${selectedOutputSheet}`;
                  })()}
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="appendToSheet">Append to Existing Sheet</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        When enabled, this application will append to the sheet that you have selected instead of adding a new sheet to the workbook.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Switch
                    id="appendToSheet"
                    checked={allowSheetModification}
                    onCheckedChange={(checked) => {
                      console.log('[DashboardPage] Sheet modification toggle changed:', {
                        previousValue: allowSheetModification,
                        newValue: checked
                      })
                      updateSheetModificationPreference(checked)
                    }}
                    disabled={isProcessing || isUpdating}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm">
            {error.toLowerCase().includes('reconnect') ? (
              <div className="flex items-center gap-2">
                <span>{error}</span>
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm font-medium text-blue-600 hover:text-blue-800"
                  onClick={() => router.push('user-account')}
                >
                  Reconnect Account
                </Button>
              </div>
            ) : (
              error
            )}
          </div>
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
                  You have sheet modification enabled. This application will append to the sheet you selected 
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
                    Don't show this warning again
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
