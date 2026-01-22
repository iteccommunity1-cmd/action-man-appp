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
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { useTeamMembers } from '@/hooks/useTeamMembers'; // Import the hook
import { Loader2 } from 'lucide-react'; // Import Loader2
import { supabase } from '@/integrations/supabase/client'; // Direct import
import { sendNotification } from '@/utils/notifications'; // Import sendNotification

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Project title must be at least 2 characters.",
  }),
  description: z.string().optional(), // New: Description field
  assignedMembers: z.array(z.string()).min(1, {
    message: "Please assign at least one team member.",
  }),
  deadline: z.date({
    required_error: "A deadline date is required.",
  }),
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']),
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
      description: "", // Default for new projects
      assignedMembers: [],
      deadline: undefined,
      status: 'pending',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && project) {
        form.reset({
          title: project.title,
          description: project.description || "", // Set description for editing
          assignedMembers: project.assigned_members,
          deadline: new Date(project.deadline),
          status: project.status,
        });
      } else {
        // Reset for new project creation
        form.reset({
          title: "",
          description: "",
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

    const { title, description, assignedMembers, deadline, status } = values;

    // Ensure the current user is always included in assignedMembers for new projects
    const finalAssignedMembers = isEditMode
      ? assignedMembers
      : Array.from(new Set([currentUser.id, ...assignedMembers])); // Add current user if not already there

    try {
      if (isEditMode && project) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            title,
            description: description || null, // Save description
            assigned_members: finalAssignedMembers, // Use finalAssignedMembers
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

          // Send notifications to all assigned members (excluding the current user)
          const projectUpdater = currentUser;
          const assignedMembersForNotification = finalAssignedMembers.filter(memberId => memberId !== projectUpdater.id);

          for (const memberId of assignedMembersForNotification) {
            const member = teamMembers.find(tm => tm.id === memberId);
            if (member) {
              sendNotification({
                userId: member.id,
                message: `${projectUpdater.name} updated project: "${title}".`,
                type: 'project_update',
                relatedId: project.id,
                pushTitle: `Project Updated: ${title}`,
                pushBody: `${projectUpdater.name} made changes to "${title}".`,
                pushIcon: currentUser.avatar,
                pushUrl: `/projects/${project.id}`,
              });
            }
          }
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
            members: finalAssignedMembers, // Use finalAssignedMembers for chat room
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
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: currentUser.id,
            title,
            description: description || null, // Save description
            assigned_members: finalAssignedMembers, // Use finalAssignedMembers for project
            deadline: deadline.toISOString(),
            status: status,
            chat_room_id: chat_room_id, // Link the created chat room
          })
          .select('id') // Select the ID of the newly created project
          .single(); // Expect a single row

        if (projectError) {
          console.error("Error creating project:", projectError);
          showError("Failed to create project: " + projectError.message);
          // Optionally, delete the created chat room if project creation fails
          await supabase.from('chat_rooms').delete().eq('id', chat_room_id);
        } else {
          showSuccess("Project and associated chat room created successfully!");
          onSave();
          onClose();

          // Send notifications to all assigned members (excluding creator)
          const projectCreator = currentUser;
          const assignedMembersForNotification = finalAssignedMembers.filter(memberId => memberId !== projectCreator.id);

          for (const memberId of assignedMembersForNotification) {
            const member = teamMembers.find(tm => tm.id === memberId);
            if (member) {
              sendNotification({
                userId: member.id,
                message: `${projectCreator.name} created a new project: "${title}" and assigned you.`,
                type: 'project_assignment',
                relatedId: newProjectData.id, // Use the newly created project ID
                pushTitle: `New Project: ${title}`,
                pushBody: `${projectCreator.name} assigned you to "${title}".`,
                pushUrl: `/projects/${newProjectData.id}`,
              });
            }
          }
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
        <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Loading team members...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {isEditMode ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
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
                  <FormLabel className="text-foreground">Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Develop new marketing website" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide a detailed description of the project..." {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
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
                  <FormLabel className="text-foreground">Assigned Team Members</FormLabel>
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
                  <FormLabel className="text-foreground">Deadline Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80",
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
                    <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground" align="start">
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2">
                {isEditMode ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Project</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};