"use client";

import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Loader2, Bell, CheckCircle2, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notification';
import { Link, useNavigate } from 'react-router-dom';

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [notificationToDeleteId, setNotificationToDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

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
        // The useNotifications hook will automatically re-fetch/update state
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
    await markAsRead(notification.id); // Mark as read when clicked

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
          navigate(notification.pushUrl || '/profile'); // Navigate to profile for test notification
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
      <div className="flex items-center justify-center p-8 bg-background rounded-xl shadow-lg border border-border w-full max-w-3xl mx-auto min-h-[400px]"> {/* Updated background */}
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-lg text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-0 bg-background"> {/* Updated background */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
        </Link>
        <Button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" /> Mark All As Read
        </Button>
      </div>

      <Card className="rounded-xl glass-card"> {/* Applied glass-card */}
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">You're all caught up!</p>
              <p className="text-sm mt-2">No notifications to display.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)] sm:h-[600px]"> {/* Responsive height */}
              <div className="flex flex-col">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start p-4 border-b border-gray-100 last:border-b-0 transition-colors duration-200",
                      !notification.read ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"
                    )}
                  >
                    <div className="flex-grow cursor-pointer" onClick={() => handleNotificationAction(notification)}>
                      <p className={cn("text-base", !notification.read ? "font-semibold text-gray-900" : "text-gray-700")}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-gray-600 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        disabled={notification.read}
                      >
                        {notification.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-blue-600" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-red-600 hover:bg-red-50"
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
        <AlertDialogContent className="rounded-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-800">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-lg px-4 py-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNotification} className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationsPage;