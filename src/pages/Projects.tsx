import React from 'react';
import { ProjectList } from '@/components/ProjectList';

const Projects: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full p-4 sm:p-0 bg-background">
      <div className="w-full max-w-7xl">
        <ProjectList />
      </div>
    </div>
  );
};

export default Projects;