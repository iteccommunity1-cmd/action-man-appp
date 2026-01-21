import { ChatLayout } from '@/components/ChatLayout';

const Chat = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex-grow flex items-center justify-center w-full">
        <ChatLayout />
      </div>
    </div>
  );
};

export default Chat;