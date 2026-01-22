import React from 'react';
import { Link, useLocation } from 'react-router-dom'; // Import useLocation
import { Home, MessageCircle, User, LogOut, ListTodo } from 'lucide-react'; // Removed Menu icon
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { SheetContent } from '@/components/ui/sheet'; // Only SheetContent is needed here now

interface SidebarProps {
  // onLinkClick?: () => void; // Removed as it's no longer needed
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { currentUser, signOut } = useUser();
  const isMobile = useIsMobile();
  const location = useLocation(); // Use useLocation to get current path

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: ListTodo, label: "Daily Digest", href: "/daily-digest" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4">
      <div className="flex items-center justify-center p-4 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">Action Manager</h1> {/* Updated app name */}
      </div>

      {currentUser && (
        <div className="flex items-center gap-3 p-3 mb-6 bg-sidebar-accent rounded-lg">
          <Avatar className="h-10 w-10 border-2 border-sidebar-primary">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {currentUser.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-primary-foreground text-base">{currentUser.name}</span>
            <span className="text-xs text-muted-foreground">{currentUser.email}</span>
          </div>
        </div>
      )}

      <nav className="flex-grow space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors duration-200",
              location.pathname === item.href
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" // Active state
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    // On mobile, the Sidebar content is rendered inside a Sheet, triggered by the Header
    return <SheetContent side="left" className="p-0 w-[280px] rounded-r-xl border-r-0">{renderSidebarContent()}</SheetContent>;
  }

  return (
    <div className="w-1/4 min-w-[280px] max-w-[300px] flex-shrink-0 h-full rounded-xl overflow-hidden">
      {renderSidebarContent()}
    </div>
  );
};