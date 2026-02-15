import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectActivity } from '@/types/activity';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Activity } from 'lucide-react';

interface ProjectActivityFeedProps {
  projectId: string;
}

const getActionMessage = (activity: ProjectActivity) => {
  const name = `${activity.profiles?.first_name} ${activity.profiles?.last_name}`;
  const entity = activity.entity_name ? `"${activity.entity_name}"` : "";

  switch (activity.action_type) {
    case 'task_created': return `${name} created task ${entity}`;
    case 'task_completed': return `${name} completed task ${entity}`;
    case 'task_updated': return `${name} updated task ${entity}`;
    case 'file_uploaded': return `${name} uploaded file ${entity}`;
    case 'file_deleted': return `${name} deleted file ${entity}`;
    case 'comment_added': return `${name} commented on a task`;
    case 'status_changed': return `${name} changed project status to ${entity}`;
    case 'time_logged': return `${name} logged time for ${entity}`;
    default: return `${name} performed an action: ${activity.action_type}`;
  }
};

export const ProjectActivityFeed: React.FC<ProjectActivityFeedProps> = ({ projectId }) => {
  const { data: activities, isLoading } = useQuery<ProjectActivity[], Error>({
    queryKey: ['projectActivity', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity')
        .select('*, profiles(first_name, last_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h4 className="text-lg font-bold text-foreground">Recent Activity</h4>
      </div>

      {activities?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex gap-3 items-start">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={activity.profiles?.avatar_url} />
                <AvatarFallback>{activity.profiles?.first_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <p className="text-sm text-foreground leading-tight">
                  {getActionMessage(activity)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};