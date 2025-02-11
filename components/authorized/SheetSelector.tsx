import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface SheetSelectorProps {
  open: boolean;
  onClose: () => void;
  sheets: string[];
  onSelect: (sheetName: string, url?: string) => void;
  isProcessing?: boolean;
  docName?: string;
  url?: string;
  pickerActive?: boolean;
}

export function SheetSelector({
  open,
  onClose,
  sheets,
  onSelect,
  isProcessing = false,
  docName,
  url,
  pickerActive = false,
}: SheetSelectorProps) {
  const actualOpen = (open || isProcessing) && !pickerActive;

  useEffect(() => {
    console.log('[SheetSelector] State changed:', {
      open,
      isProcessing,
      actualOpen,
      pickerActive,
      sheetsCount: sheets.length,
      docName,
      mounted: true
    });
  }, [open, isProcessing, sheets.length, docName, actualOpen, pickerActive]);

  return (
    <Dialog 
      open={actualOpen}
      onOpenChange={(isOpen) => {
        console.log('[SheetSelector] Dialog open state changing:', { isOpen, isProcessing, actualOpen, pickerActive });
        if (!isOpen && !isProcessing) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {docName ? `Select a Sheet from ${docName}` : 'Select a Sheet'}
          </DialogTitle>
          <DialogDescription>
            Choose which sheet you would like to work with from this document.
          </DialogDescription>
        </DialogHeader>
        
        {isProcessing ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading sheets...</p>
            </div>
          </div>
        ) : sheets.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-1 gap-2">
              {sheets.map((sheet) => (
                <Button
                  key={sheet}
                  variant="outline"
                  onClick={() => {
                    console.log('[SheetSelector] Sheet selected:', { sheet, url });
                    onSelect(sheet, url);
                  }}
                  className="w-full justify-start text-left font-normal"
                >
                  {sheet}
                </Button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">No sheets available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 