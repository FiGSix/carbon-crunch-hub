
import React from "react";
import { 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Check,
  Bell,
  MoreHorizontal
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notification, markNotificationAsRead, markAllNotificationsAsRead } from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onNotificationClick?: () => void;
  onRefresh?: () => void;
}

export function NotificationList({ 
  notifications, 
  loading,
  onNotificationClick,
  onRefresh
}: NotificationListProps) {
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      if (onRefresh) onRefresh();
    }
    
    // If there's a related item, we could navigate to it here
    // For now, just close the popover if callback provided
    if (onNotificationClick) onNotificationClick();
  };
  
  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    if (onRefresh) onRefresh();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-[200px] text-muted-foreground">
        <Bell className="h-12 w-12 mb-2 opacity-20" />
        <p>No notifications yet</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="font-medium p-2">Notifications</h3>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            title="Refresh"
          >
            <Loader2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAllAsRead} 
            title="Mark all as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[300px]">
        <div className="divide-y">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`
                p-3 cursor-pointer hover:bg-muted/50 transition-colors
                ${!notification.read ? 'bg-muted/20' : ''}
              `}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 -mt-1 -mr-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.read && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notification.id).then(onRefresh);
                            }}
                          >
                            Mark as read
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground/70">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
