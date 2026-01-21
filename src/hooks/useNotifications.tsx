import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useUser } from '@/contexts/UserContext';
import { Notification } from '@/types/notification';
import { showError } from '@/utils/toast';

export const useNotifications = () => {
  const { supabase } = useSupabase();
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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

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
    const channel = supabase
      .channel(`notifications_for_user_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          setUnreadCount((prev) =>
            updatedNotification.read ? Math.max(0, prev - 1) : prev + 1
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUser?.id]);

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

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};