export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string;
  action_type: string;
  entity_name?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}