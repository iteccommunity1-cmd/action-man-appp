import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { Project } from '@/types/project';
import { ProjectCard } from './ProjectCard';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle, Archive, LayoutGrid, AlertCircle } from 'lucide-react';
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
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ProjectStatus = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
type SortOrder = 'newest' | 'oldest' | 'alphabetical';

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
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');

  const queryKey = useMemo(() => ['projects', currentUser?.id, filterStatus, sortOrder, viewTab], [currentUser?.id, filterStatus, sortOrder, viewTab]);

  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: queryKey,
    queryFn: async () => {
      if (!currentUser?.id) throw new Error("User not logged in.");
      
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_archived', viewTab === 'archived');

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side sorting to handle favorites first
      return (data || []).sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        
        if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return a.title.localeCompare(b.title);
      });
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
    if (!projectToDeleteId || !currentUser?.id) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectToDeleteId);
      if (error) throw error;
      showSuccess("Project deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error: any) {
      showError("Failed to delete project: " + error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDeleteId(null);
    }
  };

  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
    try {
      const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
      if (error) throw error;
      showSuccess(`Status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error: any) {
      showError("Failed to update status: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-destructive/50 rounded-2xl bg-destructive/5">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive">Error loading projects</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}>
          Try Again
        </Button>
      </div>
    );
  }

  const projectList = projects || [];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <Tabs value={viewTab} onValueChange={(v: any) => setViewTab(v)} className="w-full sm:w-auto">
          <TabsList className="bg-muted/50 rounded-full p-1">
            <TabsTrigger value="active" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutGrid className="h-4 w-4 mr-2" /> Active
            </TabsTrigger>
            <TabsTrigger value="archived" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Archive className="h-4 w-4 mr-2" /> Archived
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setIsCreateProjectDialogOpen(true)} className="rounded-full bg-primary hover:bg-primary/90 w-full sm:w-auto">
          <PlusCircle className="h-5 w-5 mr-2" /> Create Project
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-end items-center">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-lg border-border bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Sort</Label>
          <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-lg border-border bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {projectList.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed border-border rounded-2xl bg-muted/10">
          <p className="text-lg font-medium">No {viewTab} projects found.</p>
          {viewTab === 'active' && <p className="text-sm mt-1">Start by creating your first project!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectList.map((project) => (
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
        onClose={() => { setIsEditDialogOpen(false); setEditingProject(null); }}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
      />

      <ProjectFormDialog
        isOpen={isCreateProjectDialogOpen}
        onClose={() => setIsCreateProjectDialogOpen(false)}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the project and all its data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="rounded-full bg-destructive text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};