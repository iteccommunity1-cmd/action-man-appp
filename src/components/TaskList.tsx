import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { sendNotification } from '@/utils/notifications';
import { supabase } from '@/integrations/supabase/client'; // Direct import

interface TaskListProps {
  projectId: string;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ projectId, onAddTask, onEditTask }) => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!currentUser?.id && !!projectId,
  });

  const getStatusBadgeColor = (status: Task['status'], dueDate?: string) => {
    if (status === 'completed') return 'bg-green-500 text-white';
    if (status === 'overdue' || (dueDate && isPast(new Date(dueDate)))) return 'bg-red-500 text-white';
    switch (status) {
      case 'in-progress':
        return 'bg-blue-500 text-white';
      case 'pending':
      default:
        return 'bg-yellow-500 text-white';
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) {
        console.error("Error updating task status:", error);
        showError("Failed to update task status: " + error.message);
      } else {
        showSuccess(`Task marked as ${newStatus}!`);
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });

        // Send notification to assigned user if different from current user
        if (task.assigned_to && task.assigned_to !== currentUser?.id) {
          const assignedMember = teamMembers.find(member => member.id === task.assigned_to);
          if (assignedMember) {
            sendNotification({
              userId: assignedMember.id,
              message: `${currentUser?.name || 'A user'} ${newStatus === 'completed' ? 'completed' : 'reopened'} your task: "${task.title}".`,
              type: 'task_update',
              relatedId: projectId, // Pass projectId here for navigation
            });
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error updating task status:", error);
      showError("An unexpected error occurred.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDeleteId);

      if (error) {
        console.error("Error deleting task:", error);
        showError("Failed to delete task: " + error.message);
      } else {
        showSuccess("Task deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    } catch (error) {
      console.error("Unexpected error deleting task:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDeleteId(null);
    }
  };

  if (isLoading || loadingTeamMembers) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-lg text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load tasks: " + error.message);
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error loading tasks. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-800">Tasks</h3>
        <Button onClick={onAddTask} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
          <PlusCircle className="h-5 w-5 mr-2" /> Add Task
        </Button>
      </div>

      {tasks!.length === 0 ? (
        <div className="text-center text-gray-500 p-8 border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <p className="text-lg">No tasks for this project yet.</p>
          <p className="text-sm mt-2">Click "Add Task" to create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tasks!.map((task) => (
            <Card key={task.id} className="rounded-xl shadow-sm border-gray-200 hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 flex items-start space-x-4">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleTaskStatus(task)}
                  className="mt-1 h-5 w-5 rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                />
                <div className="flex-grow">
                  <CardTitle className={cn(
                    "text-lg font-semibold text-gray-800",
                    task.status === 'completed' && "line-through text-gray-500"
                  )}>
                    {task.title}
                  </CardTitle>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getStatusBadgeColor(task.status, task.due_date))}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                    {task.due_date && (
                      <span className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1 text-purple-500" />
                        Due: {format(new Date(task.due_date), 'PPP')}
                      </span>
                    )}
                    {task.assigned_to && (
                      <span className="flex items-center">
                        <UserRound className="h-4 w-4 mr-1 text-indigo-500" />
                        Assigned to: {teamMembers.find(member => member.id === task.assigned_to)?.name || 'Unknown'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-gray-600 hover:bg-gray-100" onClick={() => onEditTask(task)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-800">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-lg px-4 py-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};