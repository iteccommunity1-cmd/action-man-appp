import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/MultiSelect";
import { teamMembers } from "@/data/teamMembers";
import { useSupabase } from "@/providers/SupabaseProvider";
import { useUser } from "@/contexts/UserContext";
import { showSuccess, showError } from "@/utils/toast";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Chat room name must be at least 2 characters.",
  }),
  type: z.enum(['project', 'private'], {
    required_error: "Please select a chat room type.",
  }),
  assignedMembers: z.array(z.string()).optional(), // Optional for private chats
});

interface CreateChatRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: () => void;
}

export const CreateChatRoomDialog: React.FC<CreateChatRoomDialogProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const { supabase } = useSupabase();
  const { currentUser } = useUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "private",
      assignedMembers: [],
    },
  });

  const selectedType = form.watch("type");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to create a chat room.");
      return;
    }

    const { name, type } = values; // Removed assignedMembers as it's not used in the insert

    try {
      const { error } = await supabase // Removed data as it's not used
        .from('chat_rooms')
        .insert({
          name,
          type,
          // For project type, you might link to a project ID or handle members differently.
          // For simplicity, we're just creating the room.
          // assigned_members: type === 'project' ? assignedMembers : [], // If you had a column for this
        })
        .select();

      if (error) {
        console.error("Error creating chat room:", error);
        showError("Failed to create chat room: " + error.message);
      } else {
        showSuccess("Chat room created successfully!");
        form.reset();
        onRoomCreated();
        onClose();
      }
    } catch (error) {
      console.error("Unexpected error creating chat room:", error);
      showError("An unexpected error occurred.");
    }
  };

  const memberOptions = teamMembers.map((member) => ({
    value: member.id,
    label: member.name,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">Create New Chat Room</DialogTitle>
          <DialogDescription className="text-gray-600">
            Set up a new chat channel for your team or a private conversation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Chat Room Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Marketing Team Chat" {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Chat Room Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg shadow-md">
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'project' && (
              <FormField
                control={form.control}
                name="assignedMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Assigned Members (Optional)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={memberOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select members for this project chat"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
                <PlusCircle className="h-4 w-4 mr-2" /> Create Room
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};