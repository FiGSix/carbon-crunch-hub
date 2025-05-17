
import { supabase } from '@/integrations/supabase/client';
import { clearCache } from '../cache';

/**
 * Sign out the current user
 * @returns Promise that resolves when logout is complete
 */
export async function signOut() {
  console.log("Starting signOut process...");
  
  try {
    // Clear all caches first
    clearCache();
    console.log("Cache cleared");
    
    // Call the official sign out method and wait for it to complete
    const { error } = await supabase.auth.signOut({
      scope: 'global'  // Sign out from all devices
    });
    
    if (error) {
      console.error("Error during supabase.auth.signOut():", error);
      return { success: false, error };
    }
    
    console.log("Sign out completed successfully");
    return { success: true, error: null };
  } catch (e) {
    console.error("Exception during signOut:", e);
    return { success: false, error: e instanceof Error ? e : new Error("Unknown error during signOut") };
  }
}
