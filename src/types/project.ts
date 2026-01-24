export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface Project {
  id: string;
  user_id: string; // Added to link to the creating user
  title: string;
  description?: string; // New: Project description
  assigned_members: string[]; // Changed to string[] to match TEXT[] in Supabase
  deadline: string; // Changed to string to handle ISO date strings from Supabase
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  chat_room_id?: string; // New: Link to associated chat room
  created_at: string; // Changed to string to handle ISO date strings from Supabase
}

// New types for Milestones, Goals, and Metrics
export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string; // ISO date string
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
  unit?: string; // e.g., 'users', 'revenue', '%'
  due_date?: string; // ISO date string
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
  last_updated?: string; // ISO date string
  created_at: string;
}

export interface ProjectOverviewStatsProps {
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  totalGoals: number;
  totalMetrics: number;
  totalFiles: number;
  totalTimeLogged: number; // in hours
}