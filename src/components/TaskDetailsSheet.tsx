import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Task } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarDays, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskComments } from './TaskComments';
import { SubtaskList } from './SubtaskList';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface TaskDetailsSheetProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailsSheet: React.FC<TaskDetailsSheetProps> = ({ task, isOpen, onClose }) => {
  const { teamMembers } = useTeamMembers();

  if (!task) return null;

  const assignedMember = teamMembers.find(m => m.id === task.assigned_to);

  const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in-progress': return 'bg-blue-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  const getPriorityLabel = (priority: number | undefined) => {
    switch (priority) {
      case 3: return 'Urgent';
      case 2: return 'High';
      case 1: return 'Medium';
      default: return 'Low';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[500px] w-full p-0 flex flex-col bg-card border-l border-border glass-card">
        <ScrollArea className="flex-grow">
          <div className="p-6 space-y-8">
            <SheetHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("rounded-full", getStatusBadgeColor(task.status))}>
                  {task.status.replace('-', ' ')}
                </Badge>
                <Badge variant="outline" className="rounded-full border-primary text-primary">
                  {getPriorityLabel(task.priority)} Priority
                </Badge>
              </div>
              <SheetTitle className="text-2xl font-bold text-foreground">{task.title}</SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Task details and discussion
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              {task.description && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Description</h4>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</h4>
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{assignedMember?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</h4>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-medium">
                      {task.due_date ? format(new Date(task.due_date), 'PPP') : 'No deadline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-border">
              <SubtaskList taskId={task.id} />
            </div>

            <div className="space-y-4 pt-8 border-t border-border">
              <h4 className="text-lg font-bold text-foreground">Discussion</h4>
              <TaskComments taskId={task.id} />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};