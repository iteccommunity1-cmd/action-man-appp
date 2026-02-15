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
import { Goal } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { sendNotification } from '@/utils/notifications'; // Import sendNotification

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Goal title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  targetValue: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "Target value must be non-negative." }).optional()
  ),
  currentValue: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "Current value must be non-negative." }).optional()
  ),
  unit: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['not_started', 'in_progress', 'achieved', 'at_risk', 'failed']),
});

interface GoalFormDialogProps {
  projectId: string;
  goal: Goal | null; // If null, it's a new goal; otherwise, it's for editing
  isOpen: boolean;
  onClose: () => void;
}

export const GoalFormDialog: React.FC<GoalFormDialogProps> = ({
  projectId,
  goal,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      targetValue: undefined,
      currentValue: 0,
      unit: "",
      dueDate: undefined,
      status: "not_started",
    },
  });

  // Fetch project details to get the project creator's ID and assigned members
  const { data: projectDetails } = useQuery<{ user_id: string; title: string; assigned_members: string[] }, Error>({
    queryKey: ['projectDetailsForGoal', projectId],
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
    if (goal && isOpen) {
      form.reset({
        title: goal.title,
        description: goal.description || "",
        targetValue: goal.target_value || undefined,
        currentValue: goal.current_value || 0,
        unit: goal.unit || "",
        dueDate: goal.due_date ? new Date(goal.due_date) : undefined,
        status: goal.status,
      });
    } else if (isOpen && !goal) {
      // Reset for new goal creation
      form.reset({
        title: "",
        description: "",
        targetValue: undefined,
        currentValue: 0,
        unit: "",
        dueDate: undefined,
        status: "not_started",
      });
    }
  }, [goal, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to manage goals.");
      return;
    }

    const { title, description, targetValue, currentValue, unit, dueDate, status } = values;

    try {
      if (goal) {
        // Update existing goal
        const { error } = await supabase
          .from('goals')
          .update({
            title,
            description,
            target_value: targetValue,
            current_value: currentValue,
            unit,
            due_date: dueDate ? dueDate.toISOString() : null,
            status,
          })
          .eq('id', goal.id);

        if (error) {
          console.error("[GoalFormDialog] Error updating goal:", error);
          showError("Failed to update goal: " + error.message);
        } else {
          showSuccess("Goal updated successfully!");
          onClose();

          // Send notifications to project creator and assigned members
          if (projectDetails) {
            const notificationMessage = `${currentUser.name} updated goal "${title}" in project "${projectDetails.title}" to status "${status.replace(/_/g, ' ')}".`;
            const pushTitle = `Goal Updated: ${projectDetails.title}`;
            const pushBody = `${currentUser.name} updated "${title}" to "${status.replace(/_/g, ' ')}".`;
            const pushUrl = `/projects/${projectId}`;

            const recipients = new Set<string>();
            if (projectDetails.user_id) recipients.add(projectDetails.user_id);
            projectDetails.assigned_members.forEach(memberId => recipients.add(memberId));
            recipients.delete(currentUser.id); // Don't notify self

            for (const recipientId of Array.from(recipients)) {
              sendNotification({
                userId: recipientId,
                message: notificationMessage,
                type: 'goal_update',
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
        // Create new goal
        const { error } = await supabase
          .from('goals')
          .insert({
            project_id: projectId,
            title,
            description,
            target_value: targetValue,
            current_value: currentValue,
            unit,
            due_date: dueDate ? dueDate.toISOString() : null,
            status,
          })
          .select();

        if (error) {
          console.error("[GoalFormDialog] Error creating goal:", error);
          showError("Failed to create goal: " + error.message);
        } else {
          showSuccess("Goal created successfully!");
          onClose();

          // Send notifications to project creator and assigned members
          if (projectDetails) {
            const notificationMessage = `${currentUser.name} created a new goal: "${title}" in project "${projectDetails.title}".`;
            const pushTitle = `New Goal: ${projectDetails.title}`;
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
                type: 'goal_creation',
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
      console.error("[GoalFormDialog] Unexpected error managing goal:", error);
      showError("An unexpected error occurred.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{goal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {goal ? "Make changes to your goal here." : "Add a new goal to your project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Goal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Achieve 10% user growth" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
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
                    <Textarea placeholder="Detailed description of the goal..." {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Target Value (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 1000" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Current Value (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 500" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., users, %, $" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
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
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="achieved">Achieved</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 w-full sm:w-auto">
                {goal ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Goal</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};