import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userName: string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName, className }) => {
  return (
    <div className={cn("flex items-center space-x-2 text-sm text-gray-500", className)}>
      <span className="font-medium">{userName}</span>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      <span className="text-xs">is typing...</span>
    </div>
  );
};