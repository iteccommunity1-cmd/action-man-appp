import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Subtask } from '@/types/subtask';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface SubtaskListProps {
  taskId: string;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ taskId }) => {
  const queryClient = useQueryClient();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { data: subtasks, isLoading } = useQuery<Subtask[], Error>({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId,
  });

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setIsAdding(true);
    try {
      const { error } = await supabase.from('subtasks').insert({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
        is_completed: false,
      });

      if (error) throw error;

      setNewSubtaskTitle("");
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      showSuccess("Subtask added!");
    } catch (error: any) {
      showError("Failed to add subtask: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: !subtask.is_completed })
        .eq('id', subtask.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
    } catch (error: any) {
      showError("Failed to update subtask: " + error.message);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      showSuccess("Subtask deleted.");
    } catch (error: any) {
      showError("Failed to delete subtask: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const completedCount = subtasks?.filter(s => s.is_completed).length || 0;
  const totalCount = subtasks?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subtasks</h4>
        <span className="text-xs font-medium text-primary">{completedCount}/{totalCount}</span>
      </div>

      {totalCount > 0 && (
        <Progress value={progress} className="h-1.5 bg-muted mb-4" />
      )}

      <div className="space-y-2">
        {subtasks?.map((subtask) => (
          <div key={subtask.id} className="flex items-center gap-3 group bg-muted/30 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={subtask.is_completed}
              onCheckedChange={() => handleToggleSubtask(subtask)}
              className="h-4 w-4 rounded border-border"
            />
            <span className={cn(
              "text-sm flex-grow truncate",
              subtask.is_completed && "line-through text-muted-foreground"
            )}>
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
              onClick={() => handleDeleteSubtask(subtask.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          className="h-9 rounded-lg bg-input border-border text-sm"
          disabled={isAdding}
        />
        <Button 
          type="submit" 
          size="icon" 
          className="h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 shrink-0"
          disabled={isAdding || !newSubtaskTitle.trim()}
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};