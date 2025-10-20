import { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SignatureCanvasProps {
  onSignatureChange: (image: string | null) => void;
  clientName: string;
}

export function SignaturePad({ onSignatureChange, clientName }: SignatureCanvasProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
    onSignatureChange(null);
  };

  const handleEnd = () => {
    if (sigCanvas.current?.isEmpty()) {
      onSignatureChange(null);
    } else {
      const dataUrl = sigCanvas.current?.toDataURL('image/png');
      onSignatureChange(dataUrl || null);
    }
  };

  useEffect(() => {
    // Clear canvas when client name changes
    handleClear();
  }, [clientName]);

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Draw your signature below using your mouse, trackpad, or touchscreen
        </p>
        <div className="border-2 border-dashed rounded-lg bg-background relative">
          <SignatureCanvas
            ref={sigCanvas}
            onEnd={handleEnd}
            canvasProps={{
              className: 'w-full h-40 cursor-crosshair',
              style: { touchAction: 'none' }
            }}
            backgroundColor="hsl(var(--background))"
            penColor="hsl(var(--foreground))"
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
            Sign here
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleClear}
        >
          Clear
        </Button>
        <p className="text-xs text-muted-foreground">
          {clientName && `Signing as: ${clientName}`}
        </p>
      </div>
    </Card>
  );
}
