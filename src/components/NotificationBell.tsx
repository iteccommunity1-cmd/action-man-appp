import React from 'react';
import { Bell, CheckCircle2, Loader2 } from 'lucide-react';
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
        <Button variant="ghost" size="icon" className="relative rounded-xl h-10 w-10 hover:bg-white/10 transition-all group">
          <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-3xl shadow-2xl border-none ring-1 ring-white/10 glass-card overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 backdrop-blur-xl">
          <h4 className="font-black text-lg tracking-tight text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-[10px] uppercase tracking-widest font-bold text-primary hover:text-primary/80 hover:bg-transparent p-0 h-auto"
            >
              Mark all read
            </Button>
          )}
        </div>
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            <p className="text-xs text-muted-foreground font-medium">Fetching updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <Bell className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="flex flex-col py-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start px-6 py-4 mx-2 rounded-2xl cursor-pointer transition-all duration-300 group",
                    !notification.read
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-white/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-grow min-w-0 pr-2">
                    <p className={cn(
                      "text-xs leading-relaxed",
                      !notification.read ? "font-bold text-foreground" : "text-muted-foreground"
                    )}>
                      {notification.message}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground/40 mt-1 uppercase tracking-tight">
                      {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-1 shadow-[0_0_8px_rgba(249,115,22,0.6)] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="p-4 border-t border-white/5 bg-white/5">
          <Link to="/notifications" className="block w-full">
            <Button variant="ghost" className="w-full text-xs font-bold text-foreground/60 hover:text-foreground hover:bg-white/5 rounded-xl h-12 transition-all">
              View All Notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};