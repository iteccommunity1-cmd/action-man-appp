import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from './TaskList';
import { MilestoneList } from './MilestoneList';
import { GoalList } from './GoalList';
import { MetricList } from './MetricList';
import { ProjectFilesList } from './ProjectFilesList';
import { TimeEntryList } from './TimeEntryList'; // Import TimeEntryList
import { Task } from '@/types/task';
import { Card, CardContent } from '@/components/ui/card'; // Import Card components

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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
      <div className="flex justify-center">
        <TabsList className="flex flex-wrap h-auto items-center gap-2 bg-white/5 p-2 rounded-3xl border border-white/10 backdrop-blur-xl">
          {[
            { value: "tasks", label: "Operations" },
            { value: "milestones", label: "Milestones" },
            { value: "goals", label: "Objectives" },
            { value: "metrics", label: "Analytics" },
            { value: "files", label: "Intelligence" },
            { value: "time", label: "Temporal" }
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-2xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:text-foreground/80"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="relative group/tabs">
        <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[2.5rem] blur-xl opacity-0 group-hover/tabs:opacity-100 transition-opacity duration-700" />
        <Card className="relative rounded-[2rem] border-none ring-1 ring-white/10 glass-card shadow-2xl overflow-hidden transition-all duration-500">
          <CardContent className="p-8">
            <TabsContent value="tasks" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
              <TaskList projectId={projectId} onAddTask={onAddTask} onEditTask={onEditTask} />
            </TabsContent>
            <TabsContent value="milestones" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
              <MilestoneList projectId={projectId} />
            </TabsContent>
            <TabsContent value="goals" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
              <GoalList projectId={projectId} />
            </TabsContent>
            <TabsContent value="metrics" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
              <MetricList projectId={projectId} />
            </TabsContent>
            <TabsContent value="files" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
              <ProjectFilesList projectId={projectId} />
            </TabsContent>
            <TabsContent value="time" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
              <TimeEntryList projectId={projectId} />
            </TabsContent>
          </CardContent>
        </Card>
      </div>
    </Tabs>
  );
};