
import { supabase } from '../client'
import { clearCache } from '../cache'

/**
 * Sign in a user with email and password
 */
export async function signIn(email: string, password: string) {
  console.log(`Signing in user with email: ${email}`);
  
  // Clear cache on sign in
  clearCache();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  } catch (e) {
    console.error("Exception during signin:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signin") };
  }
}
