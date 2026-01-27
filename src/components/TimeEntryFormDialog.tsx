import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInMinutes } from "date-fns";
import { CalendarIcon, Clock, PlusCircle, Loader2 } from "lucide-react";

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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Task } from '@/types/task';
import { sendNotification } from '@/utils/notifications';

// Define TimeEntry interface locally for use in the component props
interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  start_time: string;
  end_time: string;
  description?: string;
  created_at: string;
}

const timeEntryFormSchema = z.object({
  taskId: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start time is required.",
      path: ['startTime'],
    });
  }
  if (!data.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time is required.",
      path: ['endTime'],
    });
  }
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time.",
      path: ['endTime'],
    });
  }
});

interface TimeEntryFormDialogProps {
  projectId: string;
  timeEntry?: TimeEntry | null; // New prop for editing
  initialTaskId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const TimeEntryFormDialog: React.FC<TimeEntryFormDialogProps> = ({
  projectId,
  timeEntry, // Destructure timeEntry
  initialTaskId,
  isOpen,
  onClose,
  onSave,
}) => {
  const { currentUser } = useUser();
  const isEditMode = !!timeEntry;

  const { data: tasks, isLoading: isLoadingTasks } = useQuery<Task[], Error>({
    queryKey: ['tasksForTimeEntry', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && isOpen,
  });

  // Fetch project details to get the project creator's ID
  const { data: projectDetails } = useQuery<{ user_id: string; title: string }, Error>({
    queryKey: ['projectDetailsForTimeEntry', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('user_id, title')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && isOpen,
  });

  const form = useForm<z.infer<typeof timeEntryFormSchema>>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      taskId: initialTaskId || undefined,
      startTime: undefined,
      endTime: undefined,
      description: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && timeEntry) {
        form.reset({
          taskId: timeEntry.task_id || undefined,
          startTime: new Date(timeEntry.start_time),
          endTime: new Date(timeEntry.end_time),
          description: timeEntry.description || "",
        });
      } else {
        // Reset for new entry creation
        form.reset({
          taskId: initialTaskId || undefined,
          startTime: undefined,
          endTime: undefined,
          description: "",
        });
      }
    }
  }, [isOpen, initialTaskId, timeEntry, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof timeEntryFormSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to log time.");
      return;
    }

    const { taskId, startTime, endTime, description } = values;

    if (!startTime || !endTime) {
      showError("Start time and End time are required.");
      return;
    }

    try {
      if (isEditMode && timeEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('time_entries')
          .update({
            task_id: taskId || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            description: description || null,
          })
          .eq('id', timeEntry.id);

        if (error) {
          console.error("[TimeEntryFormDialog] Error updating time entry:", error);
          showError("Failed to update time entry: " + error.message);
        } else {
          showSuccess("Time entry updated successfully!");
          onSave();
          onClose();
        }
      } else {
        // Create new entry
        const { error } = await supabase
          .from('time_entries')
          .insert({
            user_id: currentUser.id,
            project_id: projectId,
            task_id: taskId || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            description: description || null,
          });

        if (error) {
          console.error("[TimeEntryFormDialog] Error logging time:", error);
          showError("Failed to log time: " + error.message);
        } else {
          showSuccess("Time entry logged successfully!");
          onSave();
          onClose();

          const timeSpentMinutes = differenceInMinutes(endTime, startTime);
          const timeSpentString = `${Math.floor(timeSpentMinutes / 60)}h ${timeSpentMinutes % 60}m`;

          // Notify project creator
          if (projectDetails?.user_id && projectDetails.user_id !== currentUser.id) {
            sendNotification({
              userId: projectDetails.user_id,
              message: `${currentUser.name} logged ${timeSpentString} for project "${projectDetails.title}".`,
              type: 'time_entry',
              relatedId: projectId,
              pushTitle: `New Time Entry for ${projectDetails.title}`,
              pushBody: `${currentUser.name} logged ${timeSpentString}.`,
              pushIcon: currentUser.avatar,
              pushUrl: `/projects/${projectId}`,
            });
          }

          // Notify assigned task member if a task is selected and they are not the current user
          if (taskId) {
            const associatedTask = tasks?.find(t => t.id === taskId);
            if (associatedTask?.assigned_to && associatedTask.assigned_to !== currentUser.id) {
              sendNotification({
                userId: associatedTask.assigned_to,
                message: `${currentUser.name} logged ${timeSpentString} for task "${associatedTask.title}" in project "${projectDetails?.title}".`,
                type: 'time_entry',
                relatedId: projectId,
                pushTitle: `Time Logged for Your Task`,
                pushBody: `${currentUser.name} logged ${timeSpentString} for "${associatedTask.title}".`,
                pushIcon: currentUser.avatar,
                pushUrl: `/projects/${projectId}`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[TimeEntryFormDialog] Unexpected error managing time entry:", error);
      showError("An unexpected error occurred.");
    }
  };

  const handleDateChange = (field: 'startTime' | 'endTime', date: Date | undefined) => {
    const currentDateTime = form.getValues(field);
    if (date) {
      const newDateTime = currentDateTime ? new Date(currentDateTime) : new Date();
      newDateTime.setFullYear(date.getFullYear());
      newDateTime.setMonth(date.getMonth());
      newDateTime.setDate(date.getDate());
      form.setValue(field, newDateTime, { shouldValidate: true });
    } else {
      form.setValue(field, undefined, { shouldValidate: true });
    }
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const currentDateTime = form.getValues(field);
    if (currentDateTime) {
      const newDateTime = new Date(currentDateTime);
      newDateTime.setHours(hours);
      newDateTime.setMinutes(minutes);
      form.setValue(field, newDateTime, { shouldValidate: true });
    } else {
      // If date is not set, default to today's date with selected time
      const newDateTime = new Date();
      newDateTime.setHours(hours);
      newDateTime.setMinutes(minutes);
      form.setValue(field, newDateTime, { shouldValidate: true });
    }
  };

  if (isLoadingTasks) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Loading tasks...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{isEditMode ? "Edit Time Entry" : "Log Time Entry"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditMode ? "Adjust the details of your logged time." : "Record the time spent on a task or project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="taskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Associated Task (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80">
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
                      <SelectItem value="">No specific task</SelectItem>
                      {tasks?.map((task: Task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-foreground">Start Time</FormLabel>
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
                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>Pick date and time</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => handleDateChange('startTime', date)}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => handleTimeChange('startTime', e.target.value)}
                            className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-foreground">End Time</FormLabel>
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
                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>Pick date and time</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => handleDateChange('endTime', date)}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => handleTimeChange('endTime', e.target.value)}
                            className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What did you work on?" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2">
                {isEditMode ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Log Time</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};