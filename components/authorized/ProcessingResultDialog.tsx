import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { ProcessingState } from '@/lib/types/dashboard'
import { AlertCircle, CheckCircle, Link, Loader2, XCircle } from "lucide-react"
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
  onCancel,
}: ProcessingResultDialogProps) {
  const [isCanceling, setIsCanceling] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsCanceling(false)
    }
  }, [isOpen])

  const handleCancel = async () => {
    console.log('[handleCancel- ProcessingResultDialog] Canceling...')
    if (!onCancel || isCanceling) return
    setIsCanceling(true)
    try {
      onCancel()
    } finally {
      setIsCanceling(false)
    }
  }

  const renderCancelButton = () => (
    <Button 
      variant="outline" 
      onClick={handleCancel}
      className="mt-4"
      disabled={isCanceling || state.status === 'canceled'}
    >
      {isCanceling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Canceling...
        </>
      ) : state.status === 'canceled' ? (
        <>
          <XCircle className="mr-2 h-4 w-4" />
          Canceled
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
                    <div className="max-h-20 overflow-y-auto break-all text-xs mt-1 whitespace-pre-wrap">
                      {state.message.replace("Error processing URL: ", "")}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-base">
                     We&apos;ve lost connection to your Google or Microsoft account. Please reconnect the necessary service in your account settings.
                  </p>
                </>
              ) : state.message?.includes("attempts exhausted") ? (
                <>
                  <div className="text-sm text-destructive">
                    <div className="max-h-20 overflow-y-auto break-all text-xs mt-1 whitespace-pre-wrap">
                      {state.message}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-base">
                    There was an error processing your request.  This application may not have the ability to complete your request.  You can also try rephrasing your request or breaking it down into multiple requests.
                  </p>
                </>
              ) : (
                <p className="text-sm text-destructive break-words whitespace-pre-wrap">
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
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {state.message || 'Processing completed successfully'}
              </p>
            </div>
          </div>
        )

      case 'completed_with_error(s)':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-8 w-8 text-yellow-500" />
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {state.message || 'Processing completed successfully'}
              </p>
            </div>
          </div>
        )  

      case 'canceled':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <XCircle className="h-8 w-8 text-gray-500" />
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                Request was canceled
              </p>
            </div>
          </div>
        )

      case 'idle':
        return null;

      default:
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {state.message || 'Processing your request...'}
              </p>
            </div>
            {onCancel && (state.status === 'processing' || state.status === 'created') && renderCancelButton()}
          </div>
        )
    }
  }

  return (
    <Dialog 
      open={isOpen && state.status !== 'idle'} 
      onOpenChange={(open) => {
        // Only allow closing if not processing
        if (!open && state.status !== 'processing' && state.status !== 'created') {
          onClose();
        }
      }}
      modal={true}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          // Prevent closing via escape key when processing
          if (state.status === 'processing' || state.status === 'created') {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevent closing via backdrop when processing
          if (state.status === 'processing' || state.status === 'created') {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {state.status === 'error' ? 'Error' : 
             state.status === 'completed' ? 'Success' : 
             'Processing Request'}
          </DialogTitle>
          <DialogDescription aria-live="polite">
            
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
} 