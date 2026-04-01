
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { AddressConflictResult, ProximityLevel } from '@/services/addressConflictService';

interface AddressConflictWarningProps {
  conflictResult: AddressConflictResult;
  onOverride?: () => void;
  allowOverride?: boolean;
}

const statusLabels: Record<string, string> = {
  draft: 'In Progress',
  submitted: 'Submitted',
  signed: 'Active',
  approved: 'Approved',
  rejected: 'Declined',
  expired: 'Expired',
};

const tierConfig: Record<NonNullable<ProximityLevel>, {
  title: string;
  icon: typeof AlertTriangle;
  variant: 'destructive' | 'default';
  className: string;
  message: string;
}> = {
  conflict: {
    title: 'This Location May Already Be Registered',
    icon: AlertTriangle,
    variant: 'destructive',
    className: '',
    message: 'We found an existing project very close to this location. If you believe this is a different site, please reach out to the Crunch Carbon team for assistance.',
  },
  warning: {
    title: 'Nearby Project Detected',
    icon: AlertTriangle,
    variant: 'default',
    className: 'border-orange-400 bg-orange-50 text-orange-900 [&>svg]:text-orange-500',
    message: "There's an existing project close to this location. Please confirm this is a separate site before continuing.",
  },
  notice: {
    title: 'Heads Up — Nearby Project',
    icon: Info,
    variant: 'default',
    className: 'border-blue-400 bg-blue-50 text-blue-900 [&>svg]:text-blue-500',
    message: 'An existing project is located in the same area. No action needed — this is just for your reference.',
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
  const supportEmailUrl = "mailto:support@crunchcarbon.com?subject=Address Query&body=Hi, I need help with a project location that appears to overlap with an existing registration.";

  const humanStatus = (raw: string) => statusLabels[raw?.toLowerCase()] ?? raw;

  return (
    <Alert variant={config.variant} className={`mb-4 ${config.className}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{config.message}</p>
        
        {conflictResult.conflictingProposal && (
          <div className="mb-3 p-3 bg-background/50 rounded-md border text-sm space-y-1">
            <p className="font-medium">Existing project nearby:</p>
            <p>Agent: {conflictResult.conflictingProposal.agentName}</p>
            <p>Client: {conflictResult.conflictingProposal.clientName}</p>
            <p>Created: {new Date(conflictResult.conflictingProposal.createdAt).toLocaleDateString()}</p>
            <p>Status: {humanStatus(conflictResult.conflictingProposal.status)}</p>
            {conflictResult.distanceMeters !== undefined && (
              <p className="mt-2 font-medium">
                ~{Math.round(conflictResult.distanceMeters)}m away
              </p>
            )}
          </div>
        )}

        {conflictResult.proximityLevel === 'conflict' && (
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button variant="outline" size="sm" asChild>
              <a href={supportEmailUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Get Help
              </a>
            </Button>
            
            {allowOverride && onOverride && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOverride}
                className="text-red-600 hover:text-red-700"
              >
                I confirm this is a different site
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
