import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, BellRing, BellOff, Upload, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { sendNotification } from '@/utils/notifications'; // Import sendNotification

const profileFormSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }).optional().or(z.literal('')),
  last_name: z.string().min(1, { message: "Last name is required." }).optional().or(z.literal('')),
  // avatar_url is now handled by file upload, but we keep it for initial display/reset
  avatar_file: z.any().optional(), // For file input
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const ProfileForm: React.FC = () => {
  const { currentUser, isLoadingUser } = useUser();
  const {
    isSubscribed,
    isLoading: isLoadingPush,
    permissionStatus,
    subscribeUser,
    unsubscribeUser,
  } = usePushNotifications();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      avatar_file: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', currentUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile for form:", error);
          showError("Failed to load profile data.");
        } else if (data) {
          form.reset({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            avatar_file: undefined, // Clear file input on reset
          });
          setAvatarUrl(data.avatar_url || null);
        }
      }
    };

    if (!isLoadingUser) {
      fetchProfile();
    }
  }, [currentUser, isLoadingUser, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file)); // Create a local URL for preview
      form.setValue('avatar_file', file); // Set file in form state
    } else {
      setAvatarFile(null);
      setAvatarUrl(currentUser?.avatar || null); // Revert to current user avatar if no file selected
      form.setValue('avatar_file', undefined);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!currentUser?.id) {
      showError("You must be logged in to update your profile.");
      return;
    }

    setIsUploading(true);
    let newAvatarUrl = avatarUrl;

    try {
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        newAvatarUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (updateError) {
        throw updateError;
      }

      showSuccess("Profile updated successfully!");
      // Optionally, refresh user context if it holds these values
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("Failed to update profile: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      setAvatarFile(null); // Clear file input after upload
      // Re-fetch profile to ensure avatarUrl is updated in case of error or if currentUser context needs refresh
      // This is a simple way to ensure the UI reflects the latest state from DB
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', currentUser.id)
        .single();
      if (!fetchError && updatedProfile) {
        setAvatarUrl(updatedProfile.avatar_url || null);
      }
    }
  };

  const handlePushNotificationToggle = async (checked: boolean) => {
    if (checked) {
      await subscribeUser();
    } else {
      await unsubscribeUser();
    }
  };

  const handleSendTestNotification = async () => {
    if (!currentUser) return;
    
    if (!isSubscribed) {
      showError("You must enable push notifications first.");
      return;
    }

    showSuccess("Sending test notification...");
    await sendNotification({
      userId: currentUser.id,
      message: "This is a test notification sent manually.",
      type: 'test_notification',
      pushTitle: "Manual Test Notification",
      pushBody: "If you see this, push notifications are working!",
      pushIcon: currentUser.avatar,
      pushUrl: "/profile",
    });
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center p-8 bg-card rounded-xl shadow-lg border border-border w-full max-w-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-full sm:max-w-2xl mx-auto p-4 sm:p-6 bg-card rounded-xl shadow-lg border border-border w-full glass-card">
      <h2 className="text-3xl font-bold text-center mb-8 text-foreground">My Profile</h2>
      <div className="flex flex-col items-center mb-6">
        <Avatar className="h-24 w-24 rounded-full border-4 border-primary/50 shadow-md">
          <AvatarImage src={avatarUrl || currentUser?.avatar} alt={currentUser?.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">
            {currentUser?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <label htmlFor="avatar-upload" className="mt-4 cursor-pointer">
          <Button asChild variant="outline" className="rounded-full px-4 py-2 text-primary border-primary hover:bg-primary/10">
            <span>
              <Upload className="h-4 w-4 mr-2" /> Change Avatar
            </span>
          </Button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            disabled={isUploading}
          />
        </label>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Push Notifications Section */}
          <div className="space-y-2 p-4 border border-border rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <BellRing className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <FormLabel className="text-foreground text-base">Push Notifications</FormLabel>
              </div>
              {isLoadingPush ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handlePushNotificationToggle}
                  disabled={permissionStatus === 'denied'}
                  className="data-[state=checked]:bg-primary"
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Receive notifications directly to your device, even when the app is closed.
            </p>
            {permissionStatus === 'denied' && (
              <p className="text-sm text-destructive">
                Notifications are blocked by your browser. Please enable them in your browser settings.
              </p>
            )}
            {isSubscribed && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSendTestNotification}
                className="mt-3 w-full rounded-lg border-primary text-primary hover:bg-primary/10"
              >
                <Send className="h-4 w-4 mr-2" /> Send Test Notification
              </Button>
            )}
          </div>

          <Button type="submit" className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-colors duration-200" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Save Profile
          </Button>
        </form>
      </Form>
    </div>
  );
};