import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { Subtask } from '@/types/subtask';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarDays, UserRound, MessageSquare, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamMember } from '@/types/project';
import { Progress } from '@/components/ui/progress';

interface TaskKanbanProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskClick: (task: Task) => void;
}

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'pending', label: 'To Do', color: 'bg-yellow-500' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'completed', label: 'Completed', color: 'bg-green-500' },
  { id: 'overdue', label: 'Overdue', color: 'bg-red-500' },
];

const TaskCard: React.FC<{ task: Task; teamMembers: TeamMember[]; onClick: () => void }> = ({ task, teamMembers, onClick }) => {
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

  const getPriorityColor = (priority: number | undefined) => {
    switch (priority) {
      case 3: return 'text-red-500';
      case 2: return 'text-orange-500';
      case 1: return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card
      className="rounded-lg glass-card hover:border-primary/50 transition-all cursor-pointer shadow-sm group"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h5 className={cn(
            "text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors",
            task.status === 'completed' && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h5>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-none", getPriorityColor(task.priority))}>
            ●
          </Badge>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {totalSubtasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {completedSubtasks}/{totalSubtasks} Subtasks
              </span>
              <span>{subtaskProgress}%</span>
            </div>
            <Progress value={subtaskProgress} className="h-1 bg-muted" />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <div className="flex items-center text-[10px] text-muted-foreground">
                <CalendarDays className="h-3 w-3 mr-1 text-primary" />
                {format(new Date(task.due_date), 'MMM d')}
              </div>
            )}
            <div className="flex items-center text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3 mr-1" />
            </div>
          </div>
          
          {task.assigned_to && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-full px-1.5 py-0.5">
              <UserRound className="h-3 w-3 text-secondary" />
              <span className="text-[10px] font-medium truncate max-w-[60px]">
                {teamMembers.find(m => m.id === task.assigned_to)?.name.split(' ')[0]}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const TaskKanban: React.FC<TaskKanbanProps> = ({ tasks, teamMembers, onTaskClick }) => {
  const getTasksByStatus = (status: Task['status']) => tasks.filter(t => t.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex flex-col min-w-[280px] space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", column.color)} />
              <h4 className="font-bold text-foreground uppercase tracking-wider text-sm">
                {column.label}
              </h4>
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                {getTasksByStatus(column.id).length}
              </Badge>
            </div>
          </div>

          <div className="flex-grow space-y-3 min-h-[200px] rounded-xl bg-muted/10 p-2 border border-dashed border-border/50">
            {getTasksByStatus(column.id).map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                teamMembers={teamMembers} 
                onClick={() => onTaskClick(task)} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};