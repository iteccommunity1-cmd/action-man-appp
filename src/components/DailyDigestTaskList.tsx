import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { Loader2, CalendarDays, UserRound, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { sendNotification } from '@/utils/notifications';
import { useTeamMembers } from '@/hooks/useTeamMembers';

export const DailyDigestTaskList: React.FC = () => {
  const { currentUser } = useUser();
  const { teamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: ['dailyDigestTasks', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!currentUser?.id,
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

  const getPriorityBadgeColor = (priority: number | undefined) => {
    switch (priority) {
      case 3: return 'bg-red-600 text-white';
      case 2: return 'bg-orange-500 text-white';
      case 1: return 'bg-yellow-500 text-gray-800';
      case 0:
      default: return 'bg-gray-300 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: number | undefined) => {
    switch (priority) {
      case 3: return 'Urgent';
      case 2: return 'High';
      case 1: return 'Medium';
      case 0:
      default: return 'Low';
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
        console.error("[DailyDigestTaskList] Error updating task status:", error);
        showError("Failed to update task status: " + error.message);
      } else {
        showSuccess(`Task marked as ${newStatus}!`);
        queryClient.invalidateQueries({ queryKey: ['dailyDigestTasks'] });

        if (task.assigned_to && task.assigned_to !== currentUser?.id) {
          const assignedMember = teamMembers.find(member => member.id === task.assigned_to);
          if (assignedMember) {
            sendNotification({
              userId: assignedMember.id,
              message: `${currentUser?.name || 'A user'} ${newStatus === 'completed' ? 'completed' : 'reopened'} your task: "${task.title}".`,
              type: 'task_status_update',
              relatedId: task.project_id,
              pushTitle: `Task Status Update`,
              pushBody: `${currentUser?.name || 'A user'} ${newStatus === 'completed' ? 'completed' : 'reopened'} your task: "${task.title}".`,
              pushUrl: `/projects/${task.project_id}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("[DailyDigestTaskList] Unexpected error updating task status:", error);
      showError("An unexpected error occurred.");
    }
  };

  const handlePriorityChange = async (taskId: string, currentPriority: number, direction: 'up' | 'down') => {
    let newPriority = currentPriority;
    if (direction === 'up') {
      newPriority = Math.min(3, currentPriority + 1);
    } else {
      newPriority = Math.max(0, currentPriority - 1);
    }

    if (newPriority === currentPriority) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority: newPriority })
        .eq('id', taskId);

      if (error) {
        console.error("[DailyDigestTaskList] Error updating task priority:", error);
        showError("Failed to update task priority: " + error.message);
      } else {
        showSuccess(`Task priority updated to ${getPriorityLabel(newPriority)}!`);
        queryClient.invalidateQueries({ queryKey: ['dailyDigestTasks'] });

        const updatedTask = tasks?.find(t => t.id === taskId);
        if (updatedTask?.assigned_to && updatedTask.assigned_to !== currentUser?.id) {
          const assignedMember = teamMembers.find(member => member.id === updatedTask.assigned_to);
          if (assignedMember) {
            sendNotification({
              userId: assignedMember.id,
              message: `${currentUser?.name || 'A user'} changed the priority of your task "${updatedTask.title}" to ${getPriorityLabel(newPriority)}.`,
              type: 'task_priority_update',
              relatedId: updatedTask.project_id,
              pushTitle: `Task Priority Update`,
              pushBody: `${currentUser?.name || 'A user'} changed priority of "${updatedTask.title}" to ${getPriorityLabel(newPriority)}.`,
              pushUrl: `/projects/${updatedTask.project_id}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("[DailyDigestTaskList] Unexpected error updating task priority:", error);
      showError("An unexpected error occurred.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> {/* Changed text color */}
        <p className="ml-3 text-lg text-muted-foreground">Loading your tasks...</p> {/* Changed text color */}
      </div>
    );
  }

  if (isError) {
    showError("Failed to load tasks: " + error.message);
    return (
      <div className="text-center p-8 text-destructive"> {/* Changed text color */}
        <p>Error loading tasks for your daily digest. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-foreground">Your Daily Digest</h3> {/* Changed text color */}

      {tasks!.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20"> {/* Changed text/border/bg colors */}
          <p className="text-lg">No personal tasks found.</p>
          <p className="text-sm mt-2">Tasks created by you or assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4"> {/* Ensure grid is single column on mobile */}
          {tasks!.map((task) => (
            <Card key={task.id} className="rounded-xl glass-card"> {/* Applied glass-card */}
              <CardContent className="p-4 flex items-start space-x-4">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleTaskStatus(task)}
                  className="mt-1 h-5 w-5 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <div className="flex-grow">
                  <CardTitle className={cn(
                    "text-lg font-semibold text-foreground", /* Changed text color */
                    task.status === 'completed' && "line-through text-muted-foreground" /* Changed text color */
                  )}>
                    {task.title}
                  </CardTitle>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p> /* Changed text color */
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground"> {/* Changed text color */}
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getStatusBadgeColor(task.status, task.due_date))}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getPriorityBadgeColor(task.priority))}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    {task.due_date && (
                      <span className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1 text-primary" /> {/* Changed icon color */}
                        Due: {format(new Date(task.due_date), 'PPP')}
                      </span>
                    )}
                    {task.assigned_to && task.assigned_to === currentUser?.id && (
                      <span className="flex items-center">
                        <UserRound className="h-4 w-4 mr-1 text-secondary" /> {/* Changed icon color */}
                        Assigned to you
                      </span>
                    )}
                    {task.user_id && task.user_id === currentUser?.id && (
                      <span className="flex items-center">
                        <UserRound className="h-4 w-4 mr-1 text-green-500" />
                        Created by you
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30"
                    onClick={() => handlePriorityChange(task.id, task.priority || 0, 'up')}
                    disabled={(task.priority || 0) >= 3}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30"
                    onClick={() => handlePriorityChange(task.id, task.priority || 0, 'down')}
                    disabled={(task.priority || 0) <= 0}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};