import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar'; // Import Sidebar for mobile menu

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const showBackButton = location.pathname !== '/';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-primary/20">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] rounded-r-xl border-r-0">
              <Sidebar /> {/* Sidebar is now rendered directly here */}
            </SheetContent>
          </Sheet>
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
        <h1 className="text-xl font-bold text-foreground">Action Manager</h1>
      </div>
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