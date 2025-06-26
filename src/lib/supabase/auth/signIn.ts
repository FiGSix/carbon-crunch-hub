
import { supabase } from '@/integrations/supabase/client';
import { clearCache } from '../cache';

/**
 * Simplified sign in function with better error handling
 */
export async function signIn(email: string, password: string) {
  if (import.meta.env.DEV) {
    console.log(`🔐 Signing in user with email: ${email}`);
  }
  
  // Clear cache on sign in
  clearCache();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error(`❌ Sign in failed:`, error.message);
      }
      return { data: null, error };
    }
    
    if (data?.session) {
      if (import.meta.env.DEV) {
        console.log(`✅ Sign in successful, session established`);
      }
      return { data, error: null };
    } else {
      const errorMsg = 'Sign in successful but no session was returned';
      if (import.meta.env.DEV) {
        console.error(`⚠️ ${errorMsg}`);
      }
      return { data: null, error: new Error(errorMsg) };
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(`💥 Exception during signin:`, e);
    }
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signin") };
  }
}
