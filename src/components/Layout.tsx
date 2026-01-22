import React from 'react';
import { Sidebar } from './Sidebar';
import { MadeWithDyad } from './made-with-dyad';
import { Header } from './Header'; // Import the new Header component

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar is always rendered, but its visibility is controlled internally by useIsMobile and Sheet */}
      <Sidebar />
      <div className="flex flex-col flex-grow"> {/* New wrapper for header and main content */}
        <Header /> {/* Render the new Header */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col relative">
          <div className="flex-grow w-full">
            {children}
          </div>
          <MadeWithDyad />
        </main>
      </div>
    </div>
  );
};