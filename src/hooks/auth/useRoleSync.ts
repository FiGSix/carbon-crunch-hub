
import { useEffect, useState } from 'react';
import { useAuthSimplified } from '@/hooks/useAuthSimplified';
import { RoleValidationService } from '@/services/auth/RoleValidationService';
import { synchronizeUserRole } from '@/lib/supabase/profile';
import { UserRole } from '@/contexts/auth/types';

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
        console.log(`🔄 Auto role sync for user: ${user.id}`);
        
        // Validate current role
        const validation = await RoleValidationService.validateUserRole(user.id);
        
        if (!mounted) return;

        if (validation.mismatchDetected || validation.correctionNeeded) {
          console.log(`🔧 Role sync needed:`, validation);
          
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
            console.log(`✅ Role sync completed: ${syncResult.role}`);
          } else {
            setSyncStatus({
              isChecking: false,
              isValid: false,
              error: syncResult.error,
              lastChecked: new Date()
            });
            console.error(`❌ Role sync failed: ${syncResult.error}`);
          }
        } else {
          setSyncStatus({
            isChecking: false,
            isValid: true,
            lastChecked: new Date()
          });
          console.log(`✅ Role validation passed: ${validation.detectedRole}`);
        }

      } catch (error) {
        if (!mounted) return;
        
        console.error('Role sync error:', error);
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
      console.warn('No user available for manual role sync');
      return false;
    }

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

      return syncResult.success;
    } catch (error) {
      setSyncStatus({
        isChecking: false,
        isValid: false,
        error: error instanceof Error ? error.message : 'Manual sync failed',
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
