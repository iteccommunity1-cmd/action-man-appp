import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Flag, Target, Gauge, FileText, Clock } from 'lucide-react';
import { ProjectOverviewStatsProps } from '@/types/project';

export const ProjectOverviewStats: React.FC<ProjectOverviewStatsProps> = ({
  totalTasks,
  completedTasks,
  totalMilestones,
  totalGoals,
  totalMetrics,
  totalFiles,
  totalTimeLogged,
}) => {
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const stats = [
    { label: "Tasks", value: totalTasks, sub: `${completedTasks} done`, icon: ListTodo, color: "text-primary" },
    { label: "Milestones", value: totalMilestones, sub: "Phases", icon: Flag, color: "text-blue-500" },
    { label: "Goals", value: totalGoals, sub: "Objectives", icon: Target, color: "text-green-500" },
    { label: "Metrics", value: totalMetrics, sub: "KPIs", icon: Gauge, color: "text-purple-500" },
    { label: "Files", value: totalFiles, sub: "Docs", icon: FileText, color: "text-orange-500" },
    { label: "Time", value: formatTime(totalTimeLogged), sub: "Logged", icon: Clock, color: "text-teal-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-xl glass-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </CardTitle>
            <stat.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", stat.color)} />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{stat.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};