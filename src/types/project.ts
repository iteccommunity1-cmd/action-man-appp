export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  assigned_members: string[];
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  chat_room_id?: string;
  created_at: string;
  is_archived: boolean; // New field
  is_favorite: boolean; // New field
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  created_at: string;
}

export interface Goal {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  due_date?: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'at_risk' | 'failed';
  created_at: string;
}

export interface Metric {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  type: 'kpi' | 'business_metric' | 'tech_metric';
  target_value?: number;
  current_value?: number;
  unit?: string;
  last_updated?: string;
  created_at: string;
}

export interface ProjectOverviewStatsProps {
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  totalGoals: number;
  totalMetrics: number;
  totalFiles: number;
  totalTimeLogged: number;
}