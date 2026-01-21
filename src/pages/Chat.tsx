import { ChatLayout } from '@/components/ChatLayout';
import { NotificationBell } from '@/components/NotificationBell';

const Chat = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="absolute top-4 right-4">
        <NotificationBell />
      </div>
      <div className="flex-grow flex items-center justify-center w-full">
        <ChatLayout />
      </div>
    </div>
  );
};

export default Chat;