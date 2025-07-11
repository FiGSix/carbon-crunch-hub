
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationList } from "./NotificationList";
import { getNotifications, Notification } from "@/services/notificationService";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    const { notifications: fetchedNotifications } = await getNotifications(10);
    setNotifications(fetchedNotifications);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchNotifications();
    
    // Phase 5: Use optimized realtime subscription for new notifications
    if (user) {
      let cleanupFn: (() => void) | null = null;
      
      import('@/services/optimizedRealtimeService').then(({ OptimizedRealtimeService }) => {
        OptimizedRealtimeService.subscribeToNotificationChanges(
          user.id,
          () => {
            fetchNotifications();
          }
        );
        
        cleanupFn = () => {
          OptimizedRealtimeService.unsubscribe(`notifications-${user.id}`);
        };
      });
        
      return () => {
        if (cleanupFn) {
          cleanupFn();
        }
      };
    }
  }, [user]);
  
  if (!user) return null;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationList 
          notifications={notifications} 
          loading={loading}
          onNotificationClick={() => setOpen(false)}
          onRefresh={fetchNotifications}
        />
      </PopoverContent>
    </Popover>
  );
}
