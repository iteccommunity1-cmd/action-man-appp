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
import { ProjectTaskCalendar } from './ProjectTaskCalendar'; // Import the new calendar component
import { CalendarEvent } from '@/types/calendar'; // Import the new CalendarEvent type

export const DashboardOverview: React.FC = () => {
  const { currentUser, isLoadingUser } = useUser();

  const { data: dashboardData, isLoading: isLoadingDashboard, isError: isDashboardError, error: dashboardError } = useQuery<{
    totalProjects: number;
    completedProjects: number;
    overdueTasks: number;
    calendarEvents: CalendarEvent[];
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

      // Fetch all projects for calendar
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

      return {
        totalProjects: totalProjectsCount || 0,
        completedProjects: completedProjectsCount || 0,
        overdueTasks: overdueTasksCount,
        calendarEvents,
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
    <div className="flex flex-col items-center w-full max-w-7xl gap-8 p-4 sm:p-0"> {/* Adjusted padding for mobile */}
      <div className="w-full bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-4">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Hello, {currentUser?.name || 'User'}!
        </h2>
        <p className="text-lg text-gray-600">Here's a quick overview of your progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
        <Card className="rounded-xl shadow-md border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Projects</CardTitle>
            <LayoutDashboard className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData?.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">All projects you've created</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-md border-gray-200 bg-gradient-to-br from-green-50 to-teal-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Completed Projects</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData?.completedProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Projects marked as finished</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-md border-gray-200 bg-gradient-to-br from-red-50 to-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dashboardData?.overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks past their due date</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Calendar</h3>
        <ProjectTaskCalendar events={dashboardData?.calendarEvents || []} />
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center w-full gap-8">
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          <h3 className="text-2xl font-bold text-gray-800">Your Projects</h3>
          <ProjectList />
        </div>
        <div className="w-full lg:w-1/3">
          <UpcomingTasksWidget />
        </div>
      </div>
    </div>
  );
};