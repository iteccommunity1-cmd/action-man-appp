import React from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/notification';
import { useNavigate, Link } from 'react-router-dom'; // Import Link

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);

    if (notification.related_id) {
      switch (notification.type) {
        case 'task_update':
        case 'project_assignment':
        case 'project_status_update':
        case 'task_priority_update':
          navigate(`/projects/${notification.related_id}`);
          break;
        case 'chat_mention':
        case 'chat_message':
          navigate('/chat', { state: { activeChatRoomId: notification.related_id } });
          break;
        case 'test_notification':
          navigate(notification.push_url || '/profile');
          break;
        default:
          // Optionally navigate to a generic notifications page or home
          // navigate('/');
          break;
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10">
          <Bell className="h-6 w-6 text-gray-700 hover:text-blue-600 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-xs p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold text-lg text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary hover:text-primary/80 text-sm rounded-lg">
              Mark all as read
            </Button>
          )}
        </div>
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No new notifications.</div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start p-4 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors",
                    !notification.read ? "bg-secondary/30 hover:bg-secondary/50" : "bg-card hover:bg-muted/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-grow">
                    <p className={cn("text-sm", !notification.read ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <CheckCircle2 className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="p-2 border-t border-border flex justify-center">
          <Link to="/notifications" className="w-full">
            <Button variant="ghost" className="w-full text-primary hover:text-primary/80 text-sm rounded-lg">
              View All Notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};