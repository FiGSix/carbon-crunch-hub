
import { useState, useCallback } from 'react';
import { checkAddressConflict, AddressConflictResult, AddressConflictCheck } from '@/services/addressConflictService';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

export function useAddressConflictCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [conflictResult, setConflictResult] = useState<AddressConflictResult | null>(null);
  const [hasOverride, setHasOverride] = useState(false);
  const { userRole } = useAuth();
  
  const isAdmin = userRole === 'admin';

  const checkConflict = useCallback(async (addressData: AddressConflictCheck) => {
    const conflictLogger = logger.withContext({
      component: 'useAddressConflictCheck',
      feature: 'conflict-detection'
    });

    // Don't check if fields are empty
    if (!addressData.street || !addressData.city || !addressData.state || !addressData.zipCode) {
      setConflictResult(null);
      return;
    }

    setIsChecking(true);
    setHasOverride(false);

    try {
      conflictLogger.info('Starting address conflict check', { addressData });
      const result = await checkAddressConflict(addressData);
      setConflictResult(result);
      
      if (result.hasConflict) {
        conflictLogger.warn('Address conflict detected', { result });
      } else {
        conflictLogger.info('No address conflict found');
      }
    } catch (error) {
      conflictLogger.error('Error during conflict check', { error });
      // Set no conflict on error to avoid blocking users
      setConflictResult({ hasConflict: false });
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleOverride = useCallback(() => {
    const conflictLogger = logger.withContext({
      component: 'useAddressConflictCheck',
      feature: 'admin-override'
    });

    conflictLogger.warn('Admin override activated for address conflict');
    setHasOverride(true);
  }, []);

  const clearConflict = useCallback(() => {
    setConflictResult(null);
    setHasOverride(false);
  }, []);

  // Determine if the form should be blocked
  const isBlocked = conflictResult?.hasConflict && !hasOverride;

  return {
    isChecking,
    conflictResult,
    hasOverride,
    isBlocked,
    isAdmin,
    checkConflict,
    handleOverride,
    clearConflict
  };
}
