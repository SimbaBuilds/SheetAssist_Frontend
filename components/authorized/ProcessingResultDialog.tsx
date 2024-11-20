import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/services/python_backend'
import type { ProcessedQueryResult, FileInfo } from '@/services/python_backend'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface ProcessingResultDialogProps {
  result: ProcessedQueryResult | null
  isOpen: boolean
  onClose: () => void
  outputType: 'download' | 'online' | null
}

export function ProcessingResultDialog({
  result,
  isOpen,
  onClose,
  outputType
}: ProcessingResultDialogProps) {
  if (!result) return null

  const handleDownload = async (fileInfo: FileInfo) => {
    try {
      await downloadFile(fileInfo)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.result.error ? (
              <>
                <XCircleIcon className="w-6 h-6 text-red-500" />
                Error Processing Request
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                Processing Complete
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display message */}
          <p className="text-sm text-gray-600">{result.message}</p>

          {/* Display error if any */}
          {result.result.error && (
            <div className="text-sm text-red-500">
              {result.result.error}
            </div>
          )}

          {/* Display files for download if available */}
          {outputType === 'download' && result.files && result.files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Generated Files:</h4>
              <div className="space-y-2">
                {result.files.map((file, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full text-left flex items-center gap-2"
                    onClick={() => handleDownload(file)}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="flex-1 truncate">{file.filename}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Display online document link if applicable */}
          {outputType === 'online' && result.result.return_value && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Document Updated:</h4>
              <Button
                variant="outline"
                className="w-full text-left"
                onClick={() => window.open(result.result.return_value, '_blank')}
              >
                View Updated Document
              </Button>
            </div>
          )}

          <Button
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 