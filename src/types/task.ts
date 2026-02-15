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
  priority?: number; // New: Task priority (e.g., 0 for low, 1 for medium, 2 for high, 3 for urgent)
}