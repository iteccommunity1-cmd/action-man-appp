import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { showError, showSuccess } from '@/utils/toast';
import { sendNotification } from '@/utils/notifications'; // Import sendNotification

// IMPORTANT: Replace this with your actual VAPID public key.
// You can generate VAPID keys using a tool like web-push-codelab.glitch.me
// or by running `npx web-push generate-vapid-keys` in your terminal.
// The public key will be used here, and the private key will be set as a Supabase Edge Function secret.
const VAPID_PUBLIC_KEY = "BDiWWVjmSr4A08yeQ7Iuq2-5t-LTaJjCChjPjfUfvslGI7uHZqzB9eCWLR9qgLr-ln__ZWI4wTQHGzX_rs-cAow"; 

export const usePushNotifications = () => {
  const { currentUser } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !currentUser?.id) {
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Verify if the subscription exists in our database
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('endpoint', subscription.endpoint)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("[usePushNotifications] Error checking subscription in DB:", error);
          setIsSubscribed(false);
        } else if (data) {
          setIsSubscribed(true);
        } else {
          // Subscription exists in browser but not in DB, remove it
          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("[usePushNotifications] Error checking push subscription:", error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    checkSubscription();
  }, [checkSubscription]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      showError("Notifications are not supported by your browser.");
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    return permission;
  }, []);

  const subscribeUser = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !currentUser?.id) {
      showError("Push notifications are not supported or user not logged in.");
      return;
    }

    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        showError("Notification permission denied.");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        // If already subscribed in browser, ensure it's in DB
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('endpoint', existingSubscription.endpoint)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("[usePushNotifications] Error checking existing subscription in DB:", error);
          showError("Failed to verify existing subscription.");
          setIsLoading(false);
          return;
        }
        if (data) {
          setIsSubscribed(true);
          showSuccess("Already subscribed to push notifications.");
          setIsLoading(false);
          return;
        } else {
          // Browser has subscription, but DB doesn't. Unsubscribe and resubscribe.
          await existingSubscription.unsubscribe();
        }
      }

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };

      const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);

      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: currentUser.id,
        endpoint: pushSubscription.endpoint,
        p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(pushSubscription.getKey('p256dh')!)))),
        auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(pushSubscription.getKey('auth')!)))),
      });

      if (error) {
        console.error("[usePushNotifications] Error saving subscription to DB:", error);
        showError("Failed to subscribe to push notifications: " + error.message);
        await pushSubscription.unsubscribe(); // Clean up browser subscription
      } else {
        setIsSubscribed(true);
        showSuccess("Successfully subscribed to push notifications!");
        // Send a test notification
        sendNotification({
          userId: currentUser.id,
          message: "You've successfully enabled push notifications!",
          type: 'test_notification',
          pushTitle: "Notifications Enabled!",
          pushBody: "You will now receive updates directly to your device.",
          pushIcon: currentUser.avatar,
          pushUrl: "/profile",
        });
      }
    } catch (error) {
      console.error("[usePushNotifications] Error subscribing user:", error);
      showError("An error occurred while subscribing to push notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, requestNotificationPermission]);

  const unsubscribeUser = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !currentUser?.id) {
      showError("Push notifications are not supported or user not logged in.");
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) {
        console.error("[usePushNotifications] Error deleting subscription from DB:", error);
        showError("Failed to unsubscribe from push notifications: " + error.message);
      } else {
        setIsSubscribed(false);
        showSuccess("Successfully unsubscribed from push notifications.");
      }
    } catch (error) {
      console.error("[usePushNotifications] Error unsubscribing user:", error);
      showError("An error occurred while unsubscribing from push notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  return {
    isSubscribed,
    isLoading,
    permissionStatus,
    requestNotificationPermission,
    subscribeUser,
    unsubscribeUser,
  };
};