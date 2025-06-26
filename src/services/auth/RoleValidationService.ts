
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/contexts/auth/types';
import { authLogger } from '@/lib/logger';

export interface RoleValidationResult {
  isValid: boolean;
  detectedRole: UserRole;
  profileRole?: UserRole;
  mismatchDetected: boolean;
  correctionNeeded: boolean;
  error?: string;
}

/**
 * Service for validating and correcting user roles
 */
export class RoleValidationService {
  
  /**
   * Validate that a user's profile role matches their auth metadata role
   */
  static async validateUserRole(userId: string): Promise<RoleValidationResult> {
    try {
      authLogger.info("Validating role for user", { userId });
      
      // Get user auth metadata
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user || user.id !== userId) {
        authLogger.warn("Unable to access user auth data", { userId, error: authError });
        return {
          isValid: false,
          detectedRole: 'client',
          mismatchDetected: false,
          correctionNeeded: false,
          error: 'Unable to access user auth data'
        };
      }
      
      // Extract role from metadata
      const metadataRole = (user.user_metadata?.role || user.app_metadata?.role || 'client') as UserRole;
      
      // Get profile role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        authLogger.error("Profile access error during role validation", { 
          userId, 
          error: profileError.message 
        });
        return {
          isValid: false,
          detectedRole: metadataRole,
          mismatchDetected: false,
          correctionNeeded: true,
          error: `Profile access error: ${profileError.message}`
        };
      }
      
      const profileRole = profile?.role as UserRole;
      const mismatchDetected = profileRole && profileRole !== metadataRole;
      
      authLogger.info("Role validation completed", { 
        userId,
        metadataRole, 
        profileRole, 
        mismatchDetected 
      });
      
      return {
        isValid: !mismatchDetected && profileRole === metadataRole,
        detectedRole: metadataRole,
        profileRole,
        mismatchDetected: !!mismatchDetected,
        correctionNeeded: !profile || mismatchDetected
      };
      
    } catch (error) {
      authLogger.error("Exception during role validation", { userId, error });
      return {
        isValid: false,
        detectedRole: 'client',
        mismatchDetected: false,
        correctionNeeded: true,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }
  
  /**
   * Correct a user's profile role to match their auth metadata
   */
  static async correctUserRole(userId: string): Promise<{ success: boolean; correctedRole?: UserRole; error?: string }> {
    try {
      const validation = await this.validateUserRole(userId);
      
      if (!validation.correctionNeeded) {
        authLogger.info("Role correction not needed", { userId, currentRole: validation.profileRole });
        return { 
          success: true, 
          correctedRole: validation.profileRole || validation.detectedRole 
        };
      }

      // Get user data for email
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user || user.id !== userId) {
        authLogger.error("Unable to access user auth data for correction", { userId, error: authError });
        return { 
          success: false, 
          error: 'Unable to access user auth data for correction' 
        };
      }
      
      authLogger.info("Correcting user role", { 
        userId, 
        fromRole: validation.profileRole || 'none', 
        toRole: validation.detectedRole 
      });
      
      // Update or insert profile with correct role, including required email
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user.email || '',
          role: validation.detectedRole
        }, {
          onConflict: 'id'
        });
      
      if (upsertError) {
        authLogger.error("Error correcting user role", { userId, error: upsertError });
        return { 
          success: false, 
          error: `Failed to correct role: ${upsertError.message}` 
        };
      }
      
      authLogger.info("Role corrected successfully", { userId, correctedRole: validation.detectedRole });
      return { 
        success: true, 
        correctedRole: validation.detectedRole 
      };
      
    } catch (error) {
      authLogger.error("Exception during role correction", { userId, error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown correction error' 
      };
    }
  }
  
  /**
   * Batch validate roles for multiple users (admin only)
   */
  static async batchValidateRoles(userIds: string[]): Promise<{ [userId: string]: RoleValidationResult }> {
    authLogger.info("Starting batch role validation", { userCount: userIds.length });
    const results: { [userId: string]: RoleValidationResult } = {};
    
    for (const userId of userIds) {
      results[userId] = await this.validateUserRole(userId);
    }
    
    authLogger.info("Batch role validation completed", { userCount: userIds.length });
    return results;
  }
}
