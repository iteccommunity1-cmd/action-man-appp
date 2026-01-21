import React from 'react';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MadeWithDyad } from './made-with-dyad'; // Import MadeWithDyad

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  const handleLinkClick = () => {
    // No need to manage isSheetOpen here, as Sidebar handles it internally.
    // This function can remain empty or be removed if no other layout-specific logic is needed.
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {isMobile ? (
        <Sidebar onLinkClick={handleLinkClick} />
      ) : (
        <Sidebar />
      )}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col">
        <div className="flex-grow">
          {children}
        </div>
        <MadeWithDyad /> {/* Placed at the bottom of the main content */}
      </main>
    </div>
  );
};