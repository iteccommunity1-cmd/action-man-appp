import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';
import { ChatRoom, Message } from '@/types/chat';
import { useUser } from '@/contexts/UserContext';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CreateChatRoomDialog } from './CreateChatRoomDialog';
import { useTeamMembers } from '@/hooks/useTeamMembers'; // Import the hook
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading indicator
import { supabase } from '@/integrations/supabase/client'; // Direct import
import { TeamMember } from '@/types/project'; // Import TeamMember type
import { sendNotification } from '@/utils/notifications'; // Import sendNotification

export const ChatLayout: React.FC = () => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers(); // Use the hook
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChatRooms, setLoadingChatRooms] = useState(true); // Renamed to be specific
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);

  const typingStatusRef = useRef(new Map<string, { name: string; timeout: NodeJS.Timeout }>());

  const fetchChatRooms = async () => {
    setLoadingChatRooms(true);
    if (!currentUser?.id) {
      setLoadingChatRooms(false);
      return;
    }

    const { data: roomsData, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .contains('members', [currentUser.id]) // Filter rooms where current user is a member
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error("Error fetching chat rooms:", roomsError);
      showError("Failed to load chat rooms.");
    } else {
      const roomsWithLastMessage = await Promise.all(
        roomsData.map(async (room) => {
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select('content, created_at, sender_name') // Fetch sender_name
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError && lastMessageError.code !== 'PGRST116') {
            console.error(`Error fetching last message for room ${room.id}:`, lastMessageError);
          }

          let roomName = room.name;
          let roomAvatar = room.avatar;

          // For private chats, always derive name and avatar from members
          if (room.type === 'private' && room.members && currentUser) {
            const allMembers = [currentUser, ...teamMembers];
            const otherMemberIds = room.members.filter((memberId: string) => memberId !== currentUser.id);
            const otherMembersDetails = otherMemberIds
              .map((id: string) => allMembers.find(member => member.id === id))
              .filter(Boolean) as TeamMember[]; // Cast to TeamMember[] after filtering

            if (otherMembersDetails.length === 1) {
              roomName = otherMembersDetails[0]!.name;
              roomAvatar = otherMembersDetails[0]!.avatar;
            } else if (otherMembersDetails.length > 1) {
              roomName = otherMembersDetails.map((m: TeamMember) => m.name).join(', ');
              roomAvatar = otherMembersDetails[0]!.avatar; // Use first member's avatar for group private chat
            } else if (otherMemberIds.length === 0 && room.members.includes(currentUser.id)) {
              // Self-chat
              roomName = currentUser.name;
              roomAvatar = currentUser.avatar;
            } else {
              roomName = "Unknown Private Chat"; // Fallback
              roomAvatar = `https://api.dicebear.com/8.x/adventurer/svg?seed=default`;
            }
          } else if (room.type === 'project') {
            // For project chats, use the stored name and avatar
            roomName = room.name;
            roomAvatar = room.avatar;
          }


          return {
            ...room,
            name: roomName,
            avatar: roomAvatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${room.name}`,
            lastMessage: lastMessageData?.content || undefined, // Set to undefined if no message
            lastSenderName: lastMessageData?.sender_name || undefined, // Set to undefined if no message
          };
        })
      );
      setChatRooms(roomsWithLastMessage);

      const stateActiveRoomId = (location.state as { activeChatRoomId?: string })?.activeChatRoomId;
      const localStorageActiveRoomId = localStorage.getItem('activeChatRoomId');
      const queryParams = new URLSearchParams(location.search);
      const queryActiveRoomId = queryParams.get('activeChatRoomId');


      if (stateActiveRoomId && roomsWithLastMessage.some((room: ChatRoom) => room.id === stateActiveRoomId)) {
        setActiveChatRoomId(stateActiveRoomId);
      } else if (queryActiveRoomId && roomsWithLastMessage.some((room: ChatRoom) => room.id === queryActiveRoomId)) {
        setActiveChatRoomId(queryActiveRoomId);
        // Clear the query param from URL to avoid re-triggering on refresh
        navigate(location.pathname, { replace: true });
      }
      else if (localStorageActiveRoomId && roomsWithLastMessage.some((room: ChatRoom) => room.id === localStorageActiveRoomId)) {
        setActiveChatRoomId(localStorageActiveRoomId);
        localStorage.removeItem('activeChatRoomId');
      } else if (roomsWithLastMessage.length > 0) {
        setActiveChatRoomId(roomsWithLastMessage[0].id);
      } else {
        setActiveChatRoomId(null);
      }
    }
    setLoadingChatRooms(false);
  };

  useEffect(() => {
    if (!loadingTeamMembers) { // Only fetch chat rooms once team members are loaded
      fetchChatRooms();
    }

    const chatRoomsChannel = supabase
      .channel('chat_rooms_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms', filter: `members.cs.{${currentUser?.id}}` }, (payload) => {
        const newRoom = payload.new as ChatRoom;
        const roomToAdd = {
          ...newRoom,
          lastMessage: undefined, // No last message initially
          lastSenderName: undefined, // No last sender initially
          avatar: newRoom.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${newRoom.name}`,
        };
        setChatRooms((prev) => [roomToAdd, ...prev]);
        setActiveChatRoomId(newRoom.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatRoomsChannel);
    };
  }, [supabase, location.state, currentUser?.id, loadingTeamMembers, teamMembers, location.search, navigate]); // Add location.search and navigate to dependencies

  useEffect(() => {
    if (!activeChatRoomId) {
      setMessages([]);
      setTypingUsers([]);
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
        })));
      }
    };

    fetchMessages();

    const messagesChannel = supabase
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
          },
        ]);
        setChatRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === activeChatRoomId ? { ...room, lastMessage: newMessage.content, lastSenderName: newMessage.sender_name } : room
          )
        );
      })
      .subscribe();

    const typingChannel = supabase
      .channel(`typing_room_${activeChatRoomId}`)
      .on('broadcast', { event: 'typing_status' }, (payload) => {
        const { userId, userName, isTyping } = payload.payload;

        if (userId === currentUser?.id) return;

        if (isTyping) {
          const existingTimeout = typingStatusRef.current.get(userId)?.timeout;
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(() => {
            typingStatusRef.current.delete(userId);
            setTypingUsers(Array.from(typingStatusRef.current.entries()).map(([id, data]) => ({ id, name: data.name })));
          }, 3500);

          typingStatusRef.current.set(userId, { name: userName, timeout });
        } else {
          const existingTimeout = typingStatusRef.current.get(userId)?.timeout;
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          typingStatusRef.current.delete(userId);
        }
        setTypingUsers(Array.from(typingStatusRef.current.entries()).map(([id, data]) => ({ id, name: data.name })));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      typingStatusRef.current.forEach(user => clearTimeout(user.timeout));
      typingStatusRef.current.clear();
      setTypingUsers([]);
    };
  }, [activeChatRoomId, supabase, currentUser?.id]);

  const handleSendMessage = async (content: string) => {
    if (!activeChatRoomId || !content.trim() || !currentUser) return;

    const messageContent = content.trim();

    const { error } = await supabase.from('messages').insert({
      chat_room_id: activeChatRoomId,
      sender_id: currentUser!.id,
      sender_name: currentUser!.name,
      sender_avatar: currentUser!.avatar,
      content: messageContent,
    });

    if (error) {
      console.error("Error sending message:", error);
      showError("Failed to send message.");
    } else {
      const activeChatRoom = chatRooms.find(room => room.id === activeChatRoomId);
      if (activeChatRoom && activeChatRoom.members && teamMembers) {
        const mentionedUsers: TeamMember[] = [];
        const allPossibleMentions = [...teamMembers, currentUser].filter(Boolean) as TeamMember[];

        for (const member of allPossibleMentions) {
          if (member.id !== currentUser!.id) { // Don't notify self for mentions
            // Regex to find @[Full Name] or @[First Name]
            const mentionPattern = new RegExp(`@(${member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${member.name.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            if (mentionPattern.test(messageContent)) {
              mentionedUsers.push(member);
            }
          }
        }

        // Send specific "mention" notifications to mentioned users
        for (const mentionedUser of mentionedUsers) {
          sendNotification({
            userId: mentionedUser.id,
            message: `${currentUser!.name} mentioned you in "${activeChatRoom.name}": "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
            type: 'chat_mention',
            relatedId: activeChatRoomId,
            pushTitle: `You were mentioned in ${activeChatRoom.name}`,
            pushBody: `${currentUser!.name}: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
            pushIcon: currentUser!.avatar,
            pushUrl: `/chat?activeChatRoomId=${activeChatRoomId}`,
          });
        }

        // Send general "new message" notifications to other members who were not explicitly mentioned
        const recipientIds = activeChatRoom.members.filter(memberId =>
          memberId !== currentUser!.id && !mentionedUsers.some(mu => mu.id === memberId)
        );
        for (const recipientId of recipientIds) {
          const recipient = teamMembers.find(tm => tm.id === recipientId);
          if (recipient) {
            sendNotification({
              userId: recipient.id,
              message: `${currentUser!.name} sent a message in "${activeChatRoom.name}": "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
              type: 'chat_message',
              relatedId: activeChatRoomId,
              pushTitle: `New Message in ${activeChatRoom.name}`,
              pushBody: `${currentUser!.name}: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
              pushIcon: currentUser!.avatar,
              pushUrl: `/chat?activeChatRoomId=${activeChatRoomId}`,
            });
          }
        }
      }
    }
  };

  const handleTypingStatusChange = (isTyping: boolean) => {
    if (!activeChatRoomId || !currentUser) return;

    supabase.channel(`typing_room_${activeChatRoomId}`).send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        userId: currentUser.id,
        userName: currentUser.name,
        isTyping,
      },
    });
  };

  const activeChatRoom = chatRooms.find((room) => room.id === activeChatRoomId);
  const overallLoading = loadingChatRooms || loadingTeamMembers; // Combined loading state

  if (overallLoading) {
    return (
      <div className="flex items-center justify-center flex-grow min-h-[500px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="ml-4 text-xl text-gray-600">Loading chat rooms and team members...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center flex-grow min-h-[500px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200 bg-white">
        <p className="text-lg text-red-600">User not authenticated for chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-grow min-h-[500px] w-full max-w-6xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-gray-200">
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
            onTypingStatusChange={handleTypingStatusChange}
            typingUsers={typingUsers}
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
        onRoomCreated={() => fetchChatRooms()}
      />
    </div>
  );
};