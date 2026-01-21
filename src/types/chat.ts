export interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: string;
  avatar?: string;
  type: 'project' | 'private';
}

export interface Message {
  id: string;
  chat_room_id: string; // Add chat_room_id to link messages to rooms
  sender_id: string; // Changed to snake_case
  sender_name: string; // Changed to snake_case
  sender_avatar?: string; // Changed to snake_case
  content: string;
  timestamp: string;
  created_at: string; // Added for Supabase
}