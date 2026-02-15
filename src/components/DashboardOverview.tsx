import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { ProjectList } from '@/components/ProjectList';
import { UpcomingTasksWidget } from '@/components/UpcomingTasksWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LayoutDashboard, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { isPast } from 'date-fns';
import { ProjectTaskCalendar } from './ProjectTaskCalendar';
import { CalendarEvent } from '@/types/calendar';
import { ProjectStatusChart } from './ProjectStatusChart';
import { WelcomeCard } from './WelcomeCard';
import { ProjectCard } from './ProjectCard';
import { Project } from '@/types/project';

export const DashboardOverview: React.FC = () => {
  const { currentUser, isLoadingUser } = useUser();

  const { data: dashboardData, isLoading: isLoadingDashboard, isError: isDashboardError, error: dashboardError } = useQuery<{
    totalProjects: number;
    completedProjects: number;
    overdueTasks: number;
    calendarEvents: CalendarEvent[];
    projectStatusCounts: { name: string; value: number; color: string }[];
    favoriteProjects: Project[];
  }, Error>({
    queryKey: ['dashboardData', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error("User not logged in.");

      const [projectsRes, tasksRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', currentUser.id),
        supabase.from('tasks').select('*').or(`user_id.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`)
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];

      const totalProjects = projects.filter(p => !p.is_archived).length;
      const completedProjects = projects.filter(p => p.status === 'completed' && !p.is_archived).length;
      const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length;

      const calendarEvents: CalendarEvent[] = [
        ...projects.filter(p => !p.is_archived).map(p => ({
          id: p.id,
          title: p.title,
          date: new Date(p.deadline),
          type: 'project' as const,
          status: p.status,
          link: `/projects/${p.id}`
        })),
        ...tasks.filter(t => t.due_date).map(t => ({
          id: t.id,
          title: t.title,
          date: new Date(t.due_date!),
          type: 'task' as const,
          status: t.status,
          link: `/projects/${t.project_id}`
        }))
      ];

      const statusCounts = projects.filter(p => !p.is_archived).reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const projectStatusColors: Record<string, string> = {
        'pending': '#FBBF24',
        'in-progress': '#3B82F6',
        'completed': '#10B981',
        'overdue': '#EF4444',
      };

      const projectStatusChartData = Object.entries(statusCounts).map(([status, value]) => ({
        name: status.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value,
        color: projectStatusColors[status] || '#9CA3AF',
      }));

      return {
        totalProjects,
        completedProjects,
        overdueTasks,
        calendarEvents,
        projectStatusCounts: projectStatusChartData,
        favoriteProjects: projects.filter(p => p.is_favorite && !p.is_archived),
      };
    },
    enabled: !!currentUser?.id && !isLoadingUser,
  });

  if (isLoadingUser || isLoadingDashboard) {
    return (
      <div className="flex items-center justify-center w-full p-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-7xl gap-8 p-4 sm:p-0">
      <WelcomeCard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <Card className="rounded-2xl glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Projects</CardTitle>
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.totalProjects}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.completedProjects}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.overdueTasks}</div>
          </CardContent>
        </Card>
        <UpcomingTasksWidget />
      </div>

      {dashboardData?.favoriteProjects && dashboardData.favoriteProjects.length > 0 && (
        <div className="w-full space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-current" />
            <h3 className="text-2xl font-bold">Favorite Projects</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.favoriteProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onEdit={() => {}} 
                onDelete={() => {}} 
                onStatusChange={() => {}} 
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        <div className="lg:col-span-2">
          <ProjectTaskCalendar events={dashboardData?.calendarEvents || []} />
        </div>
        <div className="lg:col-span-1">
          <ProjectStatusChart data={dashboardData?.projectStatusCounts || []} />
        </div>
      </div>

      <div className="w-full">
        <ProjectList />
      </div>
    </div>
  );
};