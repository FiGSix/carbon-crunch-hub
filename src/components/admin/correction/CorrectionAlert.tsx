
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function CorrectionAlert() {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <strong>Important:</strong> These functions will update proposal data across the entire database. 
        Please ensure you have a recent backup before proceeding with comprehensive corrections.
      </AlertDescription>
    </Alert>
  );
}
