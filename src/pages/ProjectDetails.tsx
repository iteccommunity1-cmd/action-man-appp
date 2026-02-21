import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { ProjectFormDialog } from '@/components/ProjectFormDialog';
import { TimeEntryFormDialog } from '@/components/TimeEntryFormDialog';
import { ProjectDetailsTabs } from '@/components/ProjectDetailsTabs';
import { ProjectHeader } from '@/components/ProjectHeader';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProjectDetails } from '@/hooks/useProjectDetails';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const queryClient = useQueryClient();
  const { project, projectStats, isLoading, isError, error } = useProjectDetails(id, currentUser?.id);

  const [isTaskFormDialogOpen, setIsTaskFormDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectEditDialogOpen, setIsProjectEditDialogOpen] = useState(false);
  const [isTimeEntryDialogOpen, setIsTimeEntryDialogOpen] = useState(false);

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
  };

  const handleEditProject = () => {
    setIsProjectEditDialogOpen(true);
  };

  const handleProjectFormClose = () => {
    setIsProjectEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['project', id] });
  };

  const handleTimeEntryDialogClose = () => {
    setIsTimeEntryDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['projectStats', id] });
  };

  if (isLoading || loadingTeamMembers) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Project Workspace...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load project details: " + (error as Error).message);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
          <Loader2 className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground mb-4">Workspace Unavailable</h2>
        <p className="text-muted-foreground max-w-sm mb-8">We encountered an issue while assembling your project data. Please try again or return to the dashboard.</p>
        <Link to="/projects">
          <Button variant="outline" className="h-12 rounded-2xl px-8 border-white/10 bg-white/5 hover:bg-white/10 font-bold">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  if (!project || !projectStats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
          <Loader2 className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground mb-4">Project Not Found</h2>
        <p className="text-muted-foreground max-w-sm mb-8">The project you're looking for doesn't exist or you don't have the necessary clearance to view it.</p>
        <Link to="/projects">
          <Button variant="outline" className="h-12 rounded-2xl px-8 border-white/10 bg-white/5 hover:bg-white/10 font-bold">
            All Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-transparent animate-fade-in pb-20">
      <div className="w-full max-w-4xl px-6 py-12">
        <ProjectHeader
          project={project}
          projectStats={projectStats}
          teamMembers={teamMembers}
          onEditProject={handleEditProject}
          onLogTime={() => setIsTimeEntryDialogOpen(true)}
        />

        <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <ProjectDetailsTabs
            projectId={project.id}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
          />
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