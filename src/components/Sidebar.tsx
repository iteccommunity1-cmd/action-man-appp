import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, ListChecks, ListTodo, Star, Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project';

interface SidebarProps {
  isSidebarOpen: boolean;
  onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, onLinkClick }) => {
  const { currentUser } = useUser();
  const location = useLocation();

  const { data: favoriteProjects } = useQuery<Project[]>({
    queryKey: ['favoriteProjects', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_favorite', true)
        .eq('is_archived', false)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: ListChecks, label: "Projects", href: "/projects" },
    { icon: ListTodo, label: "Daily Digest", href: "/daily-digest" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 bg-dot-pattern transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-full" : "w-[72px] items-center"
      )}
    >
      <div className={cn("flex items-center p-4 border-b border-sidebar-border mb-6", isSidebarOpen ? "justify-start" : "justify-center")}>
        {isSidebarOpen ? (
          <img src="/logo.svg" alt="Action Manager Logo" className="h-8 w-auto" />
        ) : (
          <img src="/logo.svg" alt="Logo" className="h-7 w-7" />
        )}
      </div>

      <nav className="flex-grow space-y-6 w-full overflow-y-auto">
        <div className="space-y-2">
          {isSidebarOpen && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Main Menu</p>}
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors duration-200",
                location.pathname === item.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isSidebarOpen && "justify-center"
              )}
              onClick={onLinkClick}
            >
              <item.icon className="h-5 w-5" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </div>

        {isSidebarOpen && favoriteProjects && favoriteProjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
              <Star className="h-3 w-3 text-yellow-500 fill-current" /> Favorites
            </p>
            {favoriteProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg text-sm transition-colors duration-200",
                  location.pathname === `/projects/${project.id}`
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={onLinkClick}
              >
                <Hash className="h-4 w-4 text-primary" />
                <span className="truncate">{project.title}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {currentUser && isSidebarOpen && (
        <div className="mt-auto pt-4 border-t border-sidebar-border w-full">
          <div className="flex items-center gap-3 p-3 bg-sidebar-accent/50 rounded-lg">
            <Avatar className="h-10 w-10 border-2 border-sidebar-primary">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {currentUser.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sidebar-primary-foreground text-sm truncate">{currentUser.name}</span>
              <span className="text-xs text-muted-foreground truncate">{currentUser.email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};