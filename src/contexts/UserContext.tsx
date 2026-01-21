import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  avatar?: string;
}

interface UserContextType {
  currentUser: CurrentUser;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For now, we'll use a static dummy user. In a real app, this would come from authentication.
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: "current-user-123", // Unique ID for the current user
    name: "You",
    avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=CurrentUser",
  });

  // In a real application, you would fetch or set the current user here
  // e.g., from Supabase Auth, local storage, etc.
  useEffect(() => {
    // Example: If you had Supabase auth, you might do something like:
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user) {
    //   setCurrentUser({
    //     id: user.id,
    //     name: user.user_metadata.full_name || user.email,
    //     avatar: user.user_metadata.avatar_url,
    //   });
    // }
  }, []);

  return (
    <UserContext.Provider value={{ currentUser }}>
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