import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { Loader2, CalendarDays, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const UpcomingTasksWidget: React.FC = () => {
  const { currentUser } = useUser();

  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: ['upcomingTasks', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*') // Fetch all fields to match the Task interface
        .or(`user_id.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`)
        .neq('status', 'completed') // Only show non-completed tasks
        .order('priority', { ascending: false }) // High priority first
        .order('due_date', { ascending: true, nullsFirst: false }) // Soonest due date first
        .limit(5); // Limit to 5 upcoming tasks

      if (error) {
        throw error;
      }
      return (data || []) as Task[]; // Ensure data is always an array and explicitly cast to Task[]
    },
    enabled: !!currentUser?.id,
  });

  const getStatusBadgeColor = (status: Task['status'], dueDate?: string) => {
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

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-lg border border-gray-200 h-full flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-lg text-gray-600">Loading tasks...</p>
      </Card>
    );
  }

  if (isError) {
    showError("Failed to load upcoming tasks: " + error.message);
    return (
      <Card className="rounded-xl shadow-lg border border-gray-200 h-full flex items-center justify-center p-6">
        <p className="text-lg text-red-600">Error loading tasks.</p>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-between">
          Upcoming Tasks
          <Link to="/daily-digest">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
              View All <ListTodo className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {tasks!.length === 0 ? (
          <div className="text-center text-gray-500 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <p className="text-lg">No upcoming tasks!</p>
            <p className="text-sm mt-2">Time to relax or create new ones.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks!.map((task: Task) => (
              <Link to={`/projects/${task.project_id}`} key={task.id} className="block hover:bg-gray-50 rounded-lg transition-colors duration-200 p-3 -mx-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800 text-base">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getPriorityBadgeColor(task.priority))}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getStatusBadgeColor(task.status, task.due_date))}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                {task.due_date && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-purple-500" />
                    Due: {format(new Date(task.due_date), 'PPP')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};