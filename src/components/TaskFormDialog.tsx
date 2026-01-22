import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, Loader2 } from "lucide-react"; // Added Loader2

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
import { Task } from '@/types/task';
import { useTeamMembers } from '@/hooks/useTeamMembers'; // Import the hook
import { sendNotification } from '@/utils/notifications'; // Import sendNotification
import { supabase } from '@/integrations/supabase/client'; // Direct import

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Task title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']),
  assignedTo: z.string().optional(), // Single assigned member
  dueDate: z.date().optional(),
  priority: z.string().default('0'), // New: Priority as string to match Select value
});

interface TaskFormDialogProps {
  projectId: string;
  task: Task | null; // If null, it's a new task; otherwise, it's for editing
  isOpen: boolean;
  onClose: () => void;
}

export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  projectId,
  task,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers(); // Use the hook
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      assignedTo: undefined,
      dueDate: undefined,
      priority: "0", // Default priority to Low
    },
  });

  React.useEffect(() => {
    if (task && isOpen) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        assignedTo: task.assigned_to || undefined,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        priority: String(task.priority || 0), // Set priority from task, default to 0
      });
    } else if (isOpen && !task) {
      // Reset for new task creation
      form.reset({
        title: "",
        description: "",
        status: "pending",
        assignedTo: undefined,
        dueDate: undefined,
        priority: "0", // Default priority to Low
      });
    }
  }, [task, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to manage tasks.");
      return;
    }

    const { title, description, status, assignedTo, dueDate, priority } = values;

    try {
      if (task) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            title,
            description,
            status,
            assigned_to: assignedTo,
            due_date: dueDate ? dueDate.toISOString() : null,
            priority: parseInt(priority), // Convert priority back to number
          })
          .eq('id', task.id);

        if (error) {
          console.error("Error updating task:", error);
          showError("Failed to update task: " + error.message);
        } else {
          showSuccess("Task updated successfully!");
          onClose();

          // Send notification if assigned_to changed or was set
          if (assignedTo && assignedTo !== currentUser.id && assignedTo !== task.assigned_to) {
            const assignedMember = teamMembers.find(member => member.id === assignedTo);
            if (assignedMember) {
              sendNotification({
                userId: assignedMember.id,
                message: `${currentUser.name} assigned you to task: "${title}" in project.`,
                type: 'task_assignment',
                relatedId: projectId,
                pushTitle: `New Task Assignment`,
                pushBody: `${currentUser.name} assigned you to task: "${title}".`,
                pushUrl: `/projects/${projectId}`,
              });
            }
          } else if (assignedTo && assignedTo === task.assigned_to && status !== task.status) {
            // If status changed for an assigned task (and assigned_to didn't change)
            const assignedMember = teamMembers.find(member => member.id === assignedTo);
            if (assignedMember) {
              sendNotification({
                userId: assignedMember.id,
                message: `${currentUser.name} updated the status of your task: "${title}" to "${status}".`,
                type: 'task_update',
                relatedId: projectId,
                pushTitle: `Task Status Update`,
                pushBody: `${currentUser.name} updated your task: "${title}" to "${status}".`,
                pushUrl: `/projects/${projectId}`,
              });
            }
          }
        }
      } else {
        // Create new task
        const { error } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            user_id: currentUser.id,
            title,
            description,
            status,
            assigned_to: assignedTo,
            due_date: dueDate ? dueDate.toISOString() : null,
            priority: parseInt(priority), // Convert priority back to number
          })
          .select();

        if (error) {
          console.error("Error creating task:", error);
          showError("Failed to create task: " + error.message);
        } else {
          showSuccess("Task created successfully!");
          onClose();

          // Send notification if assigned to someone else
          if (assignedTo && assignedTo !== currentUser.id) {
            const assignedMember = teamMembers.find(member => member.id === assignedTo);
            if (assignedMember) {
              sendNotification({
                userId: assignedMember.id,
                message: `${currentUser.name} assigned you to a new task: "${title}" in project.`,
                type: 'task_assignment',
                relatedId: projectId,
                pushTitle: `New Task Assignment`,
                pushBody: `${currentUser.name} assigned you to a new task: "${title}".`,
                pushUrl: `/projects/${projectId}`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error managing task:", error);
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
        <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground">
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
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {task ? "Make changes to your task here." : "Add a new task to your project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement user authentication" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
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
                    <Textarea placeholder="Detailed description of the task..." {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Assigned To (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80">
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
                      <SelectItem value="">Unassigned</SelectItem>
                      {memberOptions.map((member) => (
                        <SelectItem key={member.value} value={member.value}>
                          {member.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
                      <SelectItem value="0">Low</SelectItem>
                      <SelectItem value="1">Medium</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                      <SelectItem value="3">Urgent</SelectItem>
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
                {task ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Task</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};