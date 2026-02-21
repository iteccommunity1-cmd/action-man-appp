import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { Milestone, Goal } from '@/types/project';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export interface AnalyticsData {
    taskStatusDistribution: { name: string; value: number; color: string }[];
    taskVelocityData: { date: string; completed: number }[];
    memberPerformanceData: { name: string; tasks: number }[];
    projectProgressData: { name: string; progress: number }[];
    overviewStats: {
        totalTasks: number;
        completionRate: number;
        activeMilestones: number;
        goalsAchieved: number;
    };
}

export const useAnalyticsData = () => {
    const { currentUser, isLoadingUser } = useUser();

    return useQuery<AnalyticsData, Error>({
        queryKey: ['analyticsData', currentUser?.id],
        queryFn: async () => {
            if (!currentUser?.id) {
                throw new Error("User not logged in.");
            }

            // Fetch all required data in parallel
            const [projectsRes, tasksRes, milestonesRes, goalsRes, profilesRes] = await Promise.all([
                supabase.from('projects').select('*').eq('user_id', currentUser.id),
                supabase.from('tasks').select('*').or(`user_id.eq.${currentUser.id},assigned_to.eq.${currentUser.id}`),
                supabase.from('milestones').select('*'),
                supabase.from('goals').select('*'),
                supabase.from('profiles').select('id, first_name, last_name')
            ]);

            if (projectsRes.error) throw projectsRes.error;
            if (tasksRes.error) throw tasksRes.error;
            if (milestonesRes.error) throw milestonesRes.error;
            if (profilesRes.error) throw profilesRes.error;

            const projects = projectsRes.data || [];
            const tasks = tasksRes.data || [];
            const milestones = milestonesRes.data || [];
            const goals = goalsRes.data || [];
            const profiles = profilesRes.data || [];

            // 1. Task Status Distribution
            const statusCounts = tasks.reduce((acc: Record<string, number>, task: Task) => {
                acc[task.status] = (acc[task.status] || 0) + 1;
                return acc;
            }, {});

            const statusColors: Record<string, string> = {
                'pending': '#FBBF24',
                'in-progress': '#3B82F6',
                'completed': '#10B981',
                'overdue': '#EF4444',
            };

            const taskStatusDistribution = Object.entries(statusCounts).map(([status, value]) => ({
                name: status.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                value,
                color: statusColors[status] || '#9CA3AF'
            }));

            // 2. Task Velocity (Last 30 days)
            const now = new Date();
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

            const completedTasks = tasks.filter((t: Task) => t.status === 'completed' && t.due_date);
            const taskVelocityData = days.map(day => {
                const count = completedTasks.filter((t: Task) => isSameDay(new Date(t.due_date!), day)).length;
                return {
                    date: format(day, 'MMM dd'),
                    completed: count
                };
            });

            // 3. Member Performance (Tasks assigned)
            const memberTasks = tasks.reduce((acc: Record<string, number>, task: Task) => {
                if (task.assigned_to) {
                    acc[task.assigned_to] = (acc[task.assigned_to] || 0) + 1;
                }
                return acc;
            }, {});

            const memberPerformanceData = Object.entries(memberTasks).map(([userId, count]) => {
                const profile = profiles.find((p: { id: string; first_name: string; last_name: string }) => p.id === userId);
                return {
                    name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
                    tasks: count
                };
            });

            // 4. Project Progress
            const projectProgressData = projects.map((project: { id: string; title: string }) => {
                const projectTasks = tasks.filter((t: Task) => t.project_id === project.id);
                const total = projectTasks.length;
                const completed = projectTasks.filter((t: Task) => t.status === 'completed').length;
                return {
                    name: project.title,
                    progress: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            });

            // 5. Overview Stats
            const totalTasks = tasks.length;
            const completedCount = tasks.filter((t: Task) => t.status === 'completed').length;
            const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
            const activeMilestones = milestones.filter((m: Milestone) => m.status === 'pending').length;
            const goalsAchieved = goals.filter((g: Goal) => g.status === 'achieved').length;

            return {
                taskStatusDistribution,
                taskVelocityData,
                memberPerformanceData,
                projectProgressData,
                overviewStats: {
                    totalTasks,
                    completionRate,
                    activeMilestones,
                    goalsAchieved
                }
            };
        },
        enabled: !!currentUser?.id && !isLoadingUser
    });
};
