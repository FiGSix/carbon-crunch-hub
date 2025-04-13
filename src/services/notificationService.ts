
import { supabase } from "@/integrations/supabase/client";

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  relatedId?: string;
  relatedType?: string;
}

export const createNotification = async (data: NotificationData): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Creating notification:", data);
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        related_id: data.relatedId,
        related_type: data.relatedType
      });
    
    if (error) {
      console.error("Error creating notification:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error creating notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};
