import { supabase } from '@/integrations/supabase/client';
import { showError } from './toast';

interface SendNotificationOptions {
  userId: string;
  message: string;
  type?: string;
  relatedId?: string;
}

export const sendNotification = async ({ userId, message, type, relatedId }: SendNotificationOptions) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      message,
      type,
      related_id: relatedId,
      read: false,
    });

    if (error) {
      console.error("[sendNotification] Error sending notification:", error);
      showError("Failed to send notification.");
    }
  } catch (error) {
    console.error("[sendNotification] Unexpected error:", error);
    showError("An unexpected error occurred while sending notification.");
  }
};