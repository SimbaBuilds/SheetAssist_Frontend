import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { QueryResponse } from '@/types/dashboard'
import { Loader2, XCircle } from "lucide-react"
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useProcessingStatus } from '@/hooks/useProcessingStatus'

interface ProcessingResultDialogProps {
  result: QueryResponse | null
  isOpen: boolean
  onClose: () => void
  outputType: 'download' | 'online' | null
  isLoading?: boolean
  destinationTitle?: string
  onCancel?: () => void
  modifyExisting?: boolean
  destinationDocName?: string
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
}: ProcessingResultDialogProps) {
  const [isCanceling, setIsCanceling] = useState(false)
  const { processingMessage, progress } = useProcessingStatus({ isLoading, result })

  const handleCancel = async () => {
    if (!onCancel || isCanceling) return
    setIsCanceling(true)
    try {
      await onCancel()
    } finally {
      setIsCanceling(false)
    }
  }

  const renderCancelButton = () => (
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
  )

  const renderProcessingContent = (message: string) => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          {message}
        </p>
        {progress && (
          <p className="text-sm font-medium">
            Pages processed: {progress.processed} {progress.total ? `/ ${progress.total}` : ''}
          </p>
        )}
      </div>
      {onCancel && renderCancelButton()}
    </div>
  )

  const getStatusContent = () => {
    // Initial loading state
    if (isLoading && !result?.status) {
      return renderProcessingContent(processingMessage)
    }

    // Processing state with status updates
    if (result?.status === 'processing') {
      return renderProcessingContent(result.message || processingMessage)
    }

    // Error state
    if (result?.status === 'error') {
      return (
        <div className="text-red-500 py-4">
          {result.message || 'An error occurred'}
        </div>
      )
    }
    
    // Success state
    if (result?.status === 'success') {
      return (
        <div className="space-y-4 py-4">
          <div className="text-green-600">
            {modifyExisting
              ? `Data successfully uploaded to ${destinationTitle || 'destination'}`
              : `Data successfully uploaded to new sheet in ${destinationDocName || 'destination workbook'}`}
          </div>
          
          {result.result.print_output && (
            <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
              {result.result.print_output}
            </pre>
          )}

          {outputType === 'download' && result.files?.[0] && (
            <div className="text-center text-sm text-gray-600">
              Your file should download automatically
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {(isLoading || result?.status === 'processing') 
              ? 'Processing Request' 
              : 'Processing Result'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {getStatusContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
} 