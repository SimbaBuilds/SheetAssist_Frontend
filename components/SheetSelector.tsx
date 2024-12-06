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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select a Sheet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            {sheets.map((sheet) => (
              <Button
                key={sheet}
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
