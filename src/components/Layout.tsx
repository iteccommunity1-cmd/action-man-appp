import React from 'react';
import { Sidebar } from './Sidebar';
import { MadeWithDyad } from './made-with-dyad';
import { NotificationBell } from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  // 'isMobile' is no longer directly used in Layout, Sidebar handles its own mobile state.

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sidebar is always rendered, but its visibility is controlled internally by useIsMobile and Sheet */}
      <Sidebar />
      <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col relative">
        <div className="absolute top-4 right-4 z-10">
          <NotificationBell />
        </div>
        <div className="flex-grow w-full"> {/* Ensure content takes full width */}
          {children}
        </div>
        <MadeWithDyad />
      </main>
    </div>
  );
};