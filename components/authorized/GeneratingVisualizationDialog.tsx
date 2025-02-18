import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, Loader2, XCircle } from "lucide-react"
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import Link from 'next/link'
interface GeneratingVisualizationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCancel?: () => void
  error?: string | null
  isProcessing: boolean
}

export function GeneratingVisualizationDialog({
  isOpen,
  onClose,
  onCancel,
  error,
  isProcessing,
}: GeneratingVisualizationDialogProps) {
  const [isCanceling, setIsCanceling] = useState(false)

  const handleCancel = async () => {
    if (!onCancel || isCanceling) return
    setIsCanceling(true)
    try {
      onCancel()
    } finally {
      setIsCanceling(false)
    }
  }

  if (!isProcessing && !error) return null

  const checkErrorType = (errorText: string) => {
    const errorTypes = [
      "Error processing URL",
      "attempts exhausted",
      "Monthly visualization limit",
      "Overage limit",
      "Request was cancelled",
      "Request was canceled"
    ]
    
    return errorTypes.find(type => errorText.toLowerCase().includes(type.toLowerCase()))
  }

  const renderErrorContent = (errorText: string) => {
    const errorType = checkErrorType(errorText)

    switch (errorType) {
      case "Error processing URL":
        return (
          <>
            <div className="text-sm text-destructive">
              <p>Error processing URL</p>
              <div className="max-h-20 overflow-y-auto break-all text-xs mt-1">
                {errorText.replace("Error processing URL: ", "")}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-base">
               We&apos;ve lost connection to your Google or Microsoft account. Please reconnect the necessary service in your account settings.
            </p>
          </>
        )
      
      case "attempts exhausted":
        return (
          <>
            <div className="text-sm text-destructive">
              <div className="max-h-20 overflow-y-auto break-all text-xs mt-1">
                {errorText}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-base">
              There was an error processing your request. This application may not have the ability to complete your request. You can also try rephrasing your request or breaking it down into multiple requests.
            </p>
          </>
        )
      
      case "Monthly visualization limit":
      case "Overage limit":
        return (
          <div className="text-sm text-destructive">
            <p>{errorText}</p>
          </div>
        )

      case "Request was cancelled":
      case "Request was canceled":
        return (
          <div className="text-sm text-destructive">
            <p>Request was cancelled by user</p>
          </div>
        )

      default:
        return (
          <p className="text-sm text-destructive break-words">
            {errorText || 'An error occurred while processing your request'}
          </p>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {error ? 'Error' : 'Status'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
              <div className="text-center space-y-2">
                {renderErrorContent(error)}
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 