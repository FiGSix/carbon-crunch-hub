
import { supabase } from "@/integrations/supabase/client";
import { ProfileData } from "../types";

/**
 * Fetches profiles data for a list of user IDs from Supabase
 */
export async function fetchProfilesByIds(
  ids: string[]
): Promise<Record<string, ProfileData>> {
  if (ids.length === 0) {
    return {};
  }
  
  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', ids);
    
  if (error) {
    console.error("Error fetching profiles:", error);
    return {};
  }
  
  // Convert array to a lookup object
  return profilesData?.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<string, ProfileData>) || {};
}
