import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SheetSelectorProps {
  url: string;
  sheets: string[];
  onSelect: (url: string, sheet: string) => void;
  onClose: () => void;
  open: boolean;
}

export function SheetSelector({ url, sheets, onSelect, onClose, open }: SheetSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-[425px]"
        aria-describedby="sheet-selector-description"
      >
        <DialogHeader>
          <DialogTitle>Select a Sheet</DialogTitle>
        </DialogHeader>
        <div id="sheet-selector-description" className="text-sm text-muted-foreground mb-4">
          Choose which sheet you would like to work with from this document.
        </div>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            {sheets.map((sheet) => (
              <Button
                key={`${url}-${sheet}`}
                variant="outline"
                onClick={() => onSelect(url, sheet)}
                className="w-full justify-start text-left font-normal"
              >
                {sheet}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
