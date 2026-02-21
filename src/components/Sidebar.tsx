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
        "flex flex-col h-full bg-sidebar/80 backdrop-blur-md text-sidebar-foreground border-r border-sidebar-border transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
        isSidebarOpen ? "w-full p-6" : "w-[80px] items-center p-4"
      )}
    >
      <div className={cn("flex items-center mb-10", isSidebarOpen ? "justify-start px-2" : "justify-center")}>
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary to-orange-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          {isSidebarOpen ? (
            <img src="/logo.svg" alt="Action Manager Logo" className="h-10 w-auto relative" />
          ) : (
            <img src="/logo.svg" alt="Logo" className="h-8 w-8 relative" />
          )}
        </div>
      </div>

      {currentUser && (
        <div className={cn(
          "flex gap-3 p-3 mb-8 glass-card border-none ring-1 ring-white/10 shadow-lg",
          isSidebarOpen ? "items-center" : "flex-col items-center"
        )}>
          <Avatar className="h-10 w-10 border-2 border-primary glow-primary">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {currentUser.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {isSidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-foreground text-sm truncate">{currentUser.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{currentUser.email}</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-grow space-y-3 w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isSidebarOpen && "justify-center"
              )}
              onClick={onLinkClick}
            >
              <item.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive && "glow-primary")} />
              {isSidebarOpen && <span className="font-semibold text-sm">{item.label}</span>}
              {isActive && !isSidebarOpen && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-sidebar-border w-full">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground/70 hover:bg-destructive hover:text-white rounded-xl transition-all duration-300",
            !isSidebarOpen && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {isSidebarOpen && <span className="ml-3 font-semibold text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
};