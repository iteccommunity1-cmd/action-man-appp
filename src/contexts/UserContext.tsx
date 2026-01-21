import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'; // Import AuthChangeEvent and Session

interface CurrentUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

interface UserContextType {
  currentUser: CurrentUser | null;
  isLoadingUser: boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const fetchUserProfile = async (user: User) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (profile not yet created)
      console.error("Error fetching user profile:", error);
    }

    setCurrentUser({
      id: user.id,
      name: profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : user.email || 'User',
      avatar: profile?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.id}`,
      email: user.email,
    });
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setCurrentUser(null);
      }
      setIsLoadingUser(false);
    });

    // Initial check for session
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      setIsLoadingUser(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoadingUser(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setCurrentUser(null);
    }
    setIsLoadingUser(false);
  };

  return (
    <UserContext.Provider value={{ currentUser, isLoadingUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};