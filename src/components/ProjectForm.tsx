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
import { useUser } from "@/contexts/UserContext";

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
});

export function ProjectForm() {
  const { supabase } = useSupabase();
  const { currentUser } = useUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      assignedMembers: [],
      deadline: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to create a project.");
      return;
    }

    const { title, assignedMembers, deadline } = values;

    try {
      // First, create the chat room
      const { data: chatRoomData, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: `${title} Chat`,
          type: 'project',
          avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${title}`, // Generate avatar based on project title
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
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: currentUser.id,
          title,
          assigned_members: assignedMembers,
          deadline: deadline.toISOString(),
          status: 'pending',
          chat_room_id: chat_room_id, // Link the created chat room
        })
        .select();

      if (projectError) {
        console.error("Error creating project:", projectError);
        showError("Failed to create project: " + projectError.message);
        // Optionally, delete the created chat room if project creation fails
        await supabase.from('chat_rooms').delete().eq('id', chat_room_id);
      } else {
        console.log("Project created:", projectData);
        showSuccess("Project and associated chat room created successfully!");
        form.reset();
      }
    } catch (error) {
      console.error("Unexpected error creating project:", error);
      showError("An unexpected error occurred.");
    }
  };

  const memberOptions = teamMembers.map((member) => ({
    value: member.id,
    label: member.name,
  }));

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Create New Project</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <Button type="submit" className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-colors duration-200">
            Create Project
          </Button>
        </form>
      </Form>
    </div>
  );
}