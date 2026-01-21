import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
import { teamMembers } from "@/data/teamMembers";
import { showSuccess, showError } from "@/utils/toast";
import { useSupabase } from "@/providers/SupabaseProvider";
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
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']),
});

interface ProjectEditDialogProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh project list
}

export const ProjectEditDialog: React.FC<ProjectEditDialogProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const { supabase } = useSupabase();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      assignedMembers: [],
      deadline: undefined,
      status: 'pending',
    },
  });

  React.useEffect(() => {
    if (project && isOpen) {
      form.reset({
        title: project.title,
        assignedMembers: project.assigned_members,
        deadline: new Date(project.deadline),
        status: project.status,
      });
    }
  }, [project, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!project) return;

    const { title, assignedMembers, deadline, status } = values;

    try {
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
        onSave(); // Refresh the list
        onClose();
      }
    } catch (error) {
      console.error("Unexpected error updating project:", error);
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
          <DialogTitle className="text-2xl font-bold text-gray-800">Edit Project</DialogTitle>
          <DialogDescription className="text-gray-600">
            Make changes to your project here. Click save when you're done.
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};