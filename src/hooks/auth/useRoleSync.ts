
import { useEffect, useState } from 'react';
import { useAuthSimplified } from '@/hooks/useAuthSimplified';
import { RoleValidationService } from '@/services/auth/RoleValidationService';
import { synchronizeUserRole } from '@/lib/supabase/profile';
import { UserRole } from '@/contexts/auth/types';
import { authLogger } from '@/lib/logger';

export interface RoleSyncStatus {
  isChecking: boolean;
  isValid: boolean;
  correctedRole?: UserRole;
  lastChecked?: Date;
  error?: string;
}

/**
 * Hook to automatically validate and sync user roles on authentication
 */
export function useRoleSync() {
  const { user, profile } = useAuthSimplified();
  const [syncStatus, setSyncStatus] = useState<RoleSyncStatus>({
    isChecking: false,
    isValid: true
  });

  useEffect(() => {
    let mounted = true;

    const validateAndSyncRole = async () => {
      if (!user?.id || !profile) {
        return;
      }

      setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));

      try {
        authLogger.info("Auto role sync started", { userId: user.id });
        
        // Validate current role
        const validation = await RoleValidationService.validateUserRole(user.id);
        
        if (!mounted) return;

        if (validation.mismatchDetected || validation.correctionNeeded) {
          authLogger.warn("Role sync needed", { userId: user.id, validation });
          
          // Attempt synchronization
          const syncResult = await synchronizeUserRole(user.id);
          
          if (!mounted) return;

          if (syncResult.success) {
            setSyncStatus({
              isChecking: false,
              isValid: true,
              correctedRole: syncResult.role,
              lastChecked: new Date()
            });
            authLogger.info("Role sync completed successfully", { 
              userId: user.id, 
              correctedRole: syncResult.role 
            });
          } else {
            setSyncStatus({
              isChecking: false,
              isValid: false,
              error: syncResult.error,
              lastChecked: new Date()
            });
            authLogger.error("Role sync failed", { userId: user.id, error: syncResult.error });
          }
        } else {
          setSyncStatus({
            isChecking: false,
            isValid: true,
            lastChecked: new Date()
          });
          authLogger.info("Role validation passed", { 
            userId: user.id, 
            detectedRole: validation.detectedRole 
          });
        }

      } catch (error) {
        if (!mounted) return;
        
        authLogger.error("Role sync error", { userId: user.id, error });
        setSyncStatus({
          isChecking: false,
          isValid: false,
          error: error instanceof Error ? error.message : 'Unknown role sync error',
          lastChecked: new Date()
        });
      }
    };

    // Run validation when user or profile changes
    if (user?.id && profile) {
      // Debounce to avoid multiple rapid checks
      const timeoutId = setTimeout(validateAndSyncRole, 1000);
      
      return () => {
        clearTimeout(timeoutId);
        mounted = false;
      };
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, profile?.role]);

  const manualSync = async (): Promise<boolean> => {
    if (!user?.id) {
      authLogger.warn("No user available for manual role sync");
      return false;
    }

    authLogger.info("Manual role sync started", { userId: user.id });
    setSyncStatus(prev => ({ ...prev, isChecking: true, error: undefined }));

    try {
      const syncResult = await synchronizeUserRole(user.id);
      
      setSyncStatus({
        isChecking: false,
        isValid: syncResult.success,
        correctedRole: syncResult.role,
        error: syncResult.error,
        lastChecked: new Date()
      });

      if (syncResult.success) {
        authLogger.info("Manual role sync completed successfully", { 
          userId: user.id, 
          correctedRole: syncResult.role 
        });
      } else {
        authLogger.error("Manual role sync failed", { userId: user.id, error: syncResult.error });
      }

      return syncResult.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Manual sync failed';
      authLogger.error("Manual role sync exception", { userId: user.id, error });
      setSyncStatus({
        isChecking: false,
        isValid: false,
        error: errorMessage,
        lastChecked: new Date()
      });
      return false;
    }
  };

  return {
    syncStatus,
    manualSync
  };
}
