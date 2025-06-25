
import { supabase } from '@/integrations/supabase/client';
import { clearCache } from '../cache';

/**
 * Optimized sign in function with performance improvements
 */
export async function signIn(email: string, password: string) {
  if (import.meta.env.DEV) {
    console.log(`🔐 Signing in user with email: ${email}`);
  }
  const startTime = performance.now();
  
  // Clear cache on sign in
  clearCache();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    const endTime = performance.now();
    
    if (import.meta.env.DEV) {
      if (data?.session) {
        console.log(`✅ Sign in successful in ${(endTime - startTime).toFixed(2)}ms, session established`);
      } else {
        console.log(`⚠️ Sign in completed in ${(endTime - startTime).toFixed(2)}ms but no session was returned`);
      }
    }
    
    return { data, error };
  } catch (e) {
    const endTime = performance.now();
    if (import.meta.env.DEV) {
      console.error(`❌ Exception during signin after ${(endTime - startTime).toFixed(2)}ms:`, e);
    }
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signin") };
  }
}
