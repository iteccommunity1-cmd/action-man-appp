export interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: string;
  avatar?: string;
  type: 'project' | 'private';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
}