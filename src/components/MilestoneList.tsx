import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Milestone } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays } from 'lucide-react';
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
import { MilestoneFormDialog } from './MilestoneFormDialog';

interface MilestoneListProps {
  projectId: string;
}

export const MilestoneList: React.FC<MilestoneListProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [milestoneToDeleteId, setMilestoneToDeleteId] = useState<string | null>(null);

  const { data: milestones, isLoading, isError, error } = useQuery<Milestone[], Error>({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
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

  const getStatusBadgeColor = (status: Milestone['status'], dueDate?: string) => {
    if (status === 'completed') return 'bg-green-500 text-white';
    if (status === 'overdue' || (dueDate && isPast(new Date(dueDate)))) return 'bg-red-500 text-white';
    switch (status) {
      case 'pending':
      default:
        return 'bg-yellow-500 text-white';
    }
  };

  const handleAddMilestone = () => {
    setEditingMilestone(null);
    setIsFormDialogOpen(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setIsFormDialogOpen(true);
  };

  const handleFormDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingMilestone(null);
    queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setMilestoneToDeleteId(milestoneId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMilestone = async () => {
    if (!milestoneToDeleteId) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneToDeleteId);

      if (error) {
        console.error("[MilestoneList] Error deleting milestone:", error);
        showError("Failed to delete milestone: " + error.message);
      } else {
        showSuccess("Milestone deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      }
    } catch (error) {
      console.error("[MilestoneList] Unexpected error deleting milestone:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setMilestoneToDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading milestones...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load milestones: " + error.message);
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading milestones. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Milestones</h3>
        <Button onClick={handleAddMilestone} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 w-full sm:w-auto">
          <PlusCircle className="h-5 w-5 mr-2" /> Add Milestone
        </Button>
      </div>

      {milestones!.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No milestones for this project yet.</p>
          <p className="text-sm mt-2">Click "Add Milestone" to create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {milestones!.map((milestone) => (
            <Card key={milestone.id} className="rounded-xl glass-card">
              <CardContent className="p-4 flex items-start space-x-4">
                <div className="flex-grow">
                  <CardTitle className={cn(
                    "text-lg font-semibold text-foreground",
                    milestone.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {milestone.title}
                  </CardTitle>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getStatusBadgeColor(milestone.status, milestone.due_date))}>
                      {milestone.status.replace('-', ' ')}
                    </Badge>
                    {milestone.due_date && (
                      <span className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-1 text-primary" />
                        Due: {format(new Date(milestone.due_date), 'PPP')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30" onClick={() => handleEditMilestone(milestone)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => handleDeleteMilestone(milestone.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MilestoneFormDialog
        projectId={projectId}
        milestone={editingMilestone}
        isOpen={isFormDialogOpen}
        onClose={handleFormDialogClose}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this milestone? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMilestone} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};