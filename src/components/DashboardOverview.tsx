import React from 'react';
import { ProjectList } from '@/components/ProjectList';
import { UpcomingTasksWidget } from '@/components/UpcomingTasksWidget';

export const DashboardOverview: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row items-start justify-center w-full max-w-7xl gap-8 p-4 sm:p-0">
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Dashboard</h2>
        <ProjectList />
      </div>
      <div className="w-full lg:w-1/3">
        <UpcomingTasksWidget />
      </div>
    </div>
  );
};