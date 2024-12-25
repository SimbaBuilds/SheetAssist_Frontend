import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProcessingState, QueryResponse } from '@/types/dashboard'
import { Loader2, XCircle } from "lucide-react"
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ProcessingResultDialogProps {
  state: ProcessingState;
  isOpen: boolean;
  onClose: () => void;
  outputType: 'download' | 'online' | null;
  destinationTitle?: string;
  onCancel?: () => void;
  modifyExisting?: boolean;
  destinationDocName?: string;
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

  const renderProcessingContent = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          {state.message || 'Processing your request.  This may take a few minutes...'}
        </p>
        {state.progress && (
          <p className="text-sm font-medium">
            Pages processed: {state.progress.processed}
            {state.progress.total ? ` / ${state.progress.total}` : ''}
          </p>
        )}
      </div>
      {onCancel && renderCancelButton()}
    </div>
  );

  const getStatusContent = () => {
    // Always show processing content while processing
    if (state.status === 'processing' || state.status === 'created') {
      return renderProcessingContent();
    }

    // Handle completed status
    if (state.status === 'completed') {
      return (
        <div className="space-y-4 py-4">
          <div className="text-green-600">
            {state.message || (modifyExisting
              ? `Data successfully uploaded to ${destinationTitle || 'destination'}`
              : `Data successfully uploaded to new sheet in ${destinationDocName || 'destination workbook'}`)}
          </div>
        </div>
      );
    }

    // Handle error status
    if (state.status === 'error') {
      return (
        <div className="text-red-500 py-4">
          {state.message || 'An error occurred'}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {(state.status === 'processing' || state.status === 'created')
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