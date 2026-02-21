import React from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { ChevronLeft, Home, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const routeNameMap: Record<string, string> = {
  '': 'Dashboard',
  'chat': 'Chat',
  'projects': 'Projects',
  'profile': 'Profile',
  'daily-digest': 'Daily Digest',
  'notifications': 'Notifications',
};

interface HeaderProps {
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const showBackButton = location.pathname !== '/';

  const pathnames = location.pathname.split('/').filter((x: string) => x);
  const projectId = params.id; // Extract projectId unconditionally

  // Move useQuery outside the conditional block
  const { data: fetchedProjectTitle } = useQuery<string, Error>({
    queryKey: ['projectTitle', projectId],
    queryFn: async () => {
      if (!projectId) return 'Unknown Project';
      const { data, error } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();
      if (error) {
        console.error("[Header] Error fetching project title:", error);
        return 'Unknown Project';
      }
      return data?.title || 'Unknown Project';
    },
    // Enable the query only when it's a project details page
    enabled: !!projectId && pathnames.length >= 2 && pathnames[pathnames.length - 2] === 'projects',
  });

  let currentPageTitle = routeNameMap[''];

  if (pathnames.length > 0) {
    const lastSegment = pathnames[pathnames.length - 1];
    currentPageTitle = routeNameMap[lastSegment] || lastSegment;

    // Now, use the fetchedProjectTitle if the conditions are met
    if (lastSegment === projectId && pathnames.length >= 2 && pathnames[pathnames.length - 2] === 'projects') {
      currentPageTitle = fetchedProjectTitle || 'Loading...';
    }
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm bg-dot-pattern">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="rounded-full text-foreground hover:bg-primary/20"
        >
          <Menu className="h-6 w-6" />
        </Button>
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full text-foreground hover:bg-primary/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
      </div>
      <h1 className="text-xl font-bold text-foreground absolute left-1/2 -translate-x-1/2">
        {currentPageTitle}
      </h1>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-primary/20">
            <Home className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </header>
  );
};