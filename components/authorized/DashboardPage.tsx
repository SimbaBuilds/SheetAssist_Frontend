import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDashboard } from '@/hooks/useDashboard'
import { useSetupPermissions } from '@/hooks/useSetupPermissions'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { DownloadFileType, SheetTitleKey } from '@/types/dashboard'
import { DOWNLOAD_FILE_TYPES, ACCEPTED_FILE_EXTENSIONS, MAX_FILES, MAX_FILE_SIZE, MAX_QUERY_LENGTH } from '@/constants/file-types'
import { ProcessingResultDialog } from '@/components/authorized/ProcessingResultDialog'
import { Badge } from '@/components/ui/badge'
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
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { useDataVisualization } from '@/hooks/useDataVisualization'

const EXAMPLE_QUERIES = [
  "add this to the sheet",
  "add these to the sheet",
  "convert this pdf to a sheet with headers product, units sold, and revenue.",
  "remove all rows where the Status column is marked as Inactive.",
  "create a performance summary by combining employee evaluation scores from each department sheet",
  "filter rows where the Email column contains .edu and export them to a new sheet",
  "extract all unpaid invoices from the finance sheet",
  "remove duplicate entries based on the Employee ID column", 
  "merge by id",
  "combine these into one document",
  "populate the student sheet with phone numbers from the household contacts sheet",
  "match client ID from the contract sheet to populate missing addresses in the billing sheet",
  "highlight rows where the Sales column exceeds $1000.", 
  "convert this directory of legal case PDFs into a single document with descriptive headers",
  "sort the spreadsheet by the Date column in descending order.", 
  "add new clients from this CSV to the existing CRM sheet, avoiding duplicates by matching email addresses",
  "extract contact information for all vendors and group by service type from the procurement sheet",
  "filter and count items sold per category in the product sales sheet, summarizing by month"
]

const MATPLOTLIB_COLORS = [
  // Basic colors
  'blue', 'red', 'cyan', 'magenta', 'yellow', 'black',
  
  // Tab colors
  'tab:blue', 'tab:orange', 'tab:green', 'tab:purple', 'tab:brown', 'tab:pink', 'tab:gray', 'tab:olive', 'tab:cyan',
  
  // Additional colors
  'dodgerblue', 'forestgreen', 'crimson', 'mediumpurple', 'darkorange', 'orchid',
  'indigo', 'teal', 'maroon'
] as const

function convertTabColor(color: string): string {
  // Convert tab: colors to their hex equivalents
  const tabColors: Record<string, string> = {
    'tab:blue': '#1f77b4',
    'tab:orange': '#ff7f0e',
    'tab:green': '#2ca02c',
    'tab:red': '#d62728',
    'tab:purple': '#9467bd',
    'tab:brown': '#8c564b',
    'tab:pink': '#e377c2',
    'tab:gray': '#7f7f7f',
    'tab:olive': '#bcbd22',
    'tab:cyan': '#17becf',
  }
  return tabColors[color] || color
}

export default function DashboardPage() {
  const {
    isInitializing,
    urls,
    query,
    files,
    error,
    outputType,
    outputUrl,
    isProcessing,
    urlPermissionError,
    urlValidationError,
    recentUrls,
    documentTitles,
    setDocumentTitles,
    downloadFileType,
    fileErrors,
    outputTypeError,
    processedResult,
    showResultDialog,
    allowSheetModification,
    destinationUrlError,
    availableSheets,
    showSheetSelector,
    selectedUrl,
    selectedUrlPairs,
    selectedOutputSheet,
    setFiles,
    setQuery,
    setOutputType,
    setOutputUrl,
    setDownloadFileType,
    setOutputTypeError,
    setShowResultDialog,
    setShowSheetSelector,
    handleSheetSelection,
    handleFileChange,
    handleUrlChange,
    handleUrlFocus,
    handleSubmit,
    handleOutputUrlChange,
    formatTitleKey,
    formatDisplayTitle,    
    isRetrievingData,
    removeSelectedUrlPair,
    isUpdating,
    updateSheetModificationPreference,
    handleCancel,
    isDestinationUrlProcessing,
    isRetrievingDestinationData,
    destinationSheets,
    showDestinationSheetSelector,
    setShowDestinationSheetSelector,
    handleDestinationSheetSelection,
    workbookCache,
    setWorkbookCache,
    setSelectedOutputSheet,
    destinationUrls,
    selectedDestinationPair,
    setSelectedDestinationPair,
  } = useDashboard()

  const {
    isVisualizationExpanded,
    visualizationUrl,
    visualizationFile,
    colorPalette,
    customInstructions,
    isVisualizationProcessing,
    visualizationError,
    visualizationFileError,
    visualizationUrlError,
    visualizationResult,
    showVisualizationSheetSelector,
    visualizationSheets,
    visualizationSheet,
    isVisualizationUrlProcessing,
    isRetrievingVisualizationData,
    setIsVisualizationExpanded,
    setVisualizationUrl,
    setColorPalette,
    setCustomInstructions,
    setShowVisualizationSheetSelector,
    setVisualizationSheet,
    handleVisualizationFileChange,
    handleVisualizationUrlChange,
    handleVisualizationSheetSelection,
    handleVisualizationSubmit,
    handleVisualizationOptionChange,
    visualizationUrls,
    selectedVisualizationPair,
    setSelectedVisualizationPair,
  } = useDataVisualization({ 
    documentTitles,
    setDocumentTitles
  })

  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {isInitializing ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      ) : (
        <>
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
                          value={destinationUrls[0]}
                          onChange={(e) => handleOutputUrlChange(e.target.value)}
                          onFocus={handleUrlFocus}
                          placeholder="Paste Google Sheet or Excel Online URL here or select from recent documents"
                          className={`${destinationUrlError ? 'border-red-500' : ''}`}
                          disabled={isDestinationUrlProcessing || isRetrievingDestinationData}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="px-2"
                              type="button"
                              disabled={isDestinationUrlProcessing || isRetrievingDestinationData}
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

                  {selectedDestinationPair && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md mt-2">
                      <span className="text-sm truncate flex-1">
                        {(() => {
                          if (!selectedDestinationPair.url || !selectedDestinationPair.sheet_name) return 'Loading...';
                          const titleKey = formatTitleKey(selectedDestinationPair.url, selectedDestinationPair.sheet_name);
                          return documentTitles[titleKey] || 'Loading...';
                        })()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDestinationPair(null);
                          setSelectedOutputSheet(null);
                          setOutputUrl('');
                        }}
                        className="ml-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </Button>
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
            destinationTitle={(() => {
              if (!outputUrl || !selectedOutputSheet) return undefined;
              const titleKey = formatTitleKey(outputUrl, selectedOutputSheet);
              return documentTitles[titleKey];
            })()}
            destinationDocName={(() => {
              if (!outputUrl || !selectedOutputSheet) return undefined;
              const titleKey = formatTitleKey(outputUrl, selectedOutputSheet);
              return documentTitles[titleKey]?.split(' - ')?.[0];
            })()}
            modifyExisting={allowSheetModification}
            onCancel={handleCancel}
          />

          {/* Data Visualization Section */}
          <div className="mt-8 border rounded-lg overflow-hidden">
            <button
              onClick={() => setIsVisualizationExpanded(!isVisualizationExpanded)}
              className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100"
            >
              <span className="font-medium">Visualize Your Data <svg className="w-5 h-5 inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="5" width="6" height="13" rx="1" fill="#00BFFF"/>
                <rect x="7" y="1" width="6" height="17" rx="1" fill="#FF1493"/>
                <rect x="13" y="7" width="6" height="11" rx="1" fill="#32CD32"/>
                <rect x="19" y="3" width="6" height="15" rx="1" fill="#FFD700"/>
              </svg></span>
              {isVisualizationExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>

            {isVisualizationExpanded && (
              <div className="p-4 space-y-8">
                {/* Step 1: Input Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary text-primary text-sm font-medium">
                      1
                    </span>
                    <h3 className="font-medium">Select Your Data Source</h3>
                  </div>

                  {/* URL Input */}
                  <div>
                    <Label htmlFor="viz-url">Sheet URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="viz-url"
                        type="text"
                        value={visualizationUrls[0]}
                        onChange={(e) => handleVisualizationUrlChange(e.target.value)}
                        placeholder="Paste Google Sheet or Excel Online URL"
                        className={visualizationUrlError ? 'border-red-500' : ''}
                        disabled={!!visualizationFile || isVisualizationUrlProcessing || isRetrievingVisualizationData}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="px-2"
                            type="button"
                            disabled={!!visualizationFile || isVisualizationUrlProcessing || isRetrievingVisualizationData}
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
                                    onSelect={() => handleVisualizationUrlChange(titleKey, true)}
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
                    {visualizationUrlError && (
                      <p className="text-sm text-red-500 mt-1">{visualizationUrlError}</p>
                    )}
                    
                    {selectedVisualizationPair && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md mt-2">
                        <span className="text-sm truncate flex-1">
                          {(() => {
                            if (!selectedVisualizationPair.url || !selectedVisualizationPair.sheet_name) return 'Loading...';
                            const titleKey = formatTitleKey(selectedVisualizationPair.url, selectedVisualizationPair.sheet_name);
                            return documentTitles[titleKey] || 'Loading...';
                          })()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVisualizationPair(null);
                            setVisualizationSheet(null);
                            setVisualizationUrl('');
                          }}
                          className="ml-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* File Input */}
                  <div>
                    <Label htmlFor="viz-file">Upload File (.xlsx, .csv)</Label>
                    <Input
                      id="viz-file"
                      type="file"
                      onChange={handleVisualizationFileChange}
                      accept=".xlsx,.csv"
                      className={visualizationFileError ? 'border-red-500' : ''}
                      disabled={!!visualizationUrl}
                    />
                    {visualizationFileError && (
                      <p className="text-sm text-red-500 mt-1">{visualizationFileError.error}</p>
                    )}
                  </div>
                </div>

                {/* Step 2: Color Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary text-primary text-sm font-medium">
                      2
                    </span>
                    <h3 className="font-medium">Choose Color Theme</h3>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Select Primary Color</Label>
                      {colorPalette && (
                        <span className="text-sm text-muted-foreground">
                          Selected: {colorPalette.replace('tab:', '').charAt(0).toUpperCase() + colorPalette.replace('tab:', '').slice(1)}
                        </span>
                      )}
                    </div>
                    <RadioGroup
                      value={colorPalette}
                      onValueChange={setColorPalette}
                      className="grid grid-cols-6 sm:grid-cols-8 gap-0.5 mt-2 max-w-[280px]"
                    >
                      {MATPLOTLIB_COLORS.map((color) => (
                        <div key={color} className="relative group">
                          <RadioGroupItem
                            value={color}
                            id={`color-${color}`}
                            className="sr-only peer"
                          />
                          <Label
                            htmlFor={`color-${color}`}
                            className="block w-8 h-8 cursor-pointer border border-border rounded-md peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary hover:opacity-90 transition-all"
                            style={{ 
                              backgroundColor: color.startsWith('tab:') ? convertTabColor(color) : color,
                            }}
                          >
                            <span className="sr-only">{color}</span>
                          </Label>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                            <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
                              {color.replace('tab:', '').charAt(0).toUpperCase() + color.replace('tab:', '').slice(1)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                {/* Step 3: Visualization Options */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary text-primary text-sm font-medium">
                      3
                    </span>
                    <h3 className="font-medium">Choose Visualization Style</h3>
                  </div>

                  <RadioGroup 
                    value={customInstructions === undefined ? 'surprise' : 'custom'}
                    onValueChange={handleVisualizationOptionChange}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="surprise" id="surprise" />
                      <Label htmlFor="surprise">Surprise Me</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom">Give Custom Instructions</Label>
                    </div>
                  </RadioGroup>

                  {customInstructions !== undefined && (
                    <div className="pl-6">
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="E.g. 'Create a bar chart showing sales by region', 'Make a line graph of temperature trends'"
                        className="w-full p-2 border rounded-md"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Sheet Selector Dialog */}
                <SheetSelector
                  url={visualizationUrl}
                  sheets={visualizationSheets}
                  onSelect={handleVisualizationSheetSelection}
                  onClose={() => setShowVisualizationSheetSelector(false)}
                  open={showVisualizationSheetSelector}
                />

                {/* Error Display */}
                {visualizationError && (
                  <div className="text-red-500 text-sm mt-4">{visualizationError}</div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleVisualizationSubmit}
                  disabled={
                    isVisualizationProcessing || 
                    (!selectedVisualizationPair && !visualizationFile) ||
                    !colorPalette
                  }
                  className="w-full mt-6"
                >
                  {isVisualizationProcessing ? 'Processing...' : 'Generate Visualization'}
                </Button>

                {/* Result Display */}
                {visualizationResult && (
                  <div className="relative group mt-6">
                    <img
                      src={visualizationResult}
                      alt="Data Visualization"
                      className="w-full rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = visualizationResult
                          link.download = 'visualization.png'
                          link.click()
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetSelector
            url={outputUrl}
            sheets={destinationSheets}
            onSelect={handleDestinationSheetSelection}
            onClose={() => setShowDestinationSheetSelector(false)}
            open={showDestinationSheetSelector}
          />
        </>
      )}
    </div>
  )
}
