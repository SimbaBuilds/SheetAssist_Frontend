import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProcessedQueryResult } from '@/types/dashboard'
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
}

export function ProcessingResultDialog({
  result,
  isOpen,
  onClose,
  outputType,
  isLoading = false,
  destinationTitle,
  onCancel
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
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-center text-sm text-gray-600">Processing your request...</p>
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
                  : `Data successfully uploaded to ${destinationTitle || 'destination'}`}
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