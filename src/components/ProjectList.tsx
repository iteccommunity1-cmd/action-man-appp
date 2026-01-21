import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useUser } from '@/contexts/UserContext';
import { Project } from '@/types/project';
import { ProjectCard } from './ProjectCard';
import { showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

export const ProjectList: React.FC = () => {
  const { supabase } = useSupabase();
  const { currentUser } = useUser();

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
    enabled: !!currentUser?.id, // Only run query if currentUser.id exists
  });

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
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};