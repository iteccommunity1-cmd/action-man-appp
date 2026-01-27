import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays, UserRound, ArrowUp, ArrowDown } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { sendNotification } from '@/utils/notifications';
import { supabase } from '@/integrations/supabase/client'; // Direct import

interface TaskListProps {
  projectId: string;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

type TaskStatusFilter = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
type TaskSortOrder = 'newest' | 'oldest' | 'due_date_asc' | 'due_date_desc' | 'priority_high' | 'priority_low';

export const TaskList: React.FC<TaskListProps> = ({ projectId, onAddTask, onEditTask }) => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>('priority_high');

  const queryKey = useMemo(() => ['tasks', projectId, filterStatus, sortOrder], [projectId, filterStatus, sortOrder]);

  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      switch (sortOrder) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'due_date_asc':
          query = query.order('due_date', { ascending: true, nullsFirst: false });
          break;
        case 'due_date_desc':
          query = query.order('due_date', { ascending: false, nullsFirst: true });
          break;
        case 'priority_high':
          query = query.order('priority', { ascending: false }); // Removed nullsLast
          break;
        case 'priority_low':
          query = query.order('priority', { ascending: true }); // Removed nullsFirst
          break;
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (!currentUser?.id || !projectId) return;

    const tasksChannel = supabase
      .channel(`tasks_for_project_${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const newTask = payload.new as Task;
          queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
            if (!oldData) return [newTask];
            const updatedData = [...oldData, newTask];
            return updatedData
              .filter(t => filterStatus === 'all' || t.status === filterStatus)
              .sort((a, b) => {
                // Re-apply sorting logic
                switch (sortOrder) {
                  case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                  case 'due_date_asc': return (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity);
                  case 'due_date_desc': return (b.due_date ? new Date(b.due_date).getTime() : -Infinity) - (a.due_date ? new Date(a.due_date).getTime() : -Infinity);
                  case 'priority_high': return (b.priority || 0) - (a.priority || 0);
                  case 'priority_low': return (a.priority || 0) - (b.priority || 0);
                  default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
              });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const updatedTask = payload.new as Task;
          queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
            if (!oldData) return [];
            const updated = oldData.map(t => t.id === updatedTask.id ? updatedTask : t);
            return updated
              .filter(t => filterStatus === 'all' || t.status === filterStatus)
              .sort((a, b) => {
                // Re-apply sorting logic
                switch (sortOrder) {
                  case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                  case 'due_date_asc': return (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity);
                  case 'due_date_desc': return (b.due_date ? new Date(b.due_date).getTime() : -Infinity) - (a.due_date ? new Date(a.due_date).getTime() : -Infinity);
                  case 'priority_high': return (b.priority || 0) - (a.priority || 0);
                  case 'priority_low': return (a.priority || 0) - (b.priority || 0);
                  default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
              });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const deletedTask = payload.old as Task;
          queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
            if (!oldData) return [];
            return oldData.filter(t => t.id !== deletedTask.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [supabase, currentUser?.id, projectId, queryClient, queryKey, filterStatus, sortOrder]);

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
      case 3: return 'bg-red-600 text-white'; // Urgent
      case 2: return 'bg-orange-500 text-white'; // High
      case 1: return 'bg-yellow-500 text-gray-800'; // Medium
      case 0:
      default: return 'bg-gray-300 text-gray-800'; // Low
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
        console.error("Error updating task status:", error);
        showError("Failed to update task status: " + error.message);
      } else {
        showSuccess(`Task marked as ${newStatus}!`);
        // State will be updated via real-time subscription

        // Send notification if assigned_to changed or was set
        if (task.assigned_to && task.assigned_to !== currentUser?.id) {
          const assignedMember = teamMembers.find(member => member.id === task.assigned_to);
          if (assignedMember) {
            sendNotification({
              userId: assignedMember.id,
              message: `${currentUser?.name || 'A user'} ${newStatus === 'completed' ? 'completed' : 'reopened'} your task: "${task.title}".`,
              type: 'task_status_update',
              relatedId: projectId, // Pass projectId here for navigation
              pushTitle: `Task Status Update`,
              pushBody: `${currentUser?.name || 'A user'} ${newStatus === 'completed' ? 'completed' : 'reopened'} your task: "${task.title}".`,
              pushUrl: `/projects/${projectId}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error updating task status:", error);
      showError("An unexpected error occurred.");
    }
  };

  const handlePriorityChange = async (taskId: string, currentPriority: number, direction: 'up' | 'down') => {
    let newPriority = currentPriority;
    if (direction === 'up') {
      newPriority = Math.min(3, currentPriority + 1); // Max priority is 3 (Urgent)
    } else {
      newPriority = Math.max(0, currentPriority - 1); // Min priority is 0 (Low)
    }

    if (newPriority === currentPriority) return; // No change needed

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority: newPriority })
        .eq('id', taskId);

      if (error) {
        console.error("[TaskList] Error updating task priority:", error);
        showError("Failed to update task priority: " + error.message);
      } else {
        showSuccess(`Task priority updated to ${getPriorityLabel(newPriority)}!`);
        // State will be updated via real-time subscription

        // Send notification to assigned user if different from current user
        const updatedTask = tasks?.find(t => t.id === taskId);
        if (updatedTask?.assigned_to && updatedTask.assigned_to !== currentUser?.id) {
          const assignedMember = teamMembers.find(member => member.id === updatedTask.assigned_to);
          if (assignedMember) {
            sendNotification({
              userId: assignedMember.id,
              message: `${currentUser?.name || 'A user'} changed the priority of your task "${updatedTask.title}" to ${getPriorityLabel(newPriority)}.`,
              type: 'task_priority_update',
              relatedId: projectId,
              pushTitle: `Task Priority Update`,
              pushBody: `${currentUser?.name || 'A user'} changed priority of "${updatedTask.title}" to ${getPriorityLabel(newPriority)}.`,
              pushUrl: `/projects/${projectId}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("[TaskList] Unexpected error updating task priority:", error);
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
        // State will be updated via real-time subscription
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load tasks: " + error.message);
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading tasks. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Tasks</h3>
        <Button onClick={onAddTask} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 w-full sm:w-auto"> {/* Added w-full for mobile */}
          <PlusCircle className="h-5 w-5 mr-2" /> Add Task
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-end">
        <div className="flex items-center gap-2 w-full sm:w-auto"> {/* Added w-full for mobile */}
          <Label htmlFor="filter-status" className="text-foreground">Filter by Status:</Label>
          <Select value={filterStatus} onValueChange={(value: TaskStatusFilter) => setFilterStatus(value)}>
            <SelectTrigger id="filter-status" className="w-full sm:w-[180px] rounded-lg border-border bg-input text-foreground hover:bg-input/80"> {/* Adjusted width for mobile */}
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto"> {/* Added w-full for mobile */}
          <Label htmlFor="sort-order" className="text-foreground">Sort by:</Label>
          <Select value={sortOrder} onValueChange={(value: TaskSortOrder) => setSortOrder(value)}>
            <SelectTrigger id="sort-order" className="w-full sm:w-[180px] rounded-lg border-border bg-input text-foreground hover:bg-input/80"> {/* Adjusted width for mobile */}
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
              <SelectItem value="priority_high">Priority (High to Low)</SelectItem>
              <SelectItem value="priority_low">Priority (Low to High)</SelectItem>
              <SelectItem value="due_date_asc">Due Date (Soonest)</SelectItem>
              <SelectItem value="due_date_desc">Due Date (Latest)</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tasks!.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No tasks for this project yet.</p>
          <p className="text-sm mt-2">Click "Add Task" to create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
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
                    "text-lg font-semibold text-foreground",
                    task.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </CardTitle>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
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
                    {task.assigned_to && (
                      <span className="flex items-center">
                        <UserRound className="h-4 w-4 mr-1 text-secondary" /> {/* Changed icon color */}
                        Assigned to: {teamMembers.find(member => member.id === task.assigned_to)?.name || 'Unknown'}
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
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30" onClick={() => onEditTask(task)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};