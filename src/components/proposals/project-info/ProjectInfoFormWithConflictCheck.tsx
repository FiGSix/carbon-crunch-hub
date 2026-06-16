
import { useEffect, useMemo } from 'react';
import { useAddressConflictCheck } from '@/hooks/useAddressConflictCheck';
import { AddressConflictWarning } from './AddressConflictWarning';
import { ProjectInfoForm } from './ProjectInfoForm';
import { ProjectInformation } from '@/types/proposals';
import debounce from 'lodash-es/debounce';

interface ProjectInfoFormWithConflictCheckProps {
  proposalId?: string;
  projectInfo: ProjectInformation;
  updateProjectInfo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleAddressChange: (address: string) => void;
  dateValidationError?: string | null;
  onPhaseToggle?: (isMultiPhase: boolean) => void;
  onPhasesChange?: (phases: any[]) => void;
  setProjectInfo?: (info: ProjectInformation) => void;
}

export function ProjectInfoFormWithConflictCheck({ 
  proposalId,
  projectInfo,
  updateProjectInfo,
  handleAddressChange,
  dateValidationError,
  onPhaseToggle,
  onPhasesChange,
  setProjectInfo
}: ProjectInfoFormWithConflictCheckProps) {
  const {
    isChecking,
    conflictResult,
    hasOverride,
    isBlocked,
    isAdmin,
    checkConflict,
    handleOverride,
    clearConflict
  } = useAddressConflictCheck();

  // Use the address and GPS from projectInfo
  const { address, gpsLat, gpsLng } = projectInfo;

  // Debounced conflict check
  const debouncedCheckConflict = useMemo(
    () => debounce((addressData) => {
      checkConflict(addressData);
    }, 1000),
    [checkConflict]
  );

  // Check for conflicts using GPS (primary) or address (fallback)
  useEffect(() => {
    // GPS-based check is preferred if coordinates are available
    if (gpsLat && gpsLng) {
      // Parse address components for logging/fallback purposes
      const addressParts = (address || '').split(',').map(part => part.trim());
      const street = addressParts[0] || '';
      const city = addressParts[1] || '';
      const stateZip = addressParts[2] || '';
      const stateZipParts = stateZip.split(' ');
      const state = stateZipParts[0] || '';
      const zipCode = stateZipParts[stateZipParts.length - 1] || '';

      debouncedCheckConflict({
        street,
        city,
        state,
        zipCode,
        gpsLat,
        gpsLng,
        excludeProposalId: proposalId
      });
      return () => {
        debouncedCheckConflict.cancel();
      };
    }

    // Fallback to address-based check if no GPS
    if (address && address.trim().length > 10) {
      const addressParts = address.split(',').map(part => part.trim());
      
      if (addressParts.length >= 3) {
        const street = addressParts[0] || '';
        const city = addressParts[1] || '';
        const stateZip = addressParts[2] || '';
        const stateZipParts = stateZip.split(' ');
        const state = stateZipParts[0] || '';
        const zipCode = stateZipParts[stateZipParts.length - 1] || '';

        if (street && city && state && zipCode) {
          debouncedCheckConflict({
            street,
            city,
            state,
            zipCode,
            excludeProposalId: proposalId
          });
        }
      }
    } else {
      clearConflict();
    }

    return () => {
      debouncedCheckConflict.cancel();
    };
  }, [address, gpsLat, gpsLng, proposalId, debouncedCheckConflict, clearConflict]);

  return (
    <div className="space-y-4">
      {/* Show conflict warning if detected */}
      {conflictResult && (
        <AddressConflictWarning
          conflictResult={conflictResult}
          onOverride={handleOverride}
          allowOverride={isAdmin}
        />
      )}
      
      {/* Show checking indicator */}
      {isChecking && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Checking for existing projects at this address...
        </div>
      )}

      {/* Show date validation error */}
      {dateValidationError && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <div className="h-4 w-4 rounded-full bg-destructive flex-shrink-0"></div>
          {dateValidationError}
        </div>
      )}

      {/* Original form */}
      <ProjectInfoForm 
        projectInfo={projectInfo}
        updateProjectInfo={updateProjectInfo}
        handleAddressChange={handleAddressChange}
        onPhaseToggle={onPhaseToggle}
        onPhasesChange={onPhasesChange}
        setProjectInfo={setProjectInfo}
      />
      
      {/* Block form submission if there's a conflict without override or date error */}
      {(isBlocked || dateValidationError) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700 font-medium">
            {isBlocked 
              ? "This form cannot be submitted until the address conflict is resolved."
              : "This form cannot be submitted until the date issue is resolved."
            }
          </p>
        </div>
      )}
    </div>
  );
}
