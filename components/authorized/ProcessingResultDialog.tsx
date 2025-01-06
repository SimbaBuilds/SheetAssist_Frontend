import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProcessingState, QueryResponse } from '@/lib/types/dashboard'
import { AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react"
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

interface ProcessingResultDialogProps {
  state: ProcessingState;
  isOpen: boolean;
  onClose: () => void;
  outputType: 'download' | 'online' | null;
  destinationTitle?: string | null;
  onCancel?: () => void;
  modifyExisting?: boolean;
  destinationDocName?: string | null;
}

export function ProcessingResultDialog({
  state,
  isOpen,
  onClose,
  outputType,
  destinationTitle,
  onCancel,
  modifyExisting = false,
  destinationDocName,
}: ProcessingResultDialogProps) {
  const [isCanceling, setIsCanceling] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsCanceling(false)
    }
  }, [isOpen])

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

  function renderContent() {
    switch (state.status) {
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
            <div className="text-center space-y-2">
              {state.message?.includes("Error processing URL") ? (
                <>
                  <div className="text-sm text-destructive">
                    <p>Error processing URL</p>
                    <div className="max-h-20 overflow-y-auto break-all text-xs mt-1">
                      {state.message.replace("Error processing URL: ", "")}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-base">
                    We've lost connection to your Google or Microsoft account. Please <strong>reconnect</strong> the necessary service in your account settings to continue.
                  </p>
                </>
              ) : state.message?.includes("attempts exhausted") ? (
                <>
                  <div className="text-sm text-destructive">
                    <div className="max-h-20 overflow-y-auto break-all text-xs mt-1">
                      {state.message}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-base">
                    There was an error processing your request.  This application may not have the ability to complete your request.  You can also try rephrasing your request or breaking it down into multiple requests.
                  </p>
                </>
              ) : (
                <p className="text-sm text-destructive break-words">
                  {state.message || 'An error occurred while processing your request'}
                </p>
              )}
            </div>
          </div>
        )

      case 'completed':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {state.message || 'Processing completed successfully'}
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {state.message || 'Processing your request...'}
              </p>
            </div>
            {onCancel && renderCancelButton()}
          </div>
        )
    }
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.status === 'error' ? 'Error' : 
             state.status === 'completed' ? 'Success' : 
             'Processing Request'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
} 