import { ChatLayout } from '@/components/ChatLayout';

const Chat = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-0 sm:p-4"> {/* Removed padding on mobile */}
      <div className="flex-grow flex items-center justify-center w-full h-full"> {/* Ensure full height for mobile chat */}
        <ChatLayout />
      </div>
    </div>
  );
};

export default Chat;