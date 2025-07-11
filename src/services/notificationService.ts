import { supabase } from "@/integrations/supabase/client";

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  relatedId?: string;
  relatedType?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  related_id?: string;
  related_type?: string;
  read: boolean;
  created_at: string;
}

export const createNotification = async (data: NotificationData): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Creating notification:", data);
    
    // Check if user ID is provided and valid
    if (!data.userId) {
      console.error("Error: userId is required for creating notifications");
      return { success: false, error: "userId is required" };
    }
    
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

export const getNotifications = async (limit: number = 10): Promise<{ notifications: Notification[]; error?: string }> => {
  try {
    // Add authentication check to prevent unnecessary API calls
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { notifications: [], error: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        title,
        message,
        type,
        read,
        created_at,
        related_type,
        related_id
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      // Enhanced error handling with specific error types
      if (error.code === 'PGRST301') {
        return { notifications: [], error: "Access denied" };
      }
      if (error.message.includes('Failed to fetch')) {
        return { notifications: [], error: "Network connection issue" };
      }
      return { notifications: [], error: error.message };
    }
    
    return { notifications: data as Notification[] };
  } catch (error) {
    // Enhanced error handling for network issues
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return { notifications: [], error: "Network connection issue - please check your internet connection" };
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { notifications: [], error: errorMessage };
  }
};

export const markNotificationAsRead = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Marking notification as read:", id);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error marking notification as read:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};

export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Marking all notifications as read");
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);
    
    if (error) {
      console.error("Error marking all notifications as read:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error marking all notifications as read:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};

export const deleteNotification = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Deleting notification:", id);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting notification:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};
