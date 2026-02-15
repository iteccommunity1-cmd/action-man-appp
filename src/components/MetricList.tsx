import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Metric } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, Loader2, Gauge, Clock } from 'lucide-react';
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
import { MetricFormDialog } from './MetricFormDialog';

interface MetricListProps {
  projectId: string;
}

export const MetricList: React.FC<MetricListProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [metricToDeleteId, setMetricToDeleteId] = useState<string | null>(null);

  const { data: metrics, isLoading, isError, error } = useQuery<Metric[], Error>({
    queryKey: ['metrics', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!projectId,
  });

  const getMetricTypeBadgeColor = (type: Metric['type']) => {
    switch (type) {
      case 'kpi': return 'bg-purple-500 text-white';
      case 'business_metric': return 'bg-teal-500 text-white';
      case 'tech_metric': return 'bg-indigo-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleAddMetric = () => {
    setEditingMetric(null);
    setIsFormDialogOpen(true);
  };

  const handleEditMetric = (metric: Metric) => {
    setEditingMetric(metric);
    setIsFormDialogOpen(true);
  };

  const handleFormDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingMetric(null);
    queryClient.invalidateQueries({ queryKey: ['metrics', projectId] });
  };

  const handleDeleteMetric = (metricId: string) => {
    setMetricToDeleteId(metricId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMetric = async () => {
    if (!metricToDeleteId) return;

    try {
      const { error } = await supabase
        .from('metrics')
        .delete()
        .eq('id', metricToDeleteId);

      if (error) {
        console.error("[MetricList] Error deleting metric:", error);
        showError("Failed to delete metric: " + error.message);
      } else {
        showSuccess("Metric deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['metrics', projectId] });
      }
    } catch (error) {
      console.error("[MetricList] Unexpected error deleting metric:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setMetricToDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading metrics: {error.message}</p>
      </div>
    );
  }

  const metricList = metrics || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Metrics & KPIs</h3>
        <Button onClick={handleAddMetric} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 w-full sm:w-auto">
          <PlusCircle className="h-5 w-5 mr-2" /> Add Metric
        </Button>
      </div>

      {metricList.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No metrics for this project yet.</p>
          <p className="text-sm mt-2">Click "Add Metric" to start tracking!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {metricList.map((metric) => (
            <Card key={metric.id} className="rounded-xl glass-card">
              <CardContent className="p-4 flex items-start space-x-4">
                <div className="flex-grow">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {metric.name}
                  </CardTitle>
                  {metric.description && (
                    <p className="text-sm text-muted-foreground mt-1">{metric.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                    <Badge className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getMetricTypeBadgeColor(metric.type))}>
                      {metric.type.replace(/_/g, ' ')}
                    </Badge>
                    {metric.target_value !== undefined && (
                      <span className="flex items-center">
                        <Gauge className="h-4 w-4 mr-1 text-primary" />
                        Current: {metric.current_value} / Target: {metric.target_value} {metric.unit}
                      </span>
                    )}
                    {metric.last_updated && (
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-secondary" />
                        Updated: {format(new Date(metric.last_updated), 'PPP')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted/30" onClick={() => handleEditMetric(metric)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => handleDeleteMetric(metric.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MetricFormDialog
        projectId={projectId}
        metric={editingMetric}
        isOpen={isFormDialogOpen}
        onClose={handleFormDialogClose}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this metric? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMetric} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};