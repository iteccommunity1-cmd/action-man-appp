import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ListChecks, ListTodo, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: ListChecks, label: "Projects", href: "/projects" },
    { icon: ListTodo, label: "Digest", href: "/daily-digest" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "animate-in zoom-in-90 duration-300")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};