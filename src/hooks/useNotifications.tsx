import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Notification } from '@/types/notification';
import { showError } from '@/utils/toast';

type NotificationFilterType = Notification['type'] | 'all';

export const useNotifications = (filterType: NotificationFilterType = 'all') => {
  const { currentUser } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id);

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("[useNotifications] Error fetching notifications:", error);
        showError("Failed to load notifications.");
      } else {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Realtime subscription for new notifications
    // Note: Realtime subscriptions don't support filtering by 'type' directly in the filter clause
    // so we'll filter in client-side for new inserts/updates if a filter is active.
    const channel = supabase
      .channel(`notifications_for_user_${currentUser.id}_${filterType}`) // Unique channel name for filter
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (filterType === 'all' || newNotification.type === filterType) { // Client-side filter
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          const previousNotification = payload.old as Notification;
          setNotifications((prev) => {
            const updated = prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n));
            // If filter is active, ensure updated notification still matches or remove it
            if (filterType !== 'all' && updatedNotification.type !== filterType) {
              return updated.filter(n => n.id !== updatedNotification.id);
            }
            return updated;
          });
          // Only adjust unread count if read status actually changed
          if (updatedNotification.read !== previousNotification.read) {
            setUnreadCount((prev) =>
              updatedNotification.read ? Math.max(0, prev - 1) : prev + 1
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const deletedNotification = payload.old as Notification;
          setNotifications((prev) => {
            const filtered = prev.filter((n) => n.id !== deletedNotification.id);
            if (!deletedNotification.read) {
              setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
            }
            return filtered;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, filterType]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error("[useNotifications] Error marking notification as read:", error);
      showError("Failed to mark notification as read.");
    } else {
      // State will be updated via real-time subscription
    }
  };

  const markAsUnread = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: false })
      .eq('id', notificationId);

    if (error) {
      console.error("[useNotifications] Error marking notification as unread:", error);
      showError("Failed to mark notification as unread.");
    } else {
      // State will be updated via real-time subscription
    }
  };

  const markAllAsRead = async () => {
    const unreadNotificationIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadNotificationIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadNotificationIds);

    if (error) {
      console.error("[useNotifications] Error marking all notifications as read:", error);
      showError("Failed to mark all notifications as read.");
    } else {
      // State will be updated via real-time subscription
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAsUnread, markAllAsRead };
};