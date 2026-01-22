import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Project, TeamMember } from '@/types/project';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Hourglass, Users, ArrowLeft, Loader2, MessageCircle, Edit, Timer } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { ProjectFormDialog } from '@/components/ProjectFormDialog';
import { TimeEntryFormDialog } from '@/components/TimeEntryFormDialog';
import { ProjectDetailsTabs } from '@/components/ProjectDetailsTabs'; // Import ProjectDetailsTabs
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';

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

  // New queries for project overview stats
  const { data: projectStats, isLoading: isLoadingStats } = useQuery<{
    totalTasks: number;
    completedTasks: number;
    totalMilestones: number;
    totalGoals: number;
    totalMetrics: number;
    totalFiles: number;
    totalTimeLogged: number; // in hours
  }, Error>({
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

      if (tasksCount.error) throw tasksCount.error;
      if (completedTasksCount.error) throw completedTasksCount.error;
      if (milestonesCount.error) throw milestonesCount.error;
      if (goalsCount.error) throw goalsCount.error;
      if (metricsCount.error) throw metricsCount.error;
      if (filesCount.error) throw filesCount.error;
      if (timeEntriesData.error) throw timeEntriesData.error;

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
        totalTimeLogged: totalTimeLoggedMinutes / 60, // Convert minutes to hours
      };
    },
    enabled: !!id,
  });


  const getStatusBadgeColor = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'in-progress':
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'overdue':
        return 'bg-red-500 text-white hover:bg-red-600';
      case 'pending':
      default:
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
    }
  };

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
    queryClient.invalidateQueries({ queryKey: ['projectStats', id] }); // Invalidate stats to update task counts
  };

  const handleEditProject = () => {
    setIsProjectEditDialogOpen(true);
  };

  const handleProjectFormClose = () => {
    setIsProjectEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['project', id] }); // Refresh project details after edit
  };

  const handleTimeEntryDialogClose = () => {
    setIsTimeEntryDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['projectStats', id] }); // Invalidate stats to update time logged
  };

  if (isLoading || loadingTeamMembers || isLoadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="ml-4 text-xl text-gray-600">Loading project details...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load project details: " + error.message);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-xl text-red-600">Error loading project details. Please try again.</p>
        <Link to="/projects" className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
          Back to Projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-xl text-gray-600">Project not found or you do not have access.</p>
        <Link to="/projects" className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
          Back to Projects
        </Link>
      </div>
    );
  }

  const assignedMemberDetails: (TeamMember | undefined)[] = project.assigned_members.map(memberId =>
    teamMembers.find(member => member.id === memberId)
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Link to="/projects" className="flex items-center text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsTimeEntryDialogOpen(true)}
            className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2 w-full sm:w-auto"
          >
            <Timer className="h-5 w-5 mr-2" /> Log Time
          </Button>
          <Button
            onClick={handleEditProject}
            className="rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 w-full sm:w-auto"
          >
            <Edit className="h-5 w-5 mr-2" /> Edit Project
          </Button>
          {project.chat_room_id && (
            <Link to="/chat" state={{ activeChatRoomId: project.chat_room_id }} className="w-full sm:w-auto">
              <Button className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 w-full">
                <MessageCircle className="h-5 w-5 mr-2" /> Go to Project Chat
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="w-full max-w-3xl rounded-xl glass-card mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {project.title}
            <Badge className={cn("rounded-full px-3 py-1 text-sm font-medium", getStatusBadgeColor(project.status))}>
              {project.status.replace('-', ' ')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {project.description && (
            <p className="text-lg text-gray-700 leading-relaxed">{project.description}</p>
          )}
          <div className="flex items-center text-lg text-gray-700">
            <CalendarDays className="h-5 w-5 mr-3 text-blue-500" />
            <span>Deadline: {format(new Date(project.deadline), 'PPP')}</span>
          </div>
          <div className="flex items-center text-lg text-gray-700">
            <Hourglass className="h-5 w-5 mr-3 text-purple-500" />
            <span>Created: {format(new Date(project.created_at), 'PPP')}</span>
          </div>
          <div>
            <h5 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Users className="h-5 w-5 mr-3 text-indigo-500" />
              Assigned Team Members:
            </h5>
            <div className="flex flex-wrap gap-3">
              {assignedMemberDetails.length > 0 ? (
                assignedMemberDetails.map((member) => member && (
                  <div key={member.id} className="flex items-center space-x-2 bg-gray-100 rounded-full pr-4 py-2 shadow-sm">
                    <Avatar className="h-9 w-9 border border-gray-200">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-800 text-sm">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-base text-gray-700 font-medium">{member.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-base text-gray-500">No members assigned</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Overview Stats */}
      {/* Removed ProjectOverviewStats component as it was unused */}

      {/* Project Details Tabs */}
      <div className="w-full max-w-3xl mx-auto mb-8">
        <ProjectDetailsTabs
          projectId={project.id}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
        />
      </div>

      <TaskFormDialog
        projectId={project.id}
        task={editingTask}
        isOpen={isTaskFormDialogOpen}
        onClose={handleTaskFormClose}
      />

      {project && (
        <ProjectFormDialog
          project={project}
          isOpen={isProjectEditDialogOpen}
          onClose={handleProjectFormClose}
          onSave={handleProjectFormClose}
        />
      )}

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