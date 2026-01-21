import React, { useState, useEffect } from 'react';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';
import { teamMembers } from '@/data/teamMembers';
import { ChatRoom, Message } from '@/types/chat';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useUser } from '@/contexts/UserContext'; // Import useUser hook
import { showSuccess, showError } from '@/utils/toast';

export const ChatLayout: React.FC = () => {
  const { supabase } = useSupabase();
  const { currentUser } = useUser(); // Get current user
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch chat rooms
  useEffect(() => {
    const fetchChatRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching chat rooms:", error);
        showError("Failed to load chat rooms.");
      } else {
        // For now, we'll manually add lastMessage and avatar from dummy data if needed
        // In a real app, these would come from the database or a more complex query
        const roomsWithLastMessage = data.map(room => {
          const dummyRoom = teamMembers.find(m => m.id === room.id); // Example for private chats
          return {
            ...room,
            lastMessage: room.lastMessage || "No recent messages", // Placeholder
            avatar: room.avatar || dummyRoom?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${room.name}`,
          };
        });
        setChatRooms(roomsWithLastMessage);
        if (roomsWithLastMessage.length > 0 && !activeChatRoomId) {
          setActiveChatRoomId(roomsWithLastMessage[0].id);
        }
      }
      setLoading(false);
    };

    fetchChatRooms();

    // Realtime subscription for chat rooms (optional, for new rooms being created)
    const channel = supabase
      .channel('chat_rooms_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, (payload) => {
        const newRoom = payload.new as ChatRoom;
        setChatRooms((prev) => [
          {
            ...newRoom,
            lastMessage: "New chat room created!",
            avatar: newRoom.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${newRoom.name}`,
          },
          ...prev,
        ]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeChatRoomId]);

  // Fetch messages for the active chat room
  useEffect(() => {
    if (!activeChatRoomId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', activeChatRoomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        showError("Failed to load messages.");
      } else {
        setMessages(data.map(msg => ({
          ...msg,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          senderAvatar: msg.sender_avatar,
          timestamp: msg.created_at, // Use created_at for timestamp
        })));
      }
    };

    fetchMessages();

    // Realtime subscription for messages
    const channel = supabase
      .channel(`messages_room_${activeChatRoomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${activeChatRoomId}` }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => [
          ...prev,
          {
            ...newMessage,
            senderId: newMessage.sender_id,
            senderName: newMessage.sender_name,
            senderAvatar: newMessage.sender_avatar,
            timestamp: newMessage.created_at,
          },
        ]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatRoomId, supabase]);

  const handleSendMessage = async (content: string) => {
    if (!activeChatRoomId || !content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      chat_room_id: activeChatRoomId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar,
      content: content.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
      showError("Failed to send message.");
    } else {
      // Message will be added via real-time subscription, no need to manually update state here
      // showSuccess("Message sent!"); // Optional: show success toast
    }
  };

  const activeChatRoom = chatRooms.find((room) => room.id === activeChatRoomId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] max-h-[900px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200 bg-white">
        <p className="text-lg text-gray-600">Loading chat rooms...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[900px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200">
      <div className="w-1/3 min-w-[280px] max-w-[350px] flex-shrink-0">
        <ChatRoomList
          chatRooms={chatRooms}
          activeChatRoomId={activeChatRoomId}
          onSelectChatRoom={setActiveChatRoomId}
        />
      </div>
      <div className="flex-grow">
        {activeChatRoom ? (
          <ChatWindow
            chatRoomName={activeChatRoom.name}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={currentUser.id}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-lg bg-white rounded-r-xl">
            Select a chatroom to start messaging
          </div>
        )}
      </div>
    </div>
  );
};