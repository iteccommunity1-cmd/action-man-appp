import React, { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Direct import

const profileFormSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }).optional().or(z.literal('')),
  last_name: z.string().min(1, { message: "Last name is required." }).optional().or(z.literal('')),
  avatar_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const ProfileForm: React.FC = () => {
  const { currentUser, isLoadingUser } = useUser();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      avatar_url: "",
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

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching profile for form:", error);
          showError("Failed to load profile data.");
        } else if (data) {
          form.reset({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            avatar_url: data.avatar_url || "",
          });
        }
      }
    };

    if (!isLoadingUser) {
      fetchProfile();
    }
  }, [currentUser, isLoadingUser, form, supabase]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!currentUser?.id) {
      showError("You must be logged in to update your profile.");
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          avatar_url: values.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error("Error updating profile:", error);
        showError("Failed to update profile: " + error.message);
      } else {
        showSuccess("Profile updated successfully!");
        // Optionally, refresh user context if it holds these values
      }
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      showError("An unexpected error occurred.");
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-lg text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">My Profile</h2>
      <div className="flex justify-center mb-6">
        <Avatar className="h-24 w-24 rounded-full border-4 border-blue-200 shadow-md">
          <AvatarImage src={form.watch("avatar_url") || currentUser?.avatar} alt={currentUser?.name} />
          <AvatarFallback className="bg-blue-500 text-white text-3xl font-semibold">
            {currentUser?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
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
                <FormLabel className="text-gray-700">Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Avatar URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/avatar.jpg" {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-colors duration-200">
            Save Profile
          </Button>
        </form>
      </Form>
    </div>
  );
};