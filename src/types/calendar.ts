export interface CalendarEvent {
  id: string;
  title: string;
  date: Date; // The date the event occurs
  type: 'project' | 'task';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  link: string; // Link to project or task details page
}