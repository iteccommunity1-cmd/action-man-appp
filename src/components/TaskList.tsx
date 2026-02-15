import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays, UserRound, ArrowUp, ArrowDown, MessageSquare, LayoutGrid, List, Search, SlidersHorizontal, CheckSquare } from 'lucide-react';
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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { sendNotification } from '@/utils/notifications';
import { supabase } from '@/integrations/supabase/client';
import { TaskDetailsSheet } from './TaskDetailsSheet';
import { TaskKanban } from './TaskKanban';
import { logProjectActivity } from '@/utils/activity';
import { Progress } from '@/components/ui/progress';
import { Subtask } from '@/types/subtask';

interface TaskListProps {
  projectId: string;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

type TaskStatusFilter = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
type TaskSortOrder = 'newest' | 'oldest' | 'due_date_asc' | 'due_date_desc' | 'priority_high' | 'priority_low';
type ViewMode = 'list' | 'board';

const TaskListItem: React.FC<{ 
  task: Task; 
  teamMembers: any[]; 
  onToggle: (task: Task) => void; 
  onEdit: (task: Task) => void;
  onClick: () => void;
}> = ({ task, teamMembers, onToggle, onEdit, onClick }) => {
  const { data: subtasks } = useQuery<Subtask[]>({
    queryKey: ['subtasks', task.id],
    queryFn: async () => {
      const { data } = await supabase.from('subtasks').select('*').eq('task_id', task.id);
      return data || [];
    },
  });

  const completedSubtasks = subtasks?.filter(s => s.is_completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const getPriorityLabel = (priority: number | undefined) => {
    switch (priority) {
      case 3: return 'Urgent';
      case 2: return 'High';
      case 1: return 'Medium';
      default: return 'Low';
    }
  };

  const getPriorityColor = (priority: number | undefined) => {
    switch (priority) {
      case 3: return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 2: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 1: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <Card className="rounded-xl glass-card hover:border-primary/50 transition-all cursor-pointer group" onClick={onClick}>
      <CardContent className="p-4 flex items-start gap-4">
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={() => onToggle(task)}
            className="h-5 w-5 rounded-md border-border data-[state=checked]:bg-primary"
          />
        </div>
        <div className="flex-grow min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className={cn(
              "text-base font-semibold text-foreground truncate",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {task.title}
            </CardTitle>
            <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-[10px] font-bold uppercase tracking-wider", getPriorityColor(task.priority))}>
              {getPriorityLabel(task.priority)}
            </Badge>
          </div>
          
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-3">
              <Progress value={subtaskProgress} className="h-1 flex-grow bg-muted" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <CheckSquare className="h-3 w-3" /> {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
            <Badge className={cn("rounded-full px-2 py-0 font-medium", 
              task.status === 'completed' ? 'bg-green-500' : 
              task.status === 'in-progress' ? 'bg-blue-500' : 'bg-yellow-500')}>
              {task.status.replace('-', ' ')}
            </Badge>
            {task.due_date && (
              <span className="flex items-center">
                <CalendarDays className="h-3 w-3 mr-1 text-primary" />
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {task.assigned_to && (
              <span className="flex items-center">
                <UserRound className="h-3 w-3 mr-1 text-secondary" />
                {teamMembers.find(m => m.id === task.assigned_to)?.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const TaskList: React.FC<TaskListProps> = ({ projectId, onAddTask, onEditTask }) => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatusFilter>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>('priority_high');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

  const queryKey = useMemo(() => ['tasks', projectId, filterStatus, filterAssignee, sortOrder], [projectId, filterStatus, filterAssignee, sortOrder]);

  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!currentUser?.id) throw new Error("User not logged in.");
      let query = supabase.from('tasks').select('*').eq('project_id', projectId);

      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (filterAssignee !== 'all') query = query.eq('assigned_to', filterAssignee);

      switch (sortOrder) {
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        case 'oldest': query = query.order('created_at', { ascending: true }); break;
        case 'due_date_asc': query = query.order('due_date', { ascending: true, nullsFirst: false }); break;
        case 'due_date_desc': query = query.order('due_date', { ascending: false, nullsFirst: true }); break;
        case 'priority_high': query = query.order('priority', { ascending: false }); break;
        case 'priority_low': query = query.order('priority', { ascending: true }); break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tasks, searchQuery]);

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      if (error) throw error;

      showSuccess(`Task marked as ${newStatus}!`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      if (newStatus === 'completed') {
        logProjectActivity({
          projectId,
          userId: currentUser!.id,
          actionType: 'task_completed',
          entityName: task.title,
        });
      }
    } catch (error: any) {
      showError("Failed to update task status: " + error.message);
    }
  };

  const handleOpenDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsSheetOpen(true);
  };

  if (isLoading || loadingTeamMembers) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const FilterContent = () => (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
        <Select value={filterStatus} onValueChange={(v: TaskStatusFilter) => setFilterStatus(v)}>
          <SelectTrigger className="rounded-lg border-border bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignee</Label>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="rounded-lg border-border bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {teamMembers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort By</Label>
        <Select value={sortOrder} onValueChange={(v: TaskSortOrder) => setSortOrder(v)}>
          <SelectTrigger className="rounded-lg border-border bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority_high">Priority (High)</SelectItem>
            <SelectItem value="priority_low">Priority (Low)</SelectItem>
            <SelectItem value="due_date_asc">Due Date (Soonest)</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-foreground">Tasks</h3>
          <Button onClick={onAddTask} size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="h-4 w-4 mr-2" /> Add Task
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-input border-border focus:ring-primary h-10"
            />
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border bg-input">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl h-[60vh] bg-card border-t border-border">
              <SheetHeader>
                <SheetTitle>Filter & Sort Tasks</SheetTitle>
              </SheetHeader>
              <FilterContent />
            </SheetContent>
          </Sheet>

          <div className="flex bg-muted rounded-full p-1 h-10">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-full w-8 h-8"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('board')}
              className="rounded-full w-8 h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No tasks found.</p>
        </div>
      ) : viewMode === 'board' ? (
        <TaskKanban tasks={filteredTasks} teamMembers={teamMembers} onTaskClick={handleOpenDetails} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredTasks.map((task) => (
            <TaskListItem 
              key={task.id} 
              task={task} 
              teamMembers={teamMembers} 
              onToggle={handleToggleTaskStatus}
              onEdit={onEditTask}
              onClick={() => handleOpenDetails(task)}
            />
          ))}
        </div>
      )}

      <TaskDetailsSheet task={selectedTask} isOpen={isDetailsSheetOpen} onClose={() => setIsDetailsSheetOpen(false)} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this task?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {}} className="bg-destructive text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};