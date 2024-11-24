import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import type { FileInfo, ProcessedQueryResult } from '@/types/dashboard'
import { downloadFile } from '@/services/python_backend'

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
      // Optionally add error handling UI feedback
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Processing Result</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Show any error messages */}
          {result.status === 'error' && (
            <div className="text-red-500">{result.message}</div>
          )}

          {/* Show success message and output */}
          {result.status === 'success' && (
            <>
              <div className="text-green-600">{result.message}</div>
              
              {/* Show code output if any */}
              {result.result.print_output && (
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  {result.result.print_output}
                </pre>
              )}

              {/* Show download button if files are available */}
              {outputType === 'download' && result.files?.[0] && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => handleDownload(result.files![0])}
                    className="flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download Result
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 