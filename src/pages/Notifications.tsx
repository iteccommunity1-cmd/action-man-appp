"use client";

import React, { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Loader2, Bell, CheckCircle2, Trash2, Eye, EyeOff, ArrowLeft, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notification';
import { Link, useNavigate } from 'react-router-dom';

type NotificationFilterType = Notification['type'] | 'all';

const NotificationsPage: React.FC = () => {
  const [filterType, setFilterType] = useState<NotificationFilterType>('all');
  const { notifications, unreadCount, loading, markAsRead, markAsUnread, markAllAsRead } = useNotifications(filterType);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [notificationToDeleteId, setNotificationToDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const notificationTypes = useMemo(() => {
    const types = new Set<string>();
    notifications.forEach(n => {
      if (n.type) types.add(n.type);
    });
    return ['all', ...Array.from(types).sort()];
  }, [notifications]);

  const handleDeleteNotification = (notificationId: string) => {
    setNotificationToDeleteId(notificationId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteNotification = async () => {
    if (!notificationToDeleteId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationToDeleteId);

      if (error) {
        console.error("[NotificationsPage] Error deleting notification:", error);
        showError("Failed to delete notification: " + error.message);
      } else {
        showSuccess("Notification deleted successfully!");
      }
    } catch (error) {
      console.error("[NotificationsPage] Unexpected error deleting notification:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setNotificationToDeleteId(null);
    }
  };

  const handleNotificationAction = async (notification: Notification) => {
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
          navigate(notification.pushUrl || '/profile');
          break;
        default:
          // Optionally navigate to a generic notifications page or home
          // navigate('/');
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-background rounded-xl shadow-lg border border-border w-full max-w-3xl mx-auto min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-0 bg-background">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <Link to="/" className="flex items-center text-primary hover:text-primary/80 font-medium text-lg transition-colors duration-200">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            <Label htmlFor="filter-type" className="text-foreground sr-only sm:not-sr-only">Filter:</Label>
            <Select value={filterType} onValueChange={(value: NotificationFilterType) => setFilterType(value)}>
              <SelectTrigger id="filter-type" className="w-full sm:w-[180px] rounded-lg border-border bg-input text-foreground hover:bg-input/80">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
                {notificationTypes.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 flex-shrink-0"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" /> Mark All As Read
          </Button>
        </div>
      </div>

      <Card className="rounded-xl glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg">You're all caught up!</p>
              <p className="text-sm mt-2">No notifications to display.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)] sm:h-[600px]">
              <div className="flex flex-col">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start p-4 border-b border-border last:border-b-0 transition-colors duration-200",
                      !notification.read ? "bg-secondary/30 hover:bg-secondary/50" : "bg-card hover:bg-muted/20"
                    )}
                  >
                    <div className="flex-grow cursor-pointer" onClick={() => handleNotificationAction(notification)}>
                      <p className={cn("text-base", !notification.read ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.read) {
                            markAsUnread(notification.id);
                          } else {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        {notification.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-primary" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNotification} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationsPage;