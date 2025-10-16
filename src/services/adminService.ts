import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all admin user IDs for sending notifications
 */
export async function getAllAdminUserIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    
    if (error) {
      console.error("Error fetching admin user IDs:", error);
      throw error;
    }
    
    return (data || []).map(profile => profile.id);
  } catch (error) {
    console.error("Exception in getAllAdminUserIds:", error);
    return [];
  }
}
