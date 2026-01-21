/// <reference lib="deno.ns" />
/// <reference types="npm:web-push" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, icon, url, relatedId, type } = await req.json();

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing userId, title, or body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role key for RLS bypass
    );

    // Fetch user subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('user_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (fetchError) {
      console.error("[send-push-notification] Error fetching subscriptions:", fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-push-notification] No push subscriptions found for user ${userId}`);
      return new Response(JSON.stringify({ message: 'No subscriptions found for user' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Configure web-push
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:example@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    );

    const notificationPayload = {
      title,
      body,
      icon: icon || '/favicon.ico',
      url: url || '/',
      relatedId,
      type,
    };

    const pushPromises = subscriptions.map(async (sub: UserSubscription) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload));
        console.log(`[send-push-notification] Push notification sent to ${userId}`);
      } catch (pushError: unknown) {
        console.error(`[send-push-notification] Failed to send push notification to ${userId}:`, pushError);
        // If subscription is no longer valid, remove it from DB
        if (typeof pushError === 'object' && pushError !== null && 'statusCode' in pushError) {
          const statusCode = (pushError as { statusCode: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) { // GONE or Not Found
            console.log(`[send-push-notification] Removing expired subscription for user ${userId}`);
            await supabaseClient.from('user_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      }
    });

    await Promise.all(pushPromises);

    return new Response(JSON.stringify({ message: 'Push notifications processed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error("[send-push-notification] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});