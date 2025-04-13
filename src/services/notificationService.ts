
import { supabase } from "@/integrations/supabase/client";

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedId?: string;
  relatedType?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  related_id?: string;
  related_type?: string;
}

/**
 * Creates a new notification for a user
 */
export async function createNotification(data: NotificationData): Promise<{success: boolean, error?: string}> {
  try {
    console.log("Creating notification with data:", {
      userId: data.userId,
      title: data.title,
      type: data.type,
      relatedId: data.relatedId,
      relatedType: data.relatedType
    });
    
    // First try to create via the edge function (preferred method)
    try {
      console.log("Attempting to create notification via edge function...");
      const response = await supabase.functions.invoke('create-notification', {
        body: data
      });
      
      if (response.error) {
        console.error("Edge function error:", response.error);
        throw new Error(response.error.message || "Edge function error");
      }
      
      console.log("Notification created successfully via edge function");
      return { success: true };
    } catch (edgeFunctionError) {
      console.error("Edge function error:", edgeFunctionError);
      console.log("Falling back to direct database insert...");
      
      // Fallback to direct database insert if edge function fails
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          related_id: data.relatedId,
          related_type: data.relatedType,
          read: false,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
      
      console.log("Notification created successfully via direct insert");
      return { success: true };
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches notifications for the current user
 */
export async function getNotifications(limit = 10): Promise<{notifications: Notification[], error?: string}> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { notifications: data as Notification[] || [] };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{success: boolean, error?: string}> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marks all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<{success: boolean, error?: string}> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("User not authenticated");
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.user.id)
      .eq('read', false);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Deletes a notification
 */
export async function deleteNotification(notificationId: string): Promise<{success: boolean, error?: string}> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
