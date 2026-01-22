import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Project } from '@/types/project';
import { ProjectCard } from './ProjectCard';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { ProjectFormDialog } from './ProjectFormDialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { sendNotification } from '@/utils/notifications';
import { useTeamMembers } from '@/hooks/useTeamMembers';

type ProjectStatus = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
type SortOrder = 'newest' | 'oldest';

export const ProjectList: React.FC = () => {
  const { currentUser } = useUser();
  const { teamMembers } = useTeamMembers();
  const queryClient = useQueryClient();

  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Memoize queryKey to ensure its reference stability
  const queryKey = useMemo(() => ['projects', currentUser?.id, filterStatus, sortOrder], [currentUser?.id, filterStatus, sortOrder]);

  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUser.id);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      query = query.order('created_at', { ascending: sortOrder === 'oldest' });

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (!currentUser?.id) return;

    const projectsChannel = supabase
      .channel(`projects_for_user_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const newProject = payload.new as Project;
          queryClient.setQueryData(queryKey, (oldData: Project[] | undefined) => {
            if (!oldData) return [newProject];
            // Apply client-side filtering and sorting for new inserts
            const updatedData = [...oldData, newProject];
            return updatedData
              .filter(p => filterStatus === 'all' || p.status === filterStatus)
              .sort((a, b) => {
                if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const updatedProject = payload.new as Project;
          queryClient.setQueryData(queryKey, (oldData: Project[] | undefined) => {
            if (!oldData) return [];
            const updated = oldData.map(p => p.id === updatedProject.id ? updatedProject : p);
            // Re-apply filtering and sorting after update
            return updated
              .filter(p => filterStatus === 'all' || p.status === filterStatus)
              .sort((a, b) => {
                if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const deletedProject = payload.old as Project;
          queryClient.setQueryData(queryKey, (oldData: Project[] | undefined) => {
            if (!oldData) return [];
            return oldData.filter(p => p.id !== deletedProject.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
    };
  }, [supabase, currentUser?.id, queryClient, queryKey]); // Updated dependencies

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDeleteId || !currentUser?.id) return;

    try {
      // Fetch project details before deleting to get assigned members for notification
      const { data: projectToDelete, error: fetchError } = await supabase
        .from('projects')
        .select('title, assigned_members')
        .eq('id', projectToDeleteId)
        .single();

      if (fetchError) {
        console.error("Error fetching project details for deletion:", fetchError);
        showError("Failed to delete project: Could not retrieve project details.");
        return;
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDeleteId);

      if (error) {
        console.error("Error deleting project:", error);
        showError("Failed to delete project: " + error.message);
      } else {
        showSuccess("Project deleted successfully!");
        // No need to invalidateQueries here, real-time listener will handle it

        // Send notifications to all assigned members (excluding the current user)
        const projectDeleter = currentUser;
        const assignedMembersForNotification = (projectToDelete?.assigned_members || []).filter((memberId: string) => memberId !== projectDeleter.id);

        for (const memberId of assignedMembersForNotification) {
          const member = teamMembers.find(tm => tm.id === memberId);
          if (member) {
            sendNotification({
              userId: member.id,
              message: `${projectDeleter.name} deleted project: "${projectToDelete?.title || 'An unknown project'}".`,
              type: 'project_deletion',
              relatedId: projectToDeleteId, // Still pass the ID even if project is gone
              pushTitle: `Project Deleted: ${projectToDelete?.title || 'An unknown project'}`,
              pushBody: `${projectDeleter.name} deleted "${projectToDelete?.title || 'a project'}".`,
              pushIcon: currentUser.avatar,
              pushUrl: `/projects`, // Redirect to projects list as the project is gone
            });
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error deleting project:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDeleteId(null);
    }
  };

  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
    if (!currentUser?.id) {
      showError("You must be logged in to update project status.");
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', project.id);

      if (error) {
        console.error("Error updating project status:", error);
        showError("Failed to update project status: " + error.message);
      } else {
        showSuccess(`Project status updated to "${newStatus.replace('-', ' ')}"!`);
        // No need to invalidateQueries here, real-time listener will handle it

        // Send notifications to all assigned members (excluding the current user)
        const projectUpdater = currentUser;
        const assignedMembersForNotification = project.assigned_members.filter(memberId => memberId !== projectUpdater.id);

        for (const memberId of assignedMembersForNotification) {
          const member = teamMembers.find(tm => tm.id === memberId);
          if (member) {
            sendNotification({
              userId: member.id,
              message: `${projectUpdater.name} updated the status of project "${project.title}" to "${newStatus.replace('-', ' ')}".`,
              type: 'project_status_update',
              relatedId: project.id,
              pushTitle: `Project Update: ${project.title}`,
              pushBody: `${projectUpdater.name} changed status to "${newStatus.replace('-', ' ')}".`,
              pushIcon: currentUser.avatar,
              pushUrl: `/projects/${project.id}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error updating project status:", error);
      showError("An unexpected error occurred.");
    }
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingProject(null);
    queryClient.invalidateQueries({ queryKey: queryKey }); // Use memoized queryKey
  };

  const handleCreateDialogClose = () => {
    setIsCreateProjectDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKey }); // Use memoized queryKey
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load projects: " + error.message);
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading projects. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
        <h3 className="text-2xl font-bold text-foreground">Your Projects</h3>
        <Button
          onClick={() => setIsCreateProjectDialogOpen(true)}
          className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 w-full sm:w-auto"
        >
          <PlusCircle className="h-5 w-5 mr-2" /> Create New Project
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-end">
        <div className="flex items-center gap-2 w-full sm:w-auto"> {/* Added w-full for mobile */}
          <Label htmlFor="filter-status" className="text-foreground">Filter by Status:</Label>
          <Select value={filterStatus} onValueChange={(value: ProjectStatus) => setFilterStatus(value)}>
            <SelectTrigger id="filter-status" className="w-full sm:w-[180px] rounded-lg border-border bg-input text-foreground hover:bg-input/80"> {/* Adjusted width for mobile */}
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto"> {/* Added w-full for mobile */}
          <Label htmlFor="sort-order" className="text-foreground">Sort by:</Label>
          <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
            <SelectTrigger id="sort-order" className="w-full sm:w-[180px] rounded-lg border-border bg-input text-foreground hover:bg-input/80"> {/* Adjusted width for mobile */}
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {projects!.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg">No projects found matching your criteria.</p>
          <p className="text-sm mt-2">Click "Create New Project" to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Adjusted grid for responsiveness */}
          {projects!.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        project={editingProject}
        isOpen={isEditDialogOpen}
        onClose={handleEditDialogClose}
        onSave={() => queryClient.invalidateQueries({ queryKey: queryKey })}
      />

      <ProjectFormDialog
        isOpen={isCreateProjectDialogOpen}
        onClose={handleCreateDialogClose}
        onSave={() => queryClient.invalidateQueries({ queryKey: queryKey })}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6 bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};