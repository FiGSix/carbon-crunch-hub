
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getNotifications, markAllNotificationsAsRead, Notification, deleteNotification } from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchNotifications = async () => {
    setLoading(true);
    const { notifications: fetchedNotifications } = await getNotifications(50);
    setNotifications(fetchedNotifications);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    fetchNotifications();
  };
  
  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id);
    fetchNotifications();
  };
  
  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Notifications" 
        description="View and manage your notifications." 
      />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          {notifications.length > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-xl font-medium">No notifications</p>
              <p>You don't have any notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-1 -mx-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`
                    p-3 flex justify-between items-start hover:bg-muted/30 rounded-md
                    ${!notification.read ? 'bg-muted/20' : ''}
                  `}
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-40 hover:opacity-100"
                    onClick={() => handleDeleteNotification(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Notifications;
