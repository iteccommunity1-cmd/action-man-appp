export interface Task {
  id: string;
  project_id: string;
  user_id: string; // User who created the task
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  assigned_to?: string; // ID of the user assigned to the task
  due_date?: string; // ISO date string
  created_at: string; // ISO date string
}