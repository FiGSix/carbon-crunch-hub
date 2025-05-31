
import { supabase } from '../client'
import { UserRole } from '../types'
import { clearCache } from '../cache'

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, role: UserRole, metadata: Record<string, any> = {}) {
  console.log(`Signing up new user with email: ${email}, role: ${role}`);
  
  // Clear cache on sign up
  clearCache();
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          ...metadata,
        },
        emailRedirectTo: `${window.location.origin}/login`
      },
    });
    
    return { data, error };
  } catch (e) {
    console.error("Exception during signup:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signup") };
  }
}
