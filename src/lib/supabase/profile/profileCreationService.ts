
import { supabase } from '../client';
import { getUserRoleFromMetadata } from './roleSyncService';
import { authLogger } from '@/lib/logger';

/**
 * Enhanced profile creation with proper role detection
 */
export async function createProfileWithCorrectRole(userId: string, userEmail: string): Promise<any> {
  authLogger.info("Creating new profile", { userId });
  
  // Get the correct role from auth metadata
  const detectedRole = await getUserRoleFromMetadata(userId);
  
  const newProfile = {
    id: userId,
    email: userEmail,
    role: detectedRole, // Use detected role instead of hardcoded 'client'
    first_name: '',
    last_name: '',
    created_at: new Date().toISOString()
  };
  
  authLogger.info("Creating profile with detected role", { userId, detectedRole });
  
  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();
  
  if (createError) {
    authLogger.error("Error creating profile", { userId, error: createError });
    return { profile: null, error: createError };
  }
  
  authLogger.info("Profile created successfully", { userId, role: detectedRole });
  return { profile: createdProfile, error: null };
}
