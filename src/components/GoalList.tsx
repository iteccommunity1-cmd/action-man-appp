import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Goal } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays, Target } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { GoalFormDialog } from './GoalFormDialog';

interface GoalListProps {
  projectId: string;
}

export const GoalList: React.FC<GoalListProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);

  const { data: goals, isLoading, isError, error } = useQuery<Goal[], Error>({
    queryKey: ['goals', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!projectId,
  });

  const getStatusBadgeColor = (status: Goal['status'], dueDate?: string) => {
    if (status === 'achieved') return 'bg-green-500 text-white';
    if (status === 'failed') return 'bg-red-500 text-white';
    if (status === 'at_risk' || (dueDate && isPast(new Date(dueDate)))) return 'bg-orange-500 text-white';
    switch (status) {
      case 'in_progress':
        return 'bg-blue-500 text-white';
      case 'not_started':
      default:
        return 'bg-yellow-500 text-white';
    }
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setIsFormDialogOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormDialogOpen(true);
  };

  const handleFormDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingGoal(null);
    queryClient.invalidateQueries({ queryKey: ['goals', projectId] });
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDeleteId(goalId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDeleteId) return;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalToDeleteId);

      if (error) {
        console.error("[GoalList] Error deleting goal:", error);
        showError("Failed to delete goal: " + error.message);
      } else {
        showSuccess("Goal deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['goals', projectId] });
      }
    } catch (error) {
      console.error("[GoalList] Unexpected error deleting goal:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setGoalToDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading goals...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading goals: {error.message}</p>
      </div>
    );
  }

  const goalList = goals || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Goals</h3>
        <Button onClick={handleAddGoal} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 w-full sm:w-auto">
          <PlusCircle className="h-5 w-5 mr-2" /> Add Goal
        </Button>
      </div>

      {goalList.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No goals for this project yet.</p>
          <p className="text-sm mt-2">Click "Add Goal" to create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {goalList.map((goal) => (
            <Card key={goal.id} className="rounded-xl glass-card">
              <CardContent className="p-4 flex items-start space-x-4">
                <div className="flex-grow">
                  <CardTitle className={cn(
                    "text-lg font-semibold text-foreground",
                    goal.status === 'achieved' && "line-through text-muted-foreground"
                  )}>
                    {goal.title}
                  </CardTitle>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getStatusBadgeColor(goal.status, goal.due_date))}>
                      {goal.status.replace(/_/g, ' ')}
                    </Badge>
                    {goal.target_value !== undefined && (
                      <span className="flex items-center">
                        <Target className="h-4 w-4 mr-1 text-primary" />
                        Target: {goal.current_value} / {goal.target_value} {goal.unit}
                      </span>
                    )}
                    {goal.due_date && (
                      <span className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1 text-primary" />
                        Due: {format(new Date(goal.due_date), 'PPP')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30" onClick={() => handleEditGoal(goal)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => handleDeleteGoal(goal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GoalFormDialog
        projectId={projectId}
        goal={editingGoal}
        isOpen={isFormDialogOpen}
        onClose={handleFormDialogClose}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};