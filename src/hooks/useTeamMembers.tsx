import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { TeamMember } from '@/types/project';
import { showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client'; // Direct import

export const useTeamMembers = () => {
  const { currentUser } = useUser();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .neq('id', currentUser.id); // Exclude current user from the list

      if (error) {
        console.error("[useTeamMembers] Error fetching team members:", error);
        showError("Failed to load team members.");
        setTeamMembers([]);
      } else {
        const members: TeamMember[] = data.map(profile => ({
          id: profile.id,
          name: profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile.id, // Fallback if names are not set
          avatar: profile.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${profile.id}`,
        }));
        setTeamMembers(members);
      }
      setLoading(false);
    };

    fetchTeamMembers();
  }, [supabase, currentUser?.id]);

  return { teamMembers, loading };
};