
import { supabase } from '../client'
import { clearCache } from '../cache'

/**
 * Sign out the current user
 */
export async function signOut() {
  console.log("Starting signOut process...");
  
  try {
    // Clear all caches first
    clearCache();
    console.log("Cache cleared");
    
    // Clear all Supabase-related items from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    
    // Remove collected keys
    keysToRemove.forEach(key => {
      console.log(`Removing localStorage item: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Clear session storage
    console.log("Clearing session storage");
    sessionStorage.clear();
    
    // Finally, call the official sign out method and wait for it to complete
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Error during supabase.auth.signOut():", error);
      return { error };
    }
    
    console.log("Sign out completed successfully");
    return { error: null };
  } catch (e) {
    console.error("Exception during signOut:", e);
    return { error: e instanceof Error ? e : new Error("Unknown error during signOut") };
  }
}
