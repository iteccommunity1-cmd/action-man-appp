import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MadeWithDyad } from './made-with-dyad';
import { Header } from './Header';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open for desktop

  useEffect(() => {
    // On mobile, sidebar should be closed by default
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true); // Ensure it's open on desktop if resized
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarLinkClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false); // Close sidebar on mobile after link click
    }
    // For desktop, we don't auto-close on link click, but the user can manually toggle
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30 selection:text-white">
      {/* Sidebar for desktop, Sheet for mobile */}
      {!isMobile && (
        <aside
          className={cn(
            "flex-shrink-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) relative z-50",
            isSidebarOpen ? "w-1/4 min-w-[280px] max-w-[300px]" : "w-[80px]"
          )}
        >
          <Sidebar isSidebarOpen={isSidebarOpen} onLinkClick={handleSidebarLinkClick} />
        </aside>
      )}
      <div
        className="flex flex-col flex-grow transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) relative"
      >
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-grow flex flex-col relative bg-dot-pattern">
          {/* Subtle gradient overlay for better depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-primary/5 pointer-events-none" />

          <div className="px-4 py-2">
            <AppBreadcrumbs />
          </div>

          <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col relative z-10">
            <div className="flex-grow w-full animate-fade-in-up">
              {children}
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <MadeWithDyad />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};