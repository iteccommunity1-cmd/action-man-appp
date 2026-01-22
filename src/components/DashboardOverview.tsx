import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { ProjectList } from '@/components/ProjectList';
import { UpcomingTasksWidget } from '@/components/UpcomingTasksWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LayoutDashboard, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { isPast } from 'date-fns';
import { ProjectTaskCalendar } from './ProjectTaskCalendar';
import { CalendarEvent } from '@/types/calendar';
import { ProjectStatusChart } from './ProjectStatusChart';
import { WelcomeCard } from './WelcomeCard'; // Import the new WelcomeCard

export const DashboardOverview: React.FC = () => {
  const { currentUser, isLoadingUser } = useUser();

  const { data: dashboardData, isLoading: isLoadingDashboard, isError: isDashboardError, error: dashboardError } = useQuery<{
    totalProjects: number;
    completedProjects: number;
    overdueTasks: number;
    calendarEvents: CalendarEvent[];
    projectStatusCounts: { name: string; value: number; color: string }[];
  }, Error>({
    queryKey: ['dashboardData', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }

      // Fetch total projects
      const { count: totalProjectsCount, error: projectsCountError } = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUser.id);

      if (projectsCountError) throw projectsCountError;

      // Fetch completed projects
      const { count: completedProjectsCount, error: completedProjectsError } = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUser.id)
        .eq('status', 'completed');

      if (completedProjectsError) throw completedProjectsError;

      // Fetch all projects for calendar and status chart
      const { data: projectsData, error: projectsDataError } = await supabase
        .from('projects')
        .select('id, title, deadline, status')
        .eq('user_id', currentUser.id);

      if (projectsDataError) throw projectsDataError;

      // Fetch all tasks for calendar and overdue calculation
      const { data: tasksData, error: tasksDataError } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, project_id')
        .or(`user_id.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`);

      if (tasksDataError) throw tasksDataError;

      const overdueTasksCount = (tasksData || []).filter(task =>
        task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed'
      ).length;

      const calendarEvents: CalendarEvent[] = [];

      (projectsData || []).forEach(project => {
        calendarEvents.push({
          id: project.id,
          title: project.title,
          date: new Date(project.deadline),
          type: 'project',
          status: project.status,
          link: `/projects/${project.id}`
        });
      });

      (tasksData || []).forEach(task => {
        if (task.due_date) {
          calendarEvents.push({
            id: task.id,
            title: task.title,
            date: new Date(task.due_date),
            type: 'task',
            status: task.status,
            link: `/projects/${task.project_id}`
          });
        }
      });

      // Aggregate project statuses for the chart
      const statusCounts = (projectsData || []).reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const projectStatusColors: Record<string, string> = {
        'pending': '#FBBF24', // Yellow
        'in-progress': '#3B82F6', // Blue
        'completed': '#10B981', // Green
        'overdue': '#EF4444', // Red
      };

      const projectStatusChartData = Object.entries(statusCounts).map(([status, value]) => ({
        name: status.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value,
        color: projectStatusColors[status] || '#9CA3AF', // Default gray
      }));


      return {
        totalProjects: totalProjectsCount || 0,
        completedProjects: completedProjectsCount || 0,
        overdueTasks: overdueTasksCount,
        calendarEvents,
        projectStatusCounts: projectStatusChartData,
      };
    },
    enabled: !!currentUser?.id && !isLoadingUser,
  });

  if (isLoadingUser || isLoadingDashboard) {
    return (
      <div className="flex items-center justify-center w-full max-w-7xl mx-auto p-8 min-h-[400px] bg-white rounded-xl shadow-lg border border-gray-200">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="ml-4 text-xl text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (isDashboardError) {
    showError("Failed to load dashboard statistics: " + dashboardError.message);
    return (
      <div className="flex items-center justify-center w-full max-w-7xl mx-auto p-8 min-h-[400px] bg-white rounded-xl shadow-lg border border-gray-200">
        <p className="text-xl text-red-600">Error loading dashboard statistics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-7xl gap-6 p-4 sm:p-0"> {/* Adjusted gap */}
      <WelcomeCard /> {/* Replaced static welcome message with dynamic WelcomeCard */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"> {/* Bento grid layout */}
        {/* KPI Cards */}
        <Card className="rounded-xl glass-card col-span-1"> {/* Applied glass-card */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Projects</CardTitle>
            <LayoutDashboard className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData?.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">All projects you've created</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl glass-card col-span-1"> {/* Applied glass-card */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Completed Projects</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData?.completedProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Projects marked as finished</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl glass-card col-span-1"> {/* Applied glass-card */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData?.overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks past their due date</p>
          </CardContent>
        </Card>
        <div className="col-span-1 md:col-span-2 lg:col-span-1"> {/* Adjusted span for better flow */}
          <UpcomingTasksWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full"> {/* Bento grid for charts and calendar */}
        <div className="lg:col-span-2">
          <ProjectTaskCalendar events={dashboardData?.calendarEvents || []} />
        </div>
        <div className="lg:col-span-1">
          <ProjectStatusChart data={dashboardData?.projectStatusCounts || []} />
        </div>
      </div>

      <div className="w-full">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Projects</h3>
        <ProjectList />
      </div>
    </div>
  );
};