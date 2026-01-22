import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from './TaskList';
import { MilestoneList } from './MilestoneList';
import { GoalList } from './GoalList';
import { MetricList } from './MetricList';
import { ProjectFilesList } from './ProjectFilesList';
import { Task } from '@/types/task';

interface ProjectDetailsTabsProps {
  projectId: string;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

export const ProjectDetailsTabs: React.FC<ProjectDetailsTabsProps> = ({
  projectId,
  onAddTask,
  onEditTask,
}) => {
  const [activeTab, setActiveTab] = useState("tasks");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-lg p-1 mb-6">
        <TabsTrigger value="tasks" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">Tasks</TabsTrigger>
        <TabsTrigger value="milestones" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">Milestones</TabsTrigger>
        <TabsTrigger value="goals" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">Goals</TabsTrigger>
        <TabsTrigger value="metrics" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">Metrics</TabsTrigger>
        <TabsTrigger value="files" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200">Files</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks">
        <TaskList projectId={projectId} onAddTask={onAddTask} onEditTask={onEditTask} />
      </TabsContent>
      <TabsContent value="milestones">
        <MilestoneList projectId={projectId} />
      </TabsContent>
      <TabsContent value="goals">
        <GoalList projectId={projectId} />
      </TabsContent>
      <TabsContent value="metrics">
        <MetricList projectId={projectId} />
      </TabsContent>
      <TabsContent value="files">
        <ProjectFilesList projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
};