
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
          // Set pending_approval status for agents
          ...(role === 'agent' ? { agent_status: 'pending_approval' } : {}),
          ...metadata,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    });
    
    // Detect duplicate signup: Supabase returns a user with empty identities
    if (!error && data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      return {
        data: null,
        error: new Error("An account with this email already exists. Please log in or reset your password.")
      };
    }
    
    return { data, error };
  } catch (e) {
    console.error("Exception during signup:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signup") };
  }
}
