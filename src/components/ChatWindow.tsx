import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from '@/types/chat';
import { TypingIndicator } from './TypingIndicator'; // Import TypingIndicator

interface ChatWindowProps {
  chatRoomName: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
  onTypingStatusChange: (isTyping: boolean) => void; // New prop for typing status
  typingUsers: { id: string; name: string }[]; // New prop for typing users
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatRoomName,
  messages,
  onSendMessage,
  currentUserId,
  onTypingStatusChange,
  typingUsers,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    <div className="flex flex-col h-full bg-white rounded-r-xl shadow-lg">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-xl">
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
              <Avatar className="h-8 w-8 rounded-full border border-gray-200">
                <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                  {message.sender_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[70%] p-3 rounded-xl ${
                message.sender_id === currentUserId
                  ? "bg-blue-600 text-white rounded-br-none ml-2"
                  : "bg-gray-100 text-gray-800 rounded-bl-none mr-2"
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
              <Avatar className="h-8 w-8 rounded-full border border-gray-200">
                <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
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
      <div className="p-4 border-t border-gray-200 flex items-center gap-2 bg-gray-50 rounded-br-xl">
        <Input
          placeholder="Type your message..."
          className="flex-grow rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button
          type="button"
          size="icon"
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSend}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};