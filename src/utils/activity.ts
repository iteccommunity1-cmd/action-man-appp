import { supabase } from '@/integrations/supabase/client';

interface LogActivityOptions {
  projectId: string;
  userId: string;
  actionType: string;
  entityName?: string;
}

export const logProjectActivity = async ({
  projectId,
  userId,
  actionType,
  entityName,
}: LogActivityOptions) => {
  const { error } = await supabase.from('project_activity').insert({
    project_id: projectId,
    user_id: userId,
    action_type: actionType,
    entity_name: entityName,
  });

  if (error) {
    console.error("[logProjectActivity] Error logging activity:", error);
  }
};