import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react"; // Import ArrowLeft icon
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from '@/types/chat';
import { TypingIndicator } from './TypingIndicator';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

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

  const otherTypingUsers = typingUsers.filter(user => user.id !== currentUserId);

  return (
    <div className="flex flex-col h-full bg-card rounded-none sm:rounded-xl shadow-lg glass-card"> {/* Updated styling */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-t-none sm:rounded-t-xl flex items-center"> {/* Updated styling */}
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-primary-foreground hover:bg-primary/80 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h3 className="text-xl font-semibold">{chatRoomName}</h3>
      </div>
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start ${
              message.sender_id === currentUserId ? "justify-end" : "justify-start"
            }`}
          >
            {message.sender_id !== currentUserId && (
              <Avatar className="h-8 w-8 rounded-full border border-border"> {/* Updated styling */}
                <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {message.sender_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[70%] p-3 rounded-xl ${
                message.sender_id === currentUserId
                  ? "bg-primary text-primary-foreground rounded-br-none ml-2" // Updated styling
                  : "bg-muted text-muted-foreground rounded-bl-none mr-2" // Updated styling
              }`}
            >
              {message.sender_id !== currentUserId && (
                <p className="font-semibold text-xs mb-1">{message.sender_name}</p>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-75 mt-1 text-right">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.sender_id === currentUserId && (
              <Avatar className="h-8 w-8 rounded-full border border-border"> {/* Updated styling */}
                <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs"> {/* Updated styling */}
                  {message.sender_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {otherTypingUsers.length > 0 && (
          <div className="flex justify-start mt-4">
            <TypingIndicator userName={otherTypingUsers.map(u => u.name).join(', ')} />
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-border flex items-center gap-2 bg-muted rounded-b-none sm:rounded-b-xl"> {/* Updated styling */}
        <Input
          placeholder="Type your message..."
          className="flex-grow rounded-full border-border focus:border-primary focus:ring-primary bg-input text-foreground" // Updated styling
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button
          type="button"
          size="icon"
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" // Updated styling
          onClick={handleSend}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};