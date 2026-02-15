import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Project, ProjectOverviewStatsProps } from '@/types/project';
import { Task } from '@/types/task';
import { Loader2 } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { showError } from '@/utils/toast';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { ProjectFormDialog } from '@/components/ProjectFormDialog';
import { TimeEntryFormDialog } from '@/components/TimeEntryFormDialog';
import { ProjectDetailsTabs } from '@/components/ProjectDetailsTabs';
import { ProjectHeader } from '@/components/ProjectHeader';
import { ProjectActivityFeed } from '@/components/ProjectActivityFeed';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

  const [isTaskFormDialogOpen, setIsTaskFormDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectEditDialogOpen, setIsProjectEditDialogOpen] = useState(false);
  const [isTimeEntryDialogOpen, setIsTimeEntryDialogOpen] = useState(false);

  const { data: project, isLoading, isError, error } = useQuery<Project, Error>({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id || !currentUser?.id) {
        throw new Error("Project ID or user ID is missing.");
      }
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!id && !!currentUser?.id,
  });

  const { data: projectStats, isLoading: isLoadingStats } = useQuery<ProjectOverviewStatsProps, Error>({
    queryKey: ['projectStats', id],
    queryFn: async () => {
      if (!id) return { totalTasks: 0, completedTasks: 0, totalMilestones: 0, totalGoals: 0, totalMetrics: 0, totalFiles: 0, totalTimeLogged: 0 };

      const [
        tasksCount,
        completedTasksCount,
        milestonesCount,
        goalsCount,
        metricsCount,
        filesCount,
        timeEntriesData,
      ] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact' }).eq('project_id', id),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('project_id', id).eq('status', 'completed'),
        supabase.from('milestones').select('id', { count: 'exact' }).eq('project_id', id),
        supabase.from('goals').select('id', { count: 'exact' }).eq('project_id', id),
        supabase.from('metrics').select('id', { count: 'exact' }).eq('project_id', id),
        supabase.from('project_files').select('id', { count: 'exact' }).eq('project_id', id),
        supabase.from('time_entries').select('start_time, end_time').eq('project_id', id),
      ]);

      const totalTimeLoggedMinutes = (timeEntriesData.data || []).reduce((sum, entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        return sum + differenceInMinutes(end, start);
      }, 0);

      return {
        totalTasks: tasksCount.count || 0,
        completedTasks: completedTasksCount.count || 0,
        totalMilestones: milestonesCount.count || 0,
        totalGoals: goalsCount.count || 0,
        totalMetrics: metricsCount.count || 0,
        totalFiles: filesCount.count || 0,
        totalTimeLogged: totalTimeLoggedMinutes / 60,
      };
    },
    enabled: !!id,
  });

  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskFormDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormDialogOpen(true);
  };

  const handleTaskFormClose = () => {
    setIsTaskFormDialogOpen(false);
    setEditingTask(null);
    queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    queryClient.invalidateQueries({ queryKey: ['projectStats', id] });
    queryClient.invalidateQueries({ queryKey: ['projectActivity', id] });
  };

  const handleEditProject = () => {
    setIsProjectEditDialogOpen(true);
  };

  const handleProjectFormClose = () => {
    setIsProjectEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    queryClient.invalidateQueries({ queryKey: ['projectActivity', id] });
  };

  const handleTimeEntryDialogClose = () => {
    setIsTimeEntryDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['projectStats', id] });
    queryClient.invalidateQueries({ queryKey: ['projectActivity', id] });
  };

  if (isLoading || loadingTeamMembers || isLoadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading project details...</p>
      </div>
    );
  }

  if (isError || !project || !projectStats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-xl text-destructive">Error loading project details.</p>
        <Link to="/projects" className="mt-4 text-primary hover:text-primary/80 font-medium text-lg transition-colors duration-200">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-0">
      <ProjectHeader
        project={project}
        projectStats={projectStats}
        teamMembers={teamMembers}
        onEditProject={handleEditProject}
        onLogTime={() => setIsTimeEntryDialogOpen(true)}
      />

      <div className="w-full max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <ProjectDetailsTabs
            projectId={project.id}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
          />
        </div>
        <div className="lg:col-span-1">
          <Card className="rounded-xl glass-card sticky top-24">
            <CardContent className="p-6">
              <ProjectActivityFeed projectId={project.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskFormDialog
        projectId={project.id}
        task={editingTask}
        isOpen={isTaskFormDialogOpen}
        onClose={handleTaskFormClose}
      />

      <ProjectFormDialog
        project={project}
        isOpen={isProjectEditDialogOpen}
        onClose={handleProjectFormClose}
        onSave={handleProjectFormClose}
      />

      <TimeEntryFormDialog
        projectId={project.id}
        isOpen={isTimeEntryDialogOpen}
        onClose={handleTimeEntryDialogClose}
        onSave={handleTimeEntryDialogClose}
      />
    </div>
  );
};

export default ProjectDetails;