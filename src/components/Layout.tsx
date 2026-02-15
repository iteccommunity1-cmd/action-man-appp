import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MadeWithDyad } from './made-with-dyad';
import { Header } from './Header';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarLinkClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!isMobile && (
        <div
          className={cn(
            "flex-shrink-0 transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-1/4 min-w-[280px] max-w-[300px]" : "w-[72px]"
          )}
        >
          <Sidebar isSidebarOpen={isSidebarOpen} onLinkClick={handleSidebarLinkClick} />
        </div>
      )}
      <div className="flex flex-col flex-grow transition-all duration-300 ease-in-out">
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <AppBreadcrumbs />
        <main className={cn(
          "flex-grow p-4 sm:p-6 lg:p-8 flex flex-col relative",
          isMobile && "pb-24" // Extra padding for mobile bottom nav
        )}>
          <div className="flex-grow w-full">
            {children}
          </div>
          <MadeWithDyad />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};