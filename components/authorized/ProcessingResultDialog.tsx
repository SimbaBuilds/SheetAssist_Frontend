import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProcessedQueryResult, BatchProgress } from '@/types/dashboard'
import { Loader2, XCircle } from "lucide-react"
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ProcessingResultDialogProps {
  result: ProcessedQueryResult | null
  isOpen: boolean
  onClose: () => void
  outputType: 'download' | 'online' | null
  isLoading?: boolean
  destinationTitle?: string
  onCancel?: () => void
  modifyExisting?: boolean
  destinationDocName?: string
  batchProgress?: BatchProgress
}

export function ProcessingResultDialog({
  result,
  isOpen,
  onClose,
  outputType,
  isLoading = false,
  destinationTitle,
  onCancel,
  modifyExisting = false,
  destinationDocName,
  batchProgress,
}: ProcessingResultDialogProps) {
  const [isCanceling, setIsCanceling] = useState(false)

  const handleCancel = async () => {
    if (!onCancel || isCanceling) return
    setIsCanceling(true)
    try {
      await onCancel()
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Processing Request' : 'Processing Result'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Loading state with batch progress */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  {batchProgress?.message || 'Processing your request. This could take a minute or two...'}
                </p>
                {batchProgress && batchProgress.processed > 0 && (
                  <p className="text-sm font-medium">
                    Pages processed: {batchProgress?.processed}
                  </p>
                )}
              </div>
              {onCancel && (
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="mt-4"
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Request
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Show any error messages */}
          {!isLoading && result?.status === 'error' && (
            <div className="text-red-500">{result.message}</div>
          )}

          {/* Show success message and output */}
          {!isLoading && result?.status === 'success' && (
            <>
              <div className="text-green-600">
                {outputType === 'download' 
                  ? result.message 
                  : modifyExisting
                    ? `Data successfully uploaded to ${destinationTitle || 'destination'}`
                    : `Data successfully uploaded to new sheet in ${destinationDocName || 'destination workbook'}`}
              </div>
              
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