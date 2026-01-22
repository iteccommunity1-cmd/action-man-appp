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
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { showSuccess, showError } from "@/utils/toast";
import { Milestone } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
// import { useTeamMembers } from '@/hooks/useTeamMembers'; // No longer needed
import { sendNotification } from '@/utils/notifications';

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Milestone title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['pending', 'completed', 'overdue']),
});

interface MilestoneFormDialogProps {
  projectId: string;
  milestone: Milestone | null; // If null, it's a new milestone; otherwise, it's for editing
  isOpen: boolean;
  onClose: () => void;
}

export const MilestoneFormDialog: React.FC<MilestoneFormDialogProps> = ({
  projectId,
  milestone,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useUser();
  // const { teamMembers } = useTeamMembers(); // Removed as it's not directly used
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: undefined,
      status: "pending",
    },
  });

  // Fetch project details to get the project creator's ID and assigned members
  const { data: projectDetails } = useQuery<{ user_id: string; title: string; assigned_members: string[] }, Error>({
    queryKey: ['projectDetailsForMilestone', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('user_id, title, assigned_members')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isOpen,
  });

  React.useEffect(() => {
    if (milestone && isOpen) {
      form.reset({
        title: milestone.title,
        description: milestone.description || "",
        dueDate: milestone.due_date ? new Date(milestone.due_date) : undefined,
        status: milestone.status,
      });
    } else if (isOpen && !milestone) {
      // Reset for new milestone creation
      form.reset({
        title: "",
        description: "",
        dueDate: undefined,
        status: "pending",
      });
    }
  }, [milestone, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to manage milestones.");
      return;
    }

    const { title, description, dueDate, status } = values;

    try {
      if (milestone) {
        // Update existing milestone
        const { error } = await supabase
          .from('milestones')
          .update({
            title,
            description,
            due_date: dueDate ? dueDate.toISOString() : null,
            status,
          })
          .eq('id', milestone.id);

        if (error) {
          console.error("[MilestoneFormDialog] Error updating milestone:", error);
          showError("Failed to update milestone: " + error.message);
        } else {
          showSuccess("Milestone updated successfully!");
          onClose();

          // Send notifications to project creator and assigned members
          if (projectDetails) {
            const notificationMessage = `${currentUser.name} updated milestone "${title}" in project "${projectDetails.title}" to status "${status.replace('-', ' ')}".`;
            const pushTitle = `Milestone Updated: ${projectDetails.title}`;
            const pushBody = `${currentUser.name} updated "${title}" to "${status.replace('-', ' ')}".`;
            const pushUrl = `/projects/${projectId}`;

            const recipients = new Set<string>();
            if (projectDetails.user_id) recipients.add(projectDetails.user_id);
            projectDetails.assigned_members.forEach(memberId => recipients.add(memberId));
            recipients.delete(currentUser.id); // Don't notify self

            for (const recipientId of Array.from(recipients)) {
              sendNotification({
                userId: recipientId,
                message: notificationMessage,
                type: 'milestone_update',
                relatedId: projectId,
                pushTitle,
                pushBody,
                pushIcon: currentUser.avatar,
                pushUrl,
              });
            }
          }
        }
      } else {
        // Create new milestone
        const { error } = await supabase
          .from('milestones')
          .insert({
            project_id: projectId,
            title,
            description,
            due_date: dueDate ? dueDate.toISOString() : null,
            status,
          })
          .select();

        if (error) {
          console.error("[MilestoneFormDialog] Error creating milestone:", error);
          showError("Failed to create milestone: " + error.message);
        } else {
          showSuccess("Milestone created successfully!");
          onClose();

          // Send notifications to project creator and assigned members
          if (projectDetails) {
            const notificationMessage = `${currentUser.name} created a new milestone: "${title}" in project "${projectDetails.title}".`;
            const pushTitle = `New Milestone: ${projectDetails.title}`;
            const pushBody = `${currentUser.name} created "${title}".`;
            const pushUrl = `/projects/${projectId}`;

            const recipients = new Set<string>();
            if (projectDetails.user_id) recipients.add(projectDetails.user_id);
            projectDetails.assigned_members.forEach(memberId => recipients.add(memberId));
            recipients.delete(currentUser.id); // Don't notify self

            for (const recipientId of Array.from(recipients)) {
              sendNotification({
                userId: recipientId,
                message: notificationMessage,
                type: 'milestone_creation',
                relatedId: projectId,
                pushTitle,
                pushBody,
                pushIcon: currentUser.avatar,
                pushUrl,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[MilestoneFormDialog] Unexpected error managing milestone:", error);
      showError("An unexpected error occurred.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{milestone ? "Edit Milestone" : "Create New Milestone"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {milestone ? "Make changes to your milestone here." : "Add a new milestone to your project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Milestone Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Complete UI/UX design" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
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
                    <Textarea placeholder="Detailed description of the milestone..." {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground">Due Date (Optional)</FormLabel>
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
                      <SelectItem value="in-progress">In Progress</SelectItem> {/* Added in-progress for consistency, though not in schema default */}
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
                {milestone ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Milestone</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};