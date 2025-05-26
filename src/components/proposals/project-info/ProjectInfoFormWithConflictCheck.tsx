
import React, { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useAddressConflictCheck } from '@/hooks/useAddressConflictCheck';
import { AddressConflictWarning } from './AddressConflictWarning';
import { ProjectInfoForm } from './ProjectInfoForm';
import { debounce } from 'lodash';

interface ProjectInfoFormWithConflictCheckProps {
  proposalId?: string;
}

export function ProjectInfoFormWithConflictCheck({ proposalId }: ProjectInfoFormWithConflictCheckProps) {
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

  // Watch address fields
  const street = watch('project_street');
  const city = watch('project_city');
  const state = watch('project_state');
  const zipCode = watch('project_zip_code');

  // Debounced conflict check
  const debouncedCheckConflict = useMemo(
    () => debounce((addressData) => {
      checkConflict(addressData);
    }, 1000),
    [checkConflict]
  );

  // Check for conflicts when address changes
  useEffect(() => {
    if (street && city && state && zipCode) {
      debouncedCheckConflict({
        street,
        city,
        state,
        zipCode,
        excludeProposalId: proposalId
      });
    } else {
      clearConflict();
    }

    return () => {
      debouncedCheckConflict.cancel();
    };
  }, [street, city, state, zipCode, proposalId, debouncedCheckConflict, clearConflict]);

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
      <ProjectInfoForm />
      
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
