
import { useState, useEffect, useRef, useCallback } from "react";
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
import { cacheStore } from "@/lib/supabase/cache";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  
  // Request deduplication
  const fetchRequestRef = useRef<Promise<void> | null>(null);
  const lastFetchTimestampRef = useRef<number>(0);
  const CACHE_TTL = 30000; // 30 seconds
  const MIN_FETCH_INTERVAL = 1000; // 1 second minimum between requests
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Cached notification fetching with deduplication
  const fetchNotifications = useCallback(async (force = false) => {
    if (!user) return;
    
    const now = Date.now();
    const cacheKey = `notifications_${user.id}`;
    
    // Check cache first (unless forced refresh)
    if (!force) {
      const cached = cacheStore.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        setNotifications(cached.data);
        setLoading(false);
        return;
      }
      
      // Rate limiting: prevent requests within minimum interval
      if (now - lastFetchTimestampRef.current < MIN_FETCH_INTERVAL) {
        return;
      }
    }
    
    // Deduplication: if there's already a request in flight, wait for it
    if (fetchRequestRef.current) {
      await fetchRequestRef.current;
      return;
    }
    
    setLoading(true);
    lastFetchTimestampRef.current = now;
    
    // Create and store the request promise
    fetchRequestRef.current = (async () => {
      try {
        const { notifications: fetchedNotifications, error } = await getNotifications(10);
        if (error) {
          console.error("Error fetching notifications:", { message: error, details: error });
          setNotifications([]);
        } else {
          setNotifications(fetchedNotifications);
          // Cache the successful response
          cacheStore.set(cacheKey, {
            data: fetchedNotifications,
            timestamp: now,
            ttl: CACHE_TTL
          });
        }
      } catch (error) {
        console.error("Error fetching notifications:", { message: "TypeError: Failed to fetch", details: error instanceof Error ? error.stack : error });
        setNotifications([]);
      } finally {
        setLoading(false);
        fetchRequestRef.current = null;
      }
    })();
    
    await fetchRequestRef.current;
  }, [user]);
  
  // Debounced refresh function for realtime updates
  const debouncedRefresh = useCallback(() => {
    // Invalidate cache for fresh data on realtime updates
    if (user) {
      const cacheKey = `notifications_${user.id}`;
      cacheStore.delete(cacheKey);
      fetchNotifications(true);
    }
  }, [user, fetchNotifications]);
  
  useEffect(() => {
    fetchNotifications();
    
    // Optimized realtime subscription with debounced refresh
    if (user) {
      let cleanupFn: (() => void) | null = null;
      
      import('@/services/optimizedRealtimeService').then(({ OptimizedRealtimeService }) => {
        OptimizedRealtimeService.subscribeToNotificationChanges(
          user.id,
          debouncedRefresh
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
  }, [user, fetchNotifications, debouncedRefresh]);
  
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
