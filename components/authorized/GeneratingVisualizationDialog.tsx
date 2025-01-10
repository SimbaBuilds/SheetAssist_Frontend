import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, XCircle } from "lucide-react"
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface GeneratingVisualizationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCancel?: () => void
}

export function GeneratingVisualizationDialog({
  isOpen,
  onClose,
  onCancel,
}: GeneratingVisualizationDialogProps) {
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
          <DialogTitle>Generating Visualization</DialogTitle>
          <DialogDescription>
             Generating visualization...
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-center text-sm text-gray-600">
              Generating visualization...
            </p>
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
        </div>
      </DialogContent>
    </Dialog>
  )
} 