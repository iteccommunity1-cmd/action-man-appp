import { supabase } from '@/integrations/supabase/client';
import { showError } from './toast';

interface SendNotificationOptions {
  userId: string;
  message: string;
  type?: string;
  relatedId?: string;
  // New fields for push notifications (will be stored in DB and picked up by trigger)
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
    // 1. Insert into in-app notifications table (this will automatically trigger the Edge Function)
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: userId,
      message,
      type,
      related_id: relatedId,
      read: false,
      push_title: pushTitle,
      push_body: pushBody,
      push_icon: pushIcon,
      push_url: pushUrl,
    });

    if (dbError) {
      console.error("[sendNotification] Error sending in-app notification:", dbError);
      showError("Failed to send notification.");
    }
    // The push notification is now handled automatically by the database trigger
  } catch (error) {
    console.error("[sendNotification] Unexpected error:", error);
    showError("An unexpected error occurred while sending notification.");
  }
};