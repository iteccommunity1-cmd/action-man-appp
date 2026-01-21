import { ChatLayout } from '@/components/ChatLayout';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { NotificationBell } from '@/components/NotificationBell'; // Import NotificationBell

const Chat = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="absolute top-4 right-4">
        <NotificationBell />
      </div>
      <div className="flex-grow flex items-center justify-center w-full">
        <ChatLayout />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Chat;