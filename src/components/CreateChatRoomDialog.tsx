import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

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
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { showSuccess, showError } from "@/utils/toast";
import { useTeamMembers } from '@/hooks/useTeamMembers';

const formSchema = z.object({
  name: z.string().optional(), // Optional by default, refined by superRefine
  type: z.enum(['project', 'private'], {
    required_error: "Please select a chat room type.",
  }),
  selectedMembers: z.array(z.string()).min(1, {
    message: "Please select at least one member for the chat.",
  }),
}).superRefine((data, ctx) => {
  if (data.type === 'project') {
    if (!data.name || data.name.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Project chat name must be at least 2 characters.",
        path: ['name'],
      });
    }
  }
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
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "private",
      selectedMembers: [],
    },
  });

  const selectedType = form.watch("type");
  const selectedMemberIds = form.watch("selectedMembers");

  // Effect to generate private chat name based on selected members
  React.useEffect(() => {
    if (selectedType === 'private' && selectedMemberIds.length > 0 && currentUser) {
      const allMembers = [currentUser, ...teamMembers];
      const participantNames = selectedMemberIds
        .filter(id => id !== currentUser.id) // Exclude current user from the "other" members list
        .map(id => allMembers.find(member => member.id === id)?.name)
        .filter(Boolean) as string[];

      let generatedName = "";
      if (participantNames.length === 1) {
        generatedName = participantNames[0];
      } else if (participantNames.length === 2) {
        generatedName = `${participantNames[0]} & ${participantNames[1]}`;
      } else if (participantNames.length > 2) {
        generatedName = `${participantNames[0]}, ${participantNames[1]} & ${participantNames.length - 2} others`;
      } else if (participantNames.length === 0 && selectedMemberIds.includes(currentUser.id)) {
        // Case for a private chat with only self (if ever allowed/created)
        generatedName = currentUser.name;
      }
      form.setValue("name", generatedName);
    } else if (selectedType === 'project') {
      form.setValue("name", ""); // Clear name for project type if it was previously set by private logic
    }
  }, [selectedType, selectedMemberIds, teamMembers, currentUser, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to create a chat room.");
      return;
    }

    const { type, selectedMembers } = values;
    const membersToInclude = [currentUser.id, ...selectedMembers].sort();

    try {
      let chatRoomName = values.name; // Default to form value for project type

      if (type === 'private') {
        // For private chats, always derive the name from members
        const allMembers = [currentUser, ...teamMembers];
        const participantNames = selectedMembers
          .filter(id => id !== currentUser.id)
          .map(id => allMembers.find(member => member.id === id)?.name)
          .filter(Boolean) as string[];

        if (participantNames.length === 1) {
          chatRoomName = participantNames[0];
        } else if (participantNames.length === 2) {
          chatRoomName = `${participantNames[0]} & ${participantNames[1]}`;
        } else if (participantNames.length > 2) {
          chatRoomName = `${participantNames[0]}, ${participantNames[1]} & ${participantNames.length - 2} others`;
        } else {
          chatRoomName = currentUser.name; // Fallback for self-chat or unexpected empty
        }

        const { data: existingRooms, error: existingRoomError } = await supabase
          .from('chat_rooms')
          .select('id, members')
          .eq('type', 'private');

        if (existingRoomError) {
          console.error("Error checking for existing chat room:", existingRoomError);
          showError("Failed to check for existing chat room: " + existingRoomError.message);
          return;
        }

        // Check if a private chat room with these exact members already exists
        const existingRoom = existingRooms?.find(room => {
          const roomMembersSorted = (room.members || []).sort(); // Defensive check
          return JSON.stringify(roomMembersSorted) === JSON.stringify(membersToInclude);
        });

        if (existingRoom) {
          showSuccess("Private chat already exists. Redirecting to existing chat.");
          onClose();
          navigate('/chat', { state: { activeChatRoomId: existingRoom.id } });
          return;
        }
      }

      const { error } = await supabase
        .from('chat_rooms')
        .insert({
          name: chatRoomName, // Use the derived name for private, or form name for project
          type,
          members: membersToInclude,
          avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${chatRoomName || 'default'}`
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

  if (loadingTeamMembers) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border"> {/* Updated styling */}
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> {/* Changed text color */}
            <p className="ml-3 text-lg text-muted-foreground">Loading team members...</p> {/* Changed text color */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border"> {/* Updated styling */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Create New Chat Room</DialogTitle> {/* Changed text color */}
          <DialogDescription className="text-muted-foreground"> {/* Changed text color */}
            Set up a new chat channel for your team or a private conversation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Chat Room Type</FormLabel> {/* Changed text color */}
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80"> {/* Updated styling */}
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground"> {/* Updated styling */}
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Chat Room Name</FormLabel> {/* Changed text color */}
                  <FormControl>
                    <Input
                      placeholder={selectedType === 'private' ? "Auto-generated for private chats" : "e.g., Marketing Team Chat"}
                      {...field}
                      className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" {/* Updated styling */}
                      readOnly={selectedType === 'private'}
                      disabled={selectedType === 'private'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Select Members</FormLabel> {/* Changed text color */}
                  <FormControl>
                    <MultiSelect
                      options={memberOptions}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select members for this chat"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground"> {/* Updated styling */}
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2"> {/* Updated styling */}
                <PlusCircle className="h-4 w-4 mr-2" /> Create Room
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};