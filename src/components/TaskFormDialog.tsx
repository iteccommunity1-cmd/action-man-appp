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
import { supabase } from '@/integrations/supabase/client'; // Direct import

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Task title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']),
  assignedTo: z.string().optional(), // Single assigned member
  dueDate: z.date().optional(),
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
      });
    } else if (isOpen && !task) {
      // Reset for new task creation
      form.reset({
        title: "",
        description: "",
        status: "pending",
        assignedTo: undefined,
        dueDate: undefined,
      });
    }
  }, [task, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to manage tasks.");
      return;
    }

    const { title, description, status, assignedTo, dueDate } = values;

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
          })
          .eq('id', task.id);

        if (error) {
          console.error("Error updating task:", error);
          showError("Failed to update task: " + error.message);
        } else {
          showSuccess("Task updated successfully!");
          onClose();
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
          })
          .select();

        if (error) {
          console.error("Error creating task:", error);
          showError("Failed to create task: " + error.message);
        } else {
          showSuccess("Task created successfully!");
          onClose();
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
          <DialogTitle className="text-2xl font-bold text-gray-800">{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription className="text-gray-600">
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
                  <FormLabel className="text-gray-700">Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement user authentication" {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
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
                  <FormLabel className="text-gray-700">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed description of the task..." {...field} className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
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
                  <FormLabel className="text-gray-700">Assigned To (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg shadow-md">
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
                  <FormLabel className="text-gray-700">Due Date (Optional)</FormLabel>
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
                {task ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Task</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};