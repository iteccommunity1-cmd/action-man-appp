import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';
import { ChatRoom, Message } from '@/types/chat';
import { useUser } from '@/contexts/UserContext';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CreateChatRoomDialog } from './CreateChatRoomDialog';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types/project';
import { sendNotification } from '@/utils/notifications';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

export const ChatLayout: React.FC = () => {
  const { currentUser } = useUser();
  const { teamMembers, loading: loadingTeamMembers } = useTeamMembers();
  const location = useLocation();
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChatRooms, setLoadingChatRooms] = useState(true);
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const isMobile = useIsMobile(); // Use the hook

  const typingStatusRef = useRef(new Map<string, { name: string; timeout: NodeJS.Timeout }>());

  // Derive activeChatRoom from activeChatRoomId
  const activeChatRoom = chatRooms.find(room => room.id === activeChatRoomId);

  const fetchChatRooms = async () => {
    setLoadingChatRooms(true);
    if (!currentUser?.id) {
      setLoadingChatRooms(false);
      return;
    }

    const { data: roomsData, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .contains('members', [currentUser.id])
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error("Error fetching chat rooms:", roomsError);
      showError("Failed to load chat rooms.");
    } else {
      const roomsWithLastMessage = await Promise.all(
        roomsData.map(async (room) => {
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select('content, created_at, sender_name')
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError && lastMessageError.code !== 'PGRST116') {
            console.error(`Error fetching last message for room ${room.id}:`, lastMessageError);
          }

          let roomName = room.name;
          let roomAvatar = room.avatar;

          if (room.type === 'private' && room.members && currentUser) {
            const allMembers = [currentUser, ...teamMembers];
            const otherMemberIds = room.members.filter((memberId: string) => memberId !== currentUser.id);
            const otherMembersDetails = otherMemberIds
              .map((id: string) => allMembers.find(member => member.id === id))
              .filter(Boolean) as TeamMember[];

            if (otherMembersDetails.length === 1) {
              roomName = otherMembersDetails[0]!.name;
              roomAvatar = otherMembersDetails[0]!.avatar;
            } else if (otherMembersDetails.length > 1) {
              roomName = otherMembersDetails.map((m: TeamMember) => m.name).join(', ');
              roomAvatar = otherMembersDetails[0]!.avatar;
            } else if (otherMemberIds.length === 0 && room.members.includes(currentUser.id)) {
              roomName = currentUser.name;
              roomAvatar = currentUser.avatar;
            } else {
              roomName = "Unknown Private Chat";
              roomAvatar = `https://api.dicebear.com/8.x/adventurer/svg?seed=default`;
            }
          } else if (room.type === 'project') {
            roomName = room.name;
            roomAvatar = room.avatar;
          }

          return {
            ...room,
            name: roomName,
            avatar: roomAvatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${room.name}`,
            lastMessage: lastMessageData?.content || undefined,
            lastSenderName: lastMessageData?.sender_name || undefined,
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
    if (!loadingTeamMembers) {
      fetchChatRooms();
    }

    const chatRoomsChannel = supabase
      .channel('chat_rooms_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms', filter: `members.cs.{${currentUser?.id}}` }, (payload) => {
        const newRoom = payload.new as ChatRoom;
        const roomToAdd = {
          ...newRoom,
          lastMessage: undefined,
          lastSenderName: undefined,
          avatar: newRoom.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${newRoom.name}`,
        };
        setChatRooms((prev) => [roomToAdd, ...prev]);
        setActiveChatRoomId(newRoom.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatRoomsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, currentUser?.id, loadingTeamMembers, teamMembers, location.search, navigate]);

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

    const typingStatusMap = typingStatusRef.current;
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      typingStatusMap.forEach(user => clearTimeout(user.timeout));
      typingStatusMap.clear();
      setTypingUsers([]);
    };
  }, [activeChatRoomId, currentUser?.id]);

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
      if (activeChatRoom && activeChatRoom.members && teamMembers) {
        const mentionedUsers: TeamMember[] = [];
        const allPossibleMentions = [...teamMembers, currentUser].filter(Boolean) as TeamMember[];

        for (const member of allPossibleMentions) {
          if (member.id !== currentUser!.id) {
            const mentionPattern = new RegExp(`@(${member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${member.name.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            if (mentionPattern.test(messageContent)) {
              mentionedUsers.push(member);
            }
          }
        }

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

  const overallLoading = loadingChatRooms || loadingTeamMembers;

  if (overallLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow min-h-[500px] w-full max-w-6xl mx-auto rounded-3xl border-none ring-1 ring-white/10 glass-card animate-fade-in-up">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="mt-6 text-lg font-bold text-foreground/70 tracking-tight">Initializing secure connection...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow min-h-[500px] w-full max-w-6xl mx-auto rounded-3xl border-none ring-1 ring-white/10 glass-card animate-fade-in-up">
        <p className="text-xl font-bold text-destructive">User not authenticated for chat.</p>
        <p className="text-muted-foreground mt-2">Please log in to participate in the conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-grow min-h-screen sm:min-h-[500px] w-full max-w-6xl mx-auto rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl overflow-hidden border-none sm:border border-white/10 glass-card transition-all duration-500">
      {/* Mobile: Show ChatRoomList if no active room, else show ChatWindow */}
      {isMobile ? (
        activeChatRoomId ? (
          <div className="flex-grow animate-fade-in-up">
            {activeChatRoom ? (
              <ChatWindow
                chatRoomName={activeChatRoom.name}
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUserId={currentUser!.id}
                onTypingStatusChange={handleTypingStatusChange}
                typingUsers={typingUsers}
                onBack={() => setActiveChatRoomId(null)} // Back button for mobile
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center">
                  <PlusCircle className="h-8 w-8 text-primary opacity-30" />
                </div>
                <p className="font-bold">Chat room not found</p>
                <Button onClick={() => setActiveChatRoomId(null)} variant="link">Back to list</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col animate-fade-in-up">
            <div className="flex-grow">
              <ChatRoomList
                chatRooms={chatRooms}
                activeChatRoomId={activeChatRoomId}
                onSelectChatRoom={setActiveChatRoomId}
              />
            </div>
            <div className="p-6 border-t border-white/5 bg-sidebar/40 backdrop-blur-xl">
              <Button
                onClick={() => setIsCreateRoomDialogOpen(true)}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
              >
                <PlusCircle className="h-5 w-5 mr-3" /> Create New Chat Room
              </Button>
            </div>
          </div>
        )
      ) : (
        /* Desktop: Show both side-by-side */
        <>
          <div className="w-1/3 min-w-[300px] max-w-[380px] flex-shrink-0 flex flex-col border-r border-white/5">
            <div className="flex-grow overflow-hidden">
              <ChatRoomList
                chatRooms={chatRooms}
                activeChatRoomId={activeChatRoomId}
                onSelectChatRoom={setActiveChatRoomId}
              />
            </div>
            <div className="p-6 border-t border-white/5 bg-sidebar/40">
              <Button
                onClick={() => setIsCreateRoomDialogOpen(true)}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 transition-all duration-300 hover:scale-[1.02]"
              >
                <PlusCircle className="h-5 w-5 mr-3" /> New Chat Room
              </Button>
            </div>
          </div>
          <div className="flex-grow flex flex-col bg-white/[0.02] backdrop-blur-sm">
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
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12 text-center space-y-6 animate-fade-in-up">
                <div className="relative">
                  <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl"></div>
                  <div className="relative h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center border border-white/10 rotate-3">
                    <PlusCircle className="h-10 w-10 text-primary opacity-40 -rotate-3" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-foreground/40">Select a Conversation</h4>
                  <p className="text-sm">Choose a chatroom from the list or start a new one.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <CreateChatRoomDialog
        isOpen={isCreateRoomDialogOpen}
        onClose={() => setIsCreateRoomDialogOpen(false)}
        onRoomCreated={() => fetchChatRooms()}
      />
    </div>
  );
};