import React from 'react';
import { Sidebar } from './Sidebar';
import { MadeWithDyad } from './made-with-dyad';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!isMobile && ( // Conditionally render desktop sidebar
        <div className="w-1/4 min-w-[280px] max-w-[300px] flex-shrink-0 h-full rounded-xl overflow-hidden">
          <Sidebar />
        </div>
      )}
      <div className="flex flex-col flex-grow">
        <Header />
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