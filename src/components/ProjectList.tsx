import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useUser } from '@/contexts/UserContext';
import { Project } from '@/types/project';
import { ProjectCard } from './ProjectCard';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { ProjectFormDialog } from './ProjectFormDialog'; // Import the new unified dialog
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

type ProjectStatus = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
type SortOrder = 'newest' | 'oldest';

export const ProjectList: React.FC = () => {
  const { supabase } = useSupabase();
  const { currentUser } = useUser();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ['projects', currentUser?.id, filterStatus, sortOrder],
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
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-end">
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-status" className="text-gray-700">Filter by Status:</Label>
          <Select value={filterStatus} onValueChange={(value: ProjectStatus) => setFilterStatus(value)}>
            <SelectTrigger id="filter-status" className="w-[180px] rounded-lg border-gray-300">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-md">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="sort-order" className="text-gray-700">Sort by:</Label>
          <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
            <SelectTrigger id="sort-order" className="w-[180px] rounded-lg border-gray-300">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-md">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {projects!.length === 0 ? (
        <div className="text-center text-gray-500 p-8 border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <p className="text-lg">No projects found matching your criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters or create a new project!</p>
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

      <ProjectFormDialog
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