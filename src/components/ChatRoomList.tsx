import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatRoom } from '@/types/chat'; // Import ChatRoom from shared types

interface ChatRoomListProps {
  chatRooms: ChatRoom[];
  activeChatRoomId: string | null;
  onSelectChatRoom: (id: string) => void;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  chatRooms,
  activeChatRoomId,
  onSelectChatRoom,
}) => {
  return (
    <div className="flex flex-col h-full bg-sidebar rounded-l-xl border-r border-sidebar-border overflow-y-auto">
      <div className="p-4 border-b border-sidebar-border">
        <h3 className="text-xl font-semibold text-sidebar-foreground">Chatrooms</h3>
      </div>
      <div className="flex-grow">
        {chatRooms.map((room) => (
          <div
            key={room.id}
            className={cn(
              "flex items-center p-4 cursor-pointer transition-colors duration-200",
              activeChatRoomId === room.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
            )}
            onClick={() => onSelectChatRoom(room.id)}
          >
            <Avatar className="h-9 w-9 rounded-full border border-sidebar-border">
              <AvatarImage src={room.avatar} alt={room.name} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {room.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3 flex-1">
              <p className="font-medium text-sm">{room.name}</p>
              {room.lastMessage && (
                <p className="text-xs text-muted-foreground truncate">
                  {room.lastSenderName ? `${room.lastSenderName}: ` : ''}
                  {room.lastMessage}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};