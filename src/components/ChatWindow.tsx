import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Message } from '@/types/chat';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatWindowProps {
  chatRoomName: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  onTypingStatusChange: (isTyping: boolean) => void;
  typingUsers: { id: string; name: string }[];
  onBack?: () => void; // New optional prop for back button
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatRoomName,
  messages,
  onSendMessage,
  currentUserId,
  onTypingStatusChange,
  typingUsers,
  onBack, // Destructure onBack
}) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile(); // Use the hook

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
      onTypingStatusChange(false); // Stop typing after sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    onTypingStatusChange(true); // Start typing

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStatusChange(false); // Stop typing after a delay
      typingTimeoutRef.current = null;
    }, 3000); // 3 seconds delay
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const otherTypingUsers = typingUsers.filter(user => user.id !== currentUserId);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {isMobile && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mr-1 h-9 w-9 text-muted-foreground hover:bg-white/5 rounded-xl transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex flex-col">
            <h3 className="text-lg font-black tracking-tight text-foreground leading-none">{chatRoomName}</h3>
            {otherTypingUsers.length > 0 && (
              <p className="text-[10px] text-primary font-bold animate-pulse mt-1 uppercase tracking-wider">
                {otherTypingUsers.length === 1
                  ? `${otherTypingUsers[0].name.split(' ')[0]} is typing...`
                  : 'Multiple people typing...'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-grow p-6 relative" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message, index) => {
            const isMe = message.sender_id === currentUserId;
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-3 group animate-fade-in-up",
                  isMe ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {!isMe && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="h-8 w-8 border border-white/10 ring-2 ring-primary/10">
                        <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                          {message.sender_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}

                <div className={cn(
                  "flex flex-col max-w-[75%]",
                  isMe ? "items-end" : "items-start"
                )}>
                  {showAvatar && !isMe && (
                    <span className="text-[10px] font-bold text-muted-foreground/60 mb-1 ml-1 uppercase tracking-wider">
                      {message.sender_name.split(' ')[0]}
                    </span>
                  )}
                  <div
                    className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-lg transition-all duration-300",
                      isMe
                        ? "bg-primary text-white rounded-br-none shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:scale-[1.01]"
                        : "bg-white/5 text-foreground rounded-bl-none border border-white/10 backdrop-blur-md hover:bg-white/10"
                    )}
                  >
                    <p>{message.content}</p>
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground/40 mt-1.5 px-1 uppercase letter-spacing-wide">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isMe && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="h-8 w-8 border border-white/10 ring-2 ring-primary/10">
                        <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                          {message.sender_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-6 border-t border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div className="relative flex items-center gap-3">
          <Input
            placeholder="Type your message..."
            className="flex-grow h-14 rounded-2xl border-none ring-1 ring-white/10 bg-white/5 focus:ring-primary/50 focus:bg-white/10 transition-all text-sm px-6"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg transition-all active:scale-95 group"
            onClick={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};