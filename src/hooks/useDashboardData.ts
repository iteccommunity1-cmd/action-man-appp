import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { isPast } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';

export interface DashboardData {
  totalProjects: number;
  completedProjects: number;
  overdueTasks: number;
  calendarEvents: CalendarEvent[];
  projectStatusCounts: { name: string; value: number; color: string }[];
}

export const useDashboardData = () => {
  const { currentUser, isLoadingUser } = useUser();

  return useQuery<DashboardData, Error>({
    queryKey: ['dashboardData', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not logged in.");
      }

      // Fetch total and completed projects simultaneously
      const [projectsResult, tasksResult] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title, deadline, status')
          .eq('user_id', currentUser.id),
        supabase
          .from('tasks')
          .select('id, title, due_date, status, project_id')
          .or(`user_id.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`)
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;

      const projectsData = projectsResult.data || [];
      const tasksData = tasksResult.data || [];

      const totalProjects = projectsData.length;
      const completedProjects = projectsData.filter(p => p.status === 'completed').length;
      
      const overdueTasks = tasksData.filter(task =>
        task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed'
      ).length;

      const calendarEvents: CalendarEvent[] = [];

      projectsData.forEach(project => {
        if (project.deadline) {
          calendarEvents.push({
            id: project.id,
            title: project.title,
            date: new Date(project.deadline),
            type: 'project',
            status: project.status,
            link: `/projects/${project.id}`
          });
        }
      });

      tasksData.forEach(task => {
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
      const statusCounts = projectsData.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const projectStatusColors: Record<string, string> = {
        'pending': '#FBBF24',
        'in-progress': '#3B82F6',
        'completed': '#10B981',
        'overdue': '#EF4444',
      };

      const projectStatusCounts = Object.entries(statusCounts).map(([status, value]) => ({
        name: status.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value,
        color: projectStatusColors[status] || '#9CA3AF',
      }));

      return {
        totalProjects,
        completedProjects,
        overdueTasks,
        calendarEvents,
        projectStatusCounts,
      };
    },
    enabled: !!currentUser?.id && !isLoadingUser,
  });
};
