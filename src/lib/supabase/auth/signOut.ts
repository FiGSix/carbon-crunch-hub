
import { supabase } from '../client'
import { clearCache } from '../cache'

/**
 * Sign out the current user
 */
export async function signOut() {
  console.log("Signing out...");
  
  // Clear cache on sign out
  clearCache();
  
  // Clear all Supabase-related items from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      console.log(`Removing localStorage item: ${key}`);
      localStorage.removeItem(key);
    }
  }
  
  // Clear session storage as well
  console.log("Clearing session storage");
  sessionStorage.clear();
  
  try {
    // Finally, call the official sign out method
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (e) {
    console.error("Exception during signOut:", e);
    return { error: e instanceof Error ? e : new Error("Unknown error during signOut") };
  }
}
