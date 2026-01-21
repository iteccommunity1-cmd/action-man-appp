import { useState } from 'react';
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { ProjectList } from "@/components/ProjectList";
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const Index = () => {
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] }); // Refresh project list
    setIsCreateProjectDialogOpen(false);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-7xl flex justify-end mb-6">
        <Button
          onClick={() => setIsCreateProjectDialogOpen(true)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4"
        >
          <PlusCircle className="h-5 w-5 mr-2" /> Create New Project
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl gap-8">
        {/* The ProjectFormDialog will open as a modal, so no need for a dedicated column for it here */}
        <div className="w-full">
          <ProjectList />
        </div>
      </div>

      <ProjectFormDialog
        isOpen={isCreateProjectDialogOpen}
        onClose={() => setIsCreateProjectDialogOpen(false)}
        onSave={handleProjectCreated}
      />
    </div>
  );
};

export default Index;