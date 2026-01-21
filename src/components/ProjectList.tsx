import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useUser } from '@/contexts/UserContext';
import { Project } from '@/types/project';
import { ProjectCard } from './ProjectCard';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { ProjectEditDialog } from './ProjectEditDialog';
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

export const ProjectList: React.FC = () => {
  const { supabase } = useSupabase();
  const { currentUser } = useUser();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ['projects', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDeleteId) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDeleteId);

      if (error) {
        console.error("Error deleting project:", error);
        showError("Failed to delete project: " + error.message);
      } else {
        showSuccess("Project deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['projects'] }); // Refresh the list
      }
    } catch (error) {
      console.error("Unexpected error deleting project:", error);
      showError("An unexpected error occurred.");
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDeleteId(null);
    }
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingProject(null);
    queryClient.invalidateQueries({ queryKey: ['projects'] }); // Refresh the list after edit
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-lg text-gray-600">Loading projects...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load projects: " + error.message);
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error loading projects. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Your Projects</h3>
      {projects!.length === 0 ? (
        <div className="text-center text-gray-500 p-8 border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <p className="text-lg">You haven't created any projects yet.</p>
          <p className="text-sm mt-2">Use the form above to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects!.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}

      <ProjectEditDialog
        project={editingProject}
        isOpen={isEditDialogOpen}
        onClose={handleDialogClose}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-800">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. This will permanently delete your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-lg px-4 py-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};