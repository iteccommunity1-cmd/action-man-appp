import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project, ProjectOverviewStatsProps } from '@/types/project';
import { differenceInMinutes } from 'date-fns';

export const useProjectDetails = (projectId: string | undefined, userId: string | undefined) => {
    const projectQuery = useQuery<Project, Error>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            if (!projectId || !userId) {
                throw new Error("Project ID or user ID is missing.");
            }
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .eq('user_id', userId)
                .single();

            if (error) {
                throw error;
            }
            return data;
        },
        enabled: !!projectId && !!userId,
    });

    const statsQuery = useQuery<ProjectOverviewStatsProps, Error>({
        queryKey: ['projectStats', projectId],
        queryFn: async () => {
            if (!projectId) return {
                totalTasks: 0,
                completedTasks: 0,
                totalMilestones: 0,
                totalGoals: 0,
                totalMetrics: 0,
                totalFiles: 0,
                totalTimeLogged: 0
            };

            const [
                tasksCount,
                completedTasksCount,
                milestonesCount,
                goalsCount,
                metricsCount,
                filesCount,
                timeEntriesData,
            ] = await Promise.all([
                supabase.from('tasks').select('id', { count: 'exact' }).eq('project_id', projectId),
                supabase.from('tasks').select('id', { count: 'exact' }).eq('project_id', projectId).eq('status', 'completed'),
                supabase.from('milestones').select('id', { count: 'exact' }).eq('project_id', projectId),
                supabase.from('goals').select('id', { count: 'exact' }).eq('project_id', projectId),
                supabase.from('metrics').select('id', { count: 'exact' }).eq('project_id', projectId),
                supabase.from('project_files').select('id', { count: 'exact' }).eq('project_id', projectId),
                supabase.from('time_entries').select('start_time, end_time').eq('project_id', projectId),
            ]);

            if (tasksCount.error) throw tasksCount.error;
            if (completedTasksCount.error) throw completedTasksCount.error;
            if (milestonesCount.error) throw milestonesCount.error;
            if (goalsCount.error) throw goalsCount.error;
            if (metricsCount.error) throw metricsCount.error;
            if (filesCount.error) throw filesCount.error;
            if (timeEntriesData.error) throw timeEntriesData.error;

            const totalTimeLoggedMinutes = (timeEntriesData.data || []).reduce((sum, entry) => {
                const start = new Date(entry.start_time);
                const end = new Date(entry.end_time);
                return sum + differenceInMinutes(end, start);
            }, 0);

            return {
                totalTasks: tasksCount.count || 0,
                completedTasks: completedTasksCount.count || 0,
                totalMilestones: milestonesCount.count || 0,
                totalGoals: goalsCount.count || 0,
                totalMetrics: metricsCount.count || 0,
                totalFiles: filesCount.count || 0,
                totalTimeLogged: totalTimeLoggedMinutes / 60,
            };
        },
        enabled: !!projectId,
    });

    return {
        project: projectQuery.data,
        projectStats: statsQuery.data,
        isLoading: projectQuery.isLoading || statsQuery.isLoading,
        isError: projectQuery.isError || statsQuery.isError,
        error: projectQuery.error || statsQuery.error,
    };
};
