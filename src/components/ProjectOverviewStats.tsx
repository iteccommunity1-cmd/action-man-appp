import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Flag, Target, Gauge, FileText, Clock } from 'lucide-react'; 

interface ProjectOverviewStatsProps {
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  totalGoals: number;
  totalMetrics: number;
  totalFiles: number;
  totalTimeLogged: number; // in hours
}

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <Card className="rounded-xl glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          <ListTodo className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalTasks}</div>
          <p className="text-xs text-muted-foreground mt-1">{completedTasks} completed</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Milestones</CardTitle>
          <Flag className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalMilestones}</div>
          <p className="text-xs text-muted-foreground mt-1">Key project phases</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Goals</CardTitle>
          <Target className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalGoals}</div>
          <p className="text-xs text-muted-foreground mt-1">Strategic objectives</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Metrics</CardTitle>
          <Gauge className="h-5 w-5 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalMetrics}</div>
          <p className="text-xs text-muted-foreground mt-1">Tracked KPIs</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Files</CardTitle>
          <FileText className="h-5 w-5 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalFiles}</div>
          <p className="text-xs text-muted-foreground mt-1">Attached documents</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Time Logged</CardTitle>
          <Clock className="h-5 w-5 text-teal-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{formatTime(totalTimeLogged)}</div>
          <p className="text-xs text-muted-foreground mt-1">Total effort recorded</p>
        </CardContent>
      </Card>
    </div>
  );
};