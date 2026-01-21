import { supabase } from '@/integrations/supabase/client';
import { showError } from './toast';

interface SendNotificationOptions {
  userId: string;
  message: string;
  type?: string;
  relatedId?: string;
  // New fields for push notifications
  pushTitle?: string;
  pushBody?: string;
  pushIcon?: string;
  pushUrl?: string;
}

export const sendNotification = async ({
  userId,
  message,
  type,
  relatedId,
  pushTitle,
  pushBody,
  pushIcon,
  pushUrl,
}: SendNotificationOptions) => {
  try {
    // 1. Insert into in-app notifications table
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: userId,
      message,
      type,
      related_id: relatedId,
      read: false,
    });

    if (dbError) {
      console.error("[sendNotification] Error sending in-app notification:", dbError);
      showError("Failed to send in-app notification.");
    }

    // 2. Attempt to send web push notification via Edge Function
    try {
      const { data: subscriptions, error: fetchSubError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1); // Just check if any subscription exists

      if (fetchSubError) {
        console.warn("[sendNotification] Could not check for push subscriptions:", fetchSubError.message);
      } else if (subscriptions && subscriptions.length > 0) {
        // If user has subscriptions, invoke the Edge Function
        const { data, error: edgeFunctionError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId,
            title: pushTitle || "New Notification",
            body: pushBody || message,
            icon: pushIcon,
            url: pushUrl,
            relatedId,
            type,
          },
        });

        if (edgeFunctionError) {
          console.error("[sendNotification] Error invoking push notification Edge Function:", edgeFunctionError);
          // Don't show error to user for push notifications, as it's a background process
        } else {
          console.log("[sendNotification] Push notification Edge Function invoked:", data);
        }
      }
    } catch (pushInvokeError) {
      console.error("[sendNotification] Unexpected error invoking push notification Edge Function:", pushInvokeError);
    }

  } catch (error) {
    console.error("[sendNotification] Unexpected error:", error);
    showError("An unexpected error occurred while sending notification.");
  }
};