import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Keyboard, X } from 'lucide-react';

const keyboardShortcuts = [
  { keys: 'Tab', description: 'Navigate to next interactive element' },
  { keys: 'Shift + Tab', description: 'Navigate to previous interactive element' },
  { keys: 'Enter / Space', description: 'Activate buttons and links' },
  { keys: 'Escape', description: 'Close dialogs and dropdowns' },
  { keys: 'Ctrl + /', description: 'Skip to main content' },
  { keys: 'Arrow Keys', description: 'Navigate within menus and lists' },
  { keys: 'Home / End', description: 'Jump to first/last item in lists' },
  { keys: 'Page Up / Page Down', description: 'Scroll large content areas' }
];

interface KeyboardInstructionsProps {
  className?: string;
}

export function KeyboardInstructions({ className }: KeyboardInstructionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          aria-label="View keyboard navigation instructions"
        >
          <Keyboard className="h-4 w-4 mr-2" aria-hidden="true" />
          Keyboard Help
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        className="max-w-md"
        aria-labelledby="keyboard-instructions-title"
        aria-describedby="keyboard-instructions-description"
      >
        <DialogHeader>
          <DialogTitle id="keyboard-instructions-title">
            Keyboard Navigation
          </DialogTitle>
          <DialogDescription id="keyboard-instructions-description">
            Use these keyboard shortcuts to navigate the application efficiently.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            {keyboardShortcuts.map((shortcut, index) => (
              <div 
                key={index}
                className="flex justify-between items-start gap-4 text-sm"
              >
                <kbd className="bg-muted px-2 py-1 rounded text-xs font-mono whitespace-nowrap">
                  {shortcut.keys}
                </kbd>
                <span className="text-muted-foreground flex-1">
                  {shortcut.description}
                </span>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Press Tab to navigate through interactive elements. 
              Use screen reader commands for additional navigation options.
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => setOpen(false)}
          className="mt-4 w-full"
          aria-label="Close keyboard instructions dialog"
        >
          <X className="h-4 w-4 mr-2" aria-hidden="true" />
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for showing keyboard shortcuts inline
export function KeyboardShortcut({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
        {keys}
      </kbd>
      <span>{description}</span>
    </div>
  );
}