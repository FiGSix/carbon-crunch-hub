
import { supabase } from '@/integrations/supabase/client';
import { clearCache } from '../cache';

/**
 * Enhanced sign in function with improved session handling and error recovery
 */
export async function signIn(email: string, password: string) {
  if (import.meta.env.DEV) {
    console.log(`🔐 Signing in user with email: ${email}`);
  }
  const startTime = performance.now();
  
  // Clear cache on sign in
  clearCache();
  
  try {
    // Create timeout promise to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sign in timeout after 15 seconds')), 15000);
    });
    
    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    const { data, error } = await Promise.race([
      signInPromise,
      timeoutPromise
    ]);
    
    const endTime = performance.now();
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error(`❌ Sign in failed in ${(endTime - startTime).toFixed(2)}ms:`, error.message);
      }
      return { data: null, error };
    }
    
    if (data?.session) {
      if (import.meta.env.DEV) {
        console.log(`✅ Sign in successful in ${(endTime - startTime).toFixed(2)}ms, session established`);
        console.log('📊 Session details:', {
          userId: data.session.user.id,
          expiresAt: new Date(data.session.expires_at * 1000).toISOString(),
          hasAccessToken: !!data.session.access_token,
          hasRefreshToken: !!data.session.refresh_token
        });
      }
      
      // Ensure the session is properly stored
      try {
        // Force a session refresh to ensure tokens are valid
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Session refresh after sign in failed:', refreshError.message);
          }
          // Continue with original session if refresh fails
        } else if (refreshData.session) {
          if (import.meta.env.DEV) {
            console.log('🔄 Session refreshed after sign in');
          }
          return { data: refreshData, error: null };
        }
      } catch (refreshError) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Session refresh exception after sign in:', refreshError);
        }
        // Continue with original session if refresh fails
      }
      
      return { data, error: null };
    } else {
      const errorMsg = 'Sign in successful but no session was returned';
      if (import.meta.env.DEV) {
        console.error(`⚠️ ${errorMsg} in ${(endTime - startTime).toFixed(2)}ms`);
      }
      return { data: null, error: new Error(errorMsg) };
    }
  } catch (e) {
    const endTime = performance.now();
    if (import.meta.env.DEV) {
      console.error(`💥 Exception during signin after ${(endTime - startTime).toFixed(2)}ms:`, e);
    }
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signin") };
  }
}
