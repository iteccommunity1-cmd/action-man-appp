import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MultiSelect } from "@/components/MultiSelect";
import { showSuccess, showError } from "@/utils/toast";
import { useUser } from "@/contexts/UserContext";
import { Project } from '@/types/project';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamMembers } from '@/hooks/useTeamMembers'; // Import the hook
import { Loader2 } from 'lucide-react'; // Import Loader2
import { supabase } from '@/integrations/supabase/client'; // Direct import

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Project title must be at least 2 characters.",
  }),
  assignedMembers: z.array(z.string()).min(1, {
    message: "Please assign at least one team member.",
  }),
  deadline: z.date({
    required_error: "A deadline date is required.",
  }),
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']).optional(), // Optional for creation
});

interface ProjectFormDialogProps {
  project?: Project | null; // If null/undefined, it's a new project; otherwise, it's for editing
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh project list
}

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers(); // Use the hook
  const isEditMode = !!project;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      assignedMembers: [],
      deadline: undefined,
      status: 'pending', // Default status for new projects
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && project) {
        form.reset({
          title: project.title,
          assignedMembers: project.assigned_members,
          deadline: new Date(project.deadline),
          status: project.status,
        });
      } else {
        // Reset for new project creation
        form.reset({
          title: "",
          assignedMembers: [],
          deadline: undefined,
          status: 'pending',
        });
      }
    }
  }, [project, isOpen, form, isEditMode]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to manage projects.");
      return;
    }

    const { title, assignedMembers, deadline, status } = values;

    try {
      if (isEditMode && project) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            title,
            assigned_members: assignedMembers,
            deadline: deadline.toISOString(),
            status,
          })
          .eq('id', project.id);

        if (error) {
          console.error("Error updating project:", error);
          showError("Failed to update project: " + error.message);
        } else {
          showSuccess("Project updated successfully!");
          onSave();
          onClose();
        }
      } else {
        // Create new project
        // First, create the chat room
        const { data: chatRoomData, error: chatRoomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: `${title} Chat`,
            type: 'project',
            avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${title}`, // Generate avatar based on project title
            members: [currentUser.id, ...assignedMembers], // Add current user and assigned members
          })
          .select('id')
          .single();

        if (chatRoomError) {
          console.error("Error creating chat room for project:", chatRoomError);
          showError("Failed to create project chat room: " + chatRoomError.message);
          return;
        }

        const chat_room_id = chatRoomData.id;

        // Then, create the project and link the chat room
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: currentUser.id,
            title,
            assigned_members: assignedMembers,
            deadline: deadline.toISOString(),
            status: status || 'pending', // Use default 'pending' if not explicitly set
            chat_room_id: chat_room_id, // Link the created chat room
          })
          .select();

        if (projectError) {
          console.error("Error creating project:", projectError);
          showError("Failed to create project: " + projectError.message);
          // Optionally, delete the created chat room if project creation fails
          await supabase.from('chat_rooms').delete().eq('id', chat_room_id);
        } else {
          showSuccess("Project and associated chat room created successfully!");
          onSave();
          onClose();
        }
      }
    } catch (error) {
      console.error("Unexpected error managing project:", error);
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
        <DialogContent className="sm:max-w-[500px] rounded-xl p-6">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="ml-3 text-lg text-gray-600">Loading team members...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            {isEditMode ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditMode ? "Make changes to your project here. Click save when you're done." : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Develop new marketing website" {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Assigned Team Members</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={memberOptions}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select team members"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-700">Deadline Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditMode && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-lg shadow-md">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
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
                {isEditMode ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Project</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};