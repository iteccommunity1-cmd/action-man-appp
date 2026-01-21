import React, { useState } from 'react';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';
import { teamMembers } from '@/data/teamMembers'; // Using existing team members for avatars
import { ChatRoom, Message } from '@/types/chat'; // Import ChatRoom and Message from shared types

// Dummy data for chat rooms and messages
const dummyChatRooms: ChatRoom[] = [
  { id: "project-1", name: "Marketing Website Redesign", lastMessage: "Alice: Sounds good!", avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Project1", type: 'project' },
  { id: "project-2", name: "Mobile App Development", lastMessage: "Bob: Meeting at 2 PM.", avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Project2", type: 'project' },
  { id: "private-1", name: "Alice Johnson", lastMessage: "Hey, can we chat?", avatar: teamMembers.find(m => m.id === "1")?.avatar, type: 'private' },
  { id: "private-2", name: "Bob Smith", lastMessage: "Got it, thanks!", avatar: teamMembers.find(m => m.id === "2")?.avatar, type: 'private' },
];

const dummyMessages: { [key: string]: Message[] } = {
  "project-1": [
    { id: "msg1", senderId: "1", senderName: "Alice Johnson", senderAvatar: teamMembers.find(m => m.id === "1")?.avatar, content: "Hi team, let's discuss the new design mockups.", timestamp: "2023-10-27T10:00:00Z" },
    { id: "msg2", senderId: "current-user", senderName: "You", senderAvatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=CurrentUser", content: "Sure, I'm ready!", timestamp: "2023-10-27T10:05:00Z" },
    { id: "msg3", senderId: "3", senderName: "Charlie Brown", senderAvatar: teamMembers.find(m => m.id === "3")?.avatar, content: "Sounds good!", timestamp: "2023-10-27T10:10:00Z" },
  ],
  "project-2": [
    { id: "msg4", senderId: "2", senderName: "Bob Smith", senderAvatar: teamMembers.find(m => m.id === "2")?.avatar, content: "Meeting at 2 PM to review the sprint.", timestamp: "2023-10-27T11:00:00Z" },
    { id: "msg5", senderId: "current-user", senderName: "You", senderAvatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=CurrentUser", content: "Acknowledged.", timestamp: "2023-10-27T11:02:00Z" },
  ],
  "private-1": [
    { id: "msg6", senderId: "1", senderName: "Alice Johnson", senderAvatar: teamMembers.find(m => m.id === "1")?.avatar, content: "Hey, can we chat about the marketing strategy?", timestamp: "2023-10-27T12:00:00Z" },
    { id: "msg7", senderId: "current-user", senderName: "You", senderAvatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=CurrentUser", content: "Yes, I'm free now.", timestamp: "2023-10-27T12:01:00Z" },
  ],
  "private-2": [
    { id: "msg8", senderId: "current-user", senderName: "You", senderAvatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=CurrentUser", content: "Did you get the report?", timestamp: "2023-10-27T13:00:00Z" },
    { id: "msg9", senderId: "2", senderName: "Bob Smith", senderAvatar: teamMembers.find(m => m.id === "2")?.avatar, content: "Got it, thanks!", timestamp: "2023-10-27T13:05:00Z" },
  ],
};

export const ChatLayout: React.FC = () => {
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(dummyChatRooms[0]?.id || null);
  const [currentMessages, setCurrentMessages] = useState(dummyMessages);

  const activeChatRoom = dummyChatRooms.find((room) => room.id === activeChatRoomId);

  const handleSendMessage = (content: string) => {
    if (activeChatRoomId) {
      const newMessage: Message = { // Explicitly type newMessage
        id: `msg-${Date.now()}`,
        senderId: "current-user", // Placeholder for current user ID
        senderName: "You", // Placeholder for current user name
        senderAvatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=CurrentUser", // Placeholder avatar
        content,
        timestamp: new Date().toISOString(),
      };
      setCurrentMessages((prevMessages) => ({
        ...prevMessages,
        [activeChatRoomId]: [...(prevMessages[activeChatRoomId] || []), newMessage],
      }));
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[900px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200">
      <div className="w-1/3 min-w-[280px] max-w-[350px] flex-shrink-0">
        <ChatRoomList
          chatRooms={dummyChatRooms}
          activeChatRoomId={activeChatRoomId}
          onSelectChatRoom={setActiveChatRoomId}
        />
      </div>
      <div className="flex-grow">
        {activeChatRoom ? (
          <ChatWindow
            chatRoomName={activeChatRoom.name}
            messages={currentMessages[activeChatRoomId] || []}
            onSendMessage={handleSendMessage}
            currentUserId="current-user" // Placeholder for current user ID
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-lg">
            Select a chatroom to start messaging
          </div>
        )}
      </div>
    </div>
  );
};