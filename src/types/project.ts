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