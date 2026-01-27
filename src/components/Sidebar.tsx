import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, LogOut, ListTodo, ListChecks } from 'lucide-react'; // Import ListChecks icon
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isSidebarOpen: boolean; // New prop to control open/closed state
  onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, onLinkClick }) => {
  const { currentUser, signOut } = useUser();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: ListChecks, label: "Projects", href: "/projects" }, // Added Projects link
    { icon: ListTodo, label: "Daily Digest", href: "/daily-digest" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  const handleSignOut = async () => {
    await signOut();
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 bg-dot-pattern transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-full" : "w-[72px] items-center" // Adjust width and alignment
      )}
    >
      <div className={cn("flex items-center p-4 border-b border-sidebar-border", isSidebarOpen ? "justify-start" : "justify-center")}>
        {isSidebarOpen ? (
          <img src="/logo.png" alt="Action Manager Logo" className="h-8 w-auto" />
        ) : (
          <img src="/logo.png" alt="Logo" className="h-7 w-7" />
        )}
      </div>

      {currentUser && (
        <div className={cn("flex gap-3 p-3 mb-6 bg-sidebar-accent rounded-lg", isSidebarOpen ? "items-center" : "flex-col items-center")}>
          <Avatar className="h-10 w-10 border-2 border-sidebar-primary">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {currentUser.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-primary-foreground text-base">{currentUser.name}</span>
              <span className="text-xs text-muted-foreground">{currentUser.email}</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-grow space-y-2 w-full">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors duration-200",
              location.pathname === item.href
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isSidebarOpen && "justify-center" // Center icon when collapsed
            )}
            onClick={onLinkClick}
          >
            <item.icon className="h-5 w-5" />
            {isSidebarOpen && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-sidebar-border w-full">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg",
            !isSidebarOpen && "justify-center" // Center icon when collapsed
          )}
        >
          <LogOut className="h-5 w-5" />
          {isSidebarOpen && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
};