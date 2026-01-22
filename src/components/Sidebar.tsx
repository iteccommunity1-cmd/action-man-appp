import React from 'react';
import { Link } from 'react-router-dom';
import { Home, MessageCircle, User, LogOut, Menu, ListTodo } from 'lucide-react'; // Added ListTodo icon
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; // For mobile sidebar

interface SidebarProps {
  // onLinkClick?: () => void; // Removed as it's no longer needed
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { currentUser, signOut } = useUser();
  const isMobile = useIsMobile();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: ListTodo, label: "Daily Digest", href: "/daily-digest" }, // New Daily Digest item
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  const handleSignOut = async () => {
    await signOut();
    // if (onLinkClick) onLinkClick(); // Removed
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 rounded-l-xl sm:rounded-none"> {/* Adjusted rounded corners for mobile sheet */}
      <div className="flex items-center justify-center p-4 border-b border-sidebar-border mb-6">
        <h1 className="text-2xl font-bold text-sidebar-primary">Dyad App</h1>
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
            // onClick={onLinkClick} // Removed
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200",
              // Add active state styling if needed, e.g., based on current path
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
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 rounded-full bg-white shadow-md">
            <Menu className="h-6 w-6 text-gray-700" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px] rounded-r-xl">
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-1/4 min-w-[280px] max-w-[300px] flex-shrink-0 h-full">
      {renderSidebarContent()}
    </div>
  );
};