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
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Keep the canvas backing store in sync with its rendered size so strokes
  // land under the finger on mobile (and stay crisp on high-DPI screens).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = sigCanvas.current?.getCanvas();
    if (!wrapper || !canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = wrapper.getBoundingClientRect();
      if (!width || !height) return;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      sigCanvas.current?.clear();
      onSignatureChange(null);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <Card className="p-3 sm:p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Draw your signature below using your mouse, trackpad, or touchscreen
        </p>
        <div
          ref={wrapperRef}
          className="border-2 border-dashed rounded-lg bg-background relative h-40 sm:h-44 overflow-hidden"
        >
          <SignatureCanvas
            ref={sigCanvas}
            onEnd={handleEnd}
            canvasProps={{
              className: 'w-full h-full cursor-crosshair',
              style: { touchAction: 'none' }
            }}
            backgroundColor="#ffffff"
            penColor="#000000"
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
