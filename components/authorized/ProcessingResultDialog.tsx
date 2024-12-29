import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProcessingState, QueryResponse } from '@/lib/types/dashboard'
import { Loader2, XCircle } from "lucide-react"
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
            Processing Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {state.message || 'Processing your request...'}
              </p>
            </div>
            {onCancel && renderCancelButton()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 