
import React, { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useAddressConflictCheck } from '@/hooks/useAddressConflictCheck';
import { AddressConflictWarning } from './AddressConflictWarning';
import { ProjectInfoForm } from './ProjectInfoForm';
import { ProjectInformation } from '@/types/proposals';
import { debounce } from 'lodash';

interface ProjectInfoFormWithConflictCheckProps {
  proposalId?: string;
  projectInfo: ProjectInformation;
  updateProjectInfo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleAddressChange: (address: string) => void;
}

export function ProjectInfoFormWithConflictCheck({ 
  proposalId,
  projectInfo,
  updateProjectInfo,
  handleAddressChange
}: ProjectInfoFormWithConflictCheckProps) {
  const { watch } = useFormContext();
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

  // Watch address field - using the address from projectInfo since that's what the form uses
  const address = projectInfo.address;

  // Debounced conflict check
  const debouncedCheckConflict = useMemo(
    () => debounce((addressData) => {
      checkConflict(addressData);
    }, 1000),
    [checkConflict]
  );

  // Parse address into components for conflict checking
  useEffect(() => {
    if (address && address.trim().length > 10) { // Only check if address is substantial
      // Simple address parsing - this could be enhanced with a proper address parser
      const addressParts = address.split(',').map(part => part.trim());
      
      if (addressParts.length >= 3) {
        // Assume format: Street, City, State Zip
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
  }, [address, proposalId, debouncedCheckConflict, clearConflict]);

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

      {/* Original form */}
      <ProjectInfoForm 
        projectInfo={projectInfo}
        updateProjectInfo={updateProjectInfo}
        handleAddressChange={handleAddressChange}
      />
      
      {/* Block form submission if there's a conflict without override */}
      {isBlocked && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700 font-medium">
            This form cannot be submitted until the address conflict is resolved.
          </p>
        </div>
      )}
    </div>
  );
}
