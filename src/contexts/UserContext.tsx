import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Using a fixed UUID for the mock user to maintain data consistency
const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>({
    id: MOCK_USER_ID,
    name: "Demo User",
    avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Demo",
    email: "demo@example.com",
  });

  useEffect(() => {
    // Ensure the mock profile exists in Supabase for foreign key relations
    const syncMockProfile = async () => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: MOCK_USER_ID,
          first_name: "Demo",
          last_name: "User",
          avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Demo",
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error("[UserContext] Error syncing mock profile:", error);
      }
    };

    syncMockProfile();
  }, []);

  const signOut = async () => {
    console.log("Sign out called (disabled in demo mode)");
  };

  const isLoadingUser = false;

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