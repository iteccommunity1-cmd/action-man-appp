import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatRoom } from '@/types/chat';

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
    <div className="flex flex-col h-full bg-transparent overflow-y-auto">
      <div className="p-6 border-b border-white/5">
        <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Conversations</h3>
      </div>
      <div className="flex-grow py-2">
        {chatRooms.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-xs text-muted-foreground italic">No conversations found</p>
          </div>
        ) : (
          chatRooms.map((room) => {
            const isActive = activeChatRoomId === room.id;
            return (
              <div
                key={room.id}
                className={cn(
                  "group flex items-center mx-3 my-1 p-3 cursor-pointer rounded-xl transition-all duration-300 relative",
                  isActive
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                    : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onSelectChatRoom(room.id)}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                )}
                <Avatar className={cn(
                  "h-10 w-10 border-2 transition-all duration-500",
                  isActive ? "border-primary glow-primary" : "border-white/5"
                )}>
                  <AvatarImage src={room.avatar} alt={room.name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs uppercase">
                    {room.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className={cn(
                      "font-bold text-sm truncate transition-colors",
                      isActive ? "text-foreground" : "group-hover:text-foreground"
                    )}>{room.name}</p>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground/60 truncate uppercase tracking-tight">
                    {room.lastMessage
                      ? (room.lastSenderName ? `${room.lastSenderName.split(' ')[0]}: ` : '') + room.lastMessage
                      : 'Silence is golden'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};