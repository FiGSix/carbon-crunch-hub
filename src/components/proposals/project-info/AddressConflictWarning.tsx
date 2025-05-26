
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { AddressConflictResult } from '@/services/addressConflictService';

interface AddressConflictWarningProps {
  conflictResult: AddressConflictResult;
  onOverride?: () => void;
  allowOverride?: boolean;
}

export function AddressConflictWarning({ 
  conflictResult, 
  onOverride, 
  allowOverride = false 
}: AddressConflictWarningProps) {
  if (!conflictResult.hasConflict) {
    return null;
  }

  const supportEmailUrl = "mailto:support@crunchcarbon.app?subject=Duplicate Address Project&body=I need assistance with a project that appears to be already registered at this address.";

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Address Conflict Detected</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          This project is already registered. Please contact the Crunch Carbon team if this is not the case.
        </p>
        
        {conflictResult.conflictingProposal && (
          <div className="mb-3 p-3 bg-gray-50 rounded-md border text-sm">
            <p><strong>Existing Project Details:</strong></p>
            <p>Agent: {conflictResult.conflictingProposal.agentName}</p>
            <p>Client: {conflictResult.conflictingProposal.clientName}</p>
            <p>Created: {new Date(conflictResult.conflictingProposal.createdAt).toLocaleDateString()}</p>
            <p>Status: {conflictResult.conflictingProposal.status}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Button variant="outline" size="sm" asChild>
            <a href={supportEmailUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Contact Support
            </a>
          </Button>
          
          {allowOverride && onOverride && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOverride}
              className="text-red-600 hover:text-red-700"
            >
              Continue Anyway (Admin Override)
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
