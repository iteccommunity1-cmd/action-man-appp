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
          navigate(notification.push_url || '/profile');
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
      <div className="flex items-center justify-center p-8 bg-background rounded-xl shadow-lg border border-border w-full max-w-3xl mx-auto min-h-[400px] glass-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
        <Link to="/" className="group flex items-center text-muted-foreground hover:text-primary font-bold text-sm tracking-widest uppercase transition-all duration-300">
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl ring-1 ring-white/10 backdrop-blur-md">
            <Select value={filterType} onValueChange={(value: NotificationFilterType) => setFilterType(value)}>
              <SelectTrigger id="filter-type" className="h-10 border-none bg-transparent hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider min-w-[140px]">
                <Filter className="h-3 w-3 mr-2 text-primary" />
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none ring-1 ring-white/10 glass-card shadow-2xl overflow-hidden p-1">
                {notificationTypes.map(type => (
                  <SelectItem key={type} value={type} className="rounded-xl text-xs font-bold uppercase tracking-tight py-3 focus:bg-primary/20">
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 shadow-[0_0_20px_rgba(249,115,22,0.2)] disabled:opacity-30 transition-all active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
        </div>
      </div>

      <div className="rounded-[2.5rem] border-none ring-1 ring-white/10 glass-card shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Recent Activity</h1>
            <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest mt-1">Stay updated with your team's progress</p>
          </div>
        </div>
        <div className="p-0">
          {notifications.length === 0 ? (
            <div className="py-32 text-center flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="h-24 w-24 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 relative z-10">
                  <Bell className="h-10 w-10 text-muted-foreground/20" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-foreground/40 italic">Total clarity, no noise</p>
                <p className="text-sm text-muted-foreground/40">You're all caught up with your notifications.</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)] min-h-[500px]">
              <div className="flex flex-col py-4 px-4">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start p-6 rounded-[2rem] transition-all duration-300 group mb-2 animate-fade-in-up",
                      !notification.read
                        ? "bg-primary/5 hover:bg-primary/10 shadow-[0_4px_20px_rgba(249,115,22,0.05)]"
                        : "hover:bg-white/5"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-grow cursor-pointer pr-4" onClick={() => handleNotificationAction(notification)}>
                      <p className={cn(
                        "text-sm leading-relaxed transition-colors",
                        !notification.read ? "font-bold text-foreground" : "text-muted-foreground"
                      )}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                        {!notification.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-10 w-10 text-muted-foreground hover:bg-white/10 hover:text-primary transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.read) {
                            markAsUnread(notification.id);
                          } else {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        {notification.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-10 w-10 text-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-all"
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
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none ring-1 ring-white/10 glass-card shadow-2xl p-10 max-w-md">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tight">Clear Activity?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will permanently remove this notification from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-bold px-6 transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNotification}
              className="h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold px-6 shadow-lg shadow-destructive/20 active:scale-95 transition-all"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationsPage;