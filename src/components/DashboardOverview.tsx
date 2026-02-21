import React from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { ProjectList } from '@/components/ProjectList';
import { UpcomingTasksWidget } from '@/components/UpcomingTasksWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LayoutDashboard, CheckCircle, AlertTriangle } from 'lucide-react';
import { showError } from '@/utils/toast';
import { ProjectTaskCalendar } from './ProjectTaskCalendar';
import { ProjectStatusChart } from './ProjectStatusChart';
import { WelcomeCard } from './WelcomeCard';

export const DashboardOverview: React.FC = () => {
  const { data: dashboardData, isLoading, isError, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-7xl mx-auto p-12 min-h-[400px] glass-card rounded-2xl animate-fade-in-up">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-medium text-muted-foreground">Preparing your dashboard...</p>
      </div>
    );
  }

  if (isError) {
    showError("Failed to load dashboard statistics: " + error.message);
    return (
      <div className="flex items-center justify-center w-full max-w-7xl mx-auto p-8 min-h-[400px] glass-card rounded-2xl border-destructive/50">
        <p className="text-xl font-semibold text-destructive">Error loading dashboard statistics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-7xl gap-8 p-4 sm:p-0 animate-fade-in-up">
      <WelcomeCard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {/* KPI Cards */}
        <Card className="rounded-2xl glass-card border-none ring-1 ring-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Projects</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-primary glow-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{dashboardData?.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Active initiatives</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl glass-card border-none ring-1 ring-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Completed</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{dashboardData?.completedProjects}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Successfully finished</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl glass-card border-none ring-1 ring-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Overdue</CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-foreground">{dashboardData?.overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Requires attention</p>
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <UpcomingTasksWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        <div className="lg:col-span-2">
          <ProjectTaskCalendar events={dashboardData?.calendarEvents || []} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <ProjectStatusChart data={dashboardData?.projectStatusCounts || []} />
        </div>
      </div>

      <div className="w-full mt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-1 bg-primary rounded-full" />
          <h3 className="text-3xl font-black text-foreground tracking-tight">Your Projects</h3>
        </div>
        <ProjectList />
      </div>
    </div>
  );
};