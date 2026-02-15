import React from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { ChevronLeft, Home, Menu, User, Plus, ListTodo, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const routeNameMap: Record<string, string> = {
  '': 'Dashboard',
  'chat': 'Chat',
  'projects': 'Projects',
  'profile': 'Profile',
  'daily-digest': 'Daily Digest',
  'notifications': 'Notifications',
};

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const isMobile = useIsMobile();
  const { currentUser } = useUser();

  const showBackButton = location.pathname !== '/';

  const pathnames = location.pathname.split('/').filter((x) => x);
  const projectId = params.id;

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
    enabled: !!projectId && pathnames.length >= 2 && pathnames[pathnames.length - 2] === 'projects',
  });

  let currentPageTitle = routeNameMap[''];

  if (pathnames.length > 0) {
    const lastSegment = pathnames[pathnames.length - 1];
    currentPageTitle = routeNameMap[lastSegment] || lastSegment;

    if (lastSegment === projectId && pathnames.length >= 2 && pathnames[pathnames.length - 2] === 'projects') {
      currentPageTitle = fetchedProjectTitle || 'Loading...';
    }
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm bg-dot-pattern">
      <div className="flex items-center gap-4">
        {isMobile ? (
          <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-primary/20">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] rounded-r-xl border-r-0">
              <Sidebar isSidebarOpen={true} onLinkClick={toggleSidebar} />
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="rounded-full text-foreground hover:bg-primary/20">
            <Menu className="h-6 w-6" />
          </Button>
        )}
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

      <h1 className="text-xl font-bold text-foreground hidden sm:block absolute left-1/2 -translate-x-1/2">
        {currentPageTitle}
      </h1>

      <div className="flex items-center gap-2 sm:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:flex">
              <Plus className="h-4 w-4 mr-2" /> Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl bg-card border-border w-48">
            <DropdownMenuItem onClick={() => navigate('/projects')} className="cursor-pointer py-2">
              <FolderPlus className="h-4 w-4 mr-2 text-primary" /> New Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/daily-digest')} className="cursor-pointer py-2">
              <ListTodo className="h-4 w-4 mr-2 text-secondary" /> New Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        <NotificationBell />
        
        <Link to="/profile">
          <Avatar className="h-9 w-9 border-2 border-primary/50 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentUser?.name?.charAt(0) || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};