export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  type?: string; // e.g., 'chat_mention', 'task_update', 'project_deadline'
  related_id?: string; // ID of the related entity (chat room, task, project)
  created_at: string;
}