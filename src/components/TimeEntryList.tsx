import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { format, differenceInMinutes } from 'date-fns';
import { Edit, Loader2, Clock, ListTodo, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { TimeEntryFormDialog } from './TimeEntryFormDialog';
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

interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  start_time: string;
  end_time: string;
  description?: string;
  created_at: string;
  tasks?: Pick<Task, 'id' | 'title'>;
}

interface TimeEntryListProps {
  projectId: string;
}

export const TimeEntryList: React.FC<TimeEntryListProps> = ({ projectId }) => {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  const { data: timeEntries, isLoading, isError, error } = useQuery<TimeEntry[], Error>({
    queryKey: ['timeEntries', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, tasks(id, title)')
        .eq('project_id', projectId)
        .eq('user_id', currentUser?.id)
        .order('start_time', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!projectId && !!currentUser?.id,
  });

  const formatDuration = (start: string, end: string) => {
    const minutes = differenceInMinutes(new Date(end), new Date(start));
    if (minutes < 0) return "Invalid duration";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDeleteId(entryId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDeleteId) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryToDeleteId);

      if (error) {
        console.error("[TimeEntryList] Error deleting time entry:", error);
        showError("Failed to delete time entry: " + error.message);
      } else {
        showSuccess("Time entry deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
        queryClient.invalidateQueries({ queryKey: ['projectStats', projectId] });
      }
    } catch (error) {
      console.error("[TimeEntryList] Unexpected error deleting time entry:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setEntryToDeleteId(null);
    }
  };

  const handleFormDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingEntry(null);
    queryClient.invalidateQueries({ queryKey: ['timeEntries', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projectStats', projectId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading time entries...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading time entries: {error.message}</p>
      </div>
    );
  }

  const entryList = timeEntries || [];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-foreground">Time Entries</h3>

      {entryList.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No time logged for this project yet.</p>
          <p className="text-sm mt-2">Use the "Log Time" button to record your effort!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {entryList.map((entry) => (
            <Card key={entry.id} className="rounded-xl glass-card">
              <CardContent className="p-4 flex items-start justify-between space-x-4">
                <div className="flex-grow space-y-1">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-teal-500" />
                    {formatDuration(entry.start_time, entry.end_time)}
                  </CardTitle>
                  {entry.tasks?.title && (
                    <p className="text-sm text-primary font-medium flex items-center">
                      <ListTodo className="h-4 w-4 mr-1" />
                      Task: {entry.tasks.title}
                    </p>
                  )}
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground pt-1">
                    {format(new Date(entry.start_time), 'MMM d, HH:mm')} - {format(new Date(entry.end_time), 'HH:mm')}
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30" onClick={() => handleEditEntry(entry)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {currentUser?.id === entry.user_id && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20" 
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingEntry && (
        <TimeEntryFormDialog
          projectId={projectId}
          timeEntry={editingEntry}
          isOpen={isEditDialogOpen}
          onClose={handleFormDialogClose}
          onSave={handleFormDialogClose}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this time entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};