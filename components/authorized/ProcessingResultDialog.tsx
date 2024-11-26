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

              {/* For download type, just show a success message instead of download button */}
              {outputType === 'download' && result.files?.[0] && (
                <div className="text-center text-sm text-gray-600">
                  Your file should download automatically
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 