import React, { useState, useEffect } from 'react';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';
import { teamMembers } from '@/data/teamMembers';
import { ChatRoom, Message } from '@/types/chat';
import { useSupabase } from '@/providers/SupabaseProvider';
import { useUser } from '@/contexts/UserContext';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CreateChatRoomDialog } from './CreateChatRoomDialog'; // Import the new dialog

export const ChatLayout: React.FC = () => {
  const { supabase } = useSupabase();
  const { currentUser } = useUser();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);

  const fetchChatRooms = async () => {
    setLoading(true);
    const { data: roomsData, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error("Error fetching chat rooms:", roomsError);
      showError("Failed to load chat rooms.");
    } else {
      const roomsWithLastMessage = await Promise.all(
        roomsData.map(async (room) => {
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError && lastMessageError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error(`Error fetching last message for room ${room.id}:`, lastMessageError);
          }

          const dummyRoom = teamMembers.find(m => m.id === room.id);
          return {
            ...room,
            lastMessage: lastMessageData?.content || "No recent messages",
            avatar: room.avatar || dummyRoom?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${room.name}`,
          };
        })
      );
      setChatRooms(roomsWithLastMessage);
      if (roomsWithLastMessage.length > 0 && !activeChatRoomId) {
        setActiveChatRoomId(roomsWithLastMessage[0].id);
      }
    }
    setLoading(false);
  };

  // Fetch chat rooms on component mount and when a new room is created
  useEffect(() => {
    fetchChatRooms();

    const channel = supabase
      .channel('chat_rooms_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, (payload) => {
        const newRoom = payload.new as ChatRoom;
        setChatRooms((prev) => [
          {
            ...newRoom,
            lastMessage: "New chat room created!", // Placeholder, will be updated on next fetch
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
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          sender_avatar: msg.sender_avatar,
          timestamp: msg.created_at,
        })));
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages_room_${activeChatRoomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${activeChatRoomId}` }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => [
          ...prev,
          {
            ...newMessage,
            sender_id: newMessage.sender_id,
            sender_name: newMessage.sender_name,
            sender_avatar: newMessage.sender_avatar,
            timestamp: newMessage.created_at,
          },
        ]);
        // Also update the last message in the chat room list for the active room
        setChatRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === activeChatRoomId ? { ...room, lastMessage: newMessage.content } : room
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatRoomId, supabase]);

  const handleSendMessage = async (content: string) => {
    if (!activeChatRoomId || !content.trim() || !currentUser) return;

    const { error } = await supabase.from('messages').insert({
      chat_room_id: activeChatRoomId,
      sender_id: currentUser!.id,
      sender_name: currentUser!.name,
      sender_avatar: currentUser!.avatar,
      content: content.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
      showError("Failed to send message.");
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

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] max-h-[900px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200 bg-white">
        <p className="text-lg text-red-600">User not authenticated for chat.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[900px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200">
      <div className="w-1/3 min-w-[280px] max-w-[350px] flex-shrink-0 flex flex-col">
        <div className="flex-grow">
          <ChatRoomList
            chatRooms={chatRooms}
            activeChatRoomId={activeChatRoomId}
            onSelectChatRoom={setActiveChatRoomId}
          />
        </div>
        <div className="p-4 border-t border-sidebar-border bg-sidebar">
          <Button
            onClick={() => setIsCreateRoomDialogOpen(true)}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
          >
            <PlusCircle className="h-5 w-5 mr-2" /> Create New Chat Room
          </Button>
        </div>
      </div>
      <div className="flex-grow">
        {activeChatRoom ? (
          <ChatWindow
            chatRoomName={activeChatRoom.name}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={currentUser!.id}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-lg bg-white rounded-r-xl">
            Select a chatroom or create a new one to start messaging
          </div>
        )}
      </div>

      <CreateChatRoomDialog
        isOpen={isCreateRoomDialogOpen}
        onClose={() => setIsCreateRoomDialogOpen(false)}
        onRoomCreated={fetchChatRooms} // Refresh chat rooms after creation
      />
    </div>
  );
};