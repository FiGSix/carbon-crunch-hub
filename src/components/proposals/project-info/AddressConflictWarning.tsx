
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { AddressConflictResult, ProximityLevel } from '@/services/addressConflictService';

interface AddressConflictWarningProps {
  conflictResult: AddressConflictResult;
  onOverride?: () => void;
  allowOverride?: boolean;
}

const tierConfig: Record<NonNullable<ProximityLevel>, {
  title: string;
  icon: typeof AlertTriangle;
  variant: 'destructive' | 'default';
  className: string;
  message: string;
}> = {
  conflict: {
    title: 'Address Conflict Detected',
    icon: AlertTriangle,
    variant: 'destructive',
    className: '',
    message: 'This project is already registered within 50m. Please contact the Crunch Carbon team if this is not the case.',
  },
  warning: {
    title: 'Nearby Project Warning',
    icon: AlertTriangle,
    variant: 'default',
    className: 'border-orange-400 bg-orange-50 text-orange-900 [&>svg]:text-orange-500',
    message: 'Another project exists within 200m of this location. Please verify this is a different site before proceeding.',
  },
  notice: {
    title: 'Nearby Project Notice',
    icon: Info,
    variant: 'default',
    className: 'border-blue-400 bg-blue-50 text-blue-900 [&>svg]:text-blue-500',
    message: 'Another project exists within 500m of this location. This is for your awareness only.',
  },
};

export function AddressConflictWarning({ 
  conflictResult, 
  onOverride, 
  allowOverride = false 
}: AddressConflictWarningProps) {
  if (!conflictResult.proximityLevel) return null;

  const config = tierConfig[conflictResult.proximityLevel];
  const Icon = config.icon;
  const supportEmailUrl = "mailto:support@crunchcarbon.com?subject=Duplicate Address Project&body=I need assistance with a project that appears to be already registered at this address.";

  return (
    <Alert variant={config.variant} className={`mb-4 ${config.className}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{config.message}</p>
        
        {conflictResult.conflictingProposal && (
          <div className="mb-3 p-3 bg-background/50 rounded-md border text-sm">
            <p><strong>Nearby Project Details:</strong></p>
            <p>Agent: {conflictResult.conflictingProposal.agentName}</p>
            <p>Client: {conflictResult.conflictingProposal.clientName}</p>
            <p>Created: {new Date(conflictResult.conflictingProposal.createdAt).toLocaleDateString()}</p>
            <p>Status: {conflictResult.conflictingProposal.status}</p>
            {conflictResult.distanceMeters !== undefined && (
              <p className="mt-2 font-medium">
                Distance: {conflictResult.distanceMeters}m from this location
              </p>
            )}
          </div>
        )}

        {conflictResult.proximityLevel === 'conflict' && (
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
        )}
      </AlertDescription>
    </Alert>
  );
}
