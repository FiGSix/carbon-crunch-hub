
import { supabase } from '../client';
import { UserRole } from '@/contexts/auth/types';
import { authLogger } from '@/lib/logger';

/**
 * Enhanced role detection from user metadata
 */
export async function getUserRoleFromMetadata(userId: string): Promise<UserRole> {
  try {
    // Get user metadata from auth.users
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || user.id !== userId) {
      authLogger.warn("Could not get user metadata for role detection", { userId, error: error?.message });
      return 'client'; // Safe default
    }
    
    // Check user metadata for role
    const metadataRole = user.user_metadata?.role || user.app_metadata?.role;
    
    if (metadataRole && ['client', 'agent', 'admin'].includes(metadataRole)) {
      authLogger.info("Role detected from metadata", { userId, metadataRole });
      return metadataRole as UserRole;
    }
    
    authLogger.warn("No valid role in metadata, defaulting to client", { userId });
    return 'client';
  } catch (error) {
    authLogger.error("Exception getting user role from metadata", { userId, error });
    return 'client';
  }
}

/**
 * Role synchronization function to ensure profile role matches auth metadata
 */
export async function synchronizeUserRole(userId: string): Promise<{ success: boolean; role?: UserRole; error?: string }> {
  try {
    authLogger.info("Starting role synchronization", { userId });
    
    // Get role from auth metadata
    const metadataRole = await getUserRoleFromMetadata(userId);
    
    // Get current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      authLogger.error("Error fetching profile for role sync", { userId, error: profileError });
      return { success: false, error: profileError.message };
    }
    
    // If profile doesn't exist or role mismatch, update it
    if (!currentProfile || currentProfile.role !== metadataRole) {
      authLogger.info("Role sync needed", { 
        userId, 
        currentRole: currentProfile?.role, 
        targetRole: metadataRole 
      });
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: metadataRole })
        .eq('id', userId);
      
      if (updateError) {
        authLogger.error("Error updating profile role", { userId, error: updateError });
        return { success: false, error: updateError.message };
      }
      
      authLogger.info("Role synchronized successfully", { userId, role: metadataRole });
      return { success: true, role: metadataRole };
    }
    
    authLogger.info("Role already synchronized", { userId, role: metadataRole });
    return { success: true, role: metadataRole };
    
  } catch (error) {
    authLogger.error("Exception during role synchronization", { userId, error });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during role sync"
    };
  }
}
