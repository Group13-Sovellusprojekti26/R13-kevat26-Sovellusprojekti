import { useState, useEffect } from 'react';
import { getUserProfile } from '@/data/repositories/users.repo';
import type { UserRole } from '@/data/models/enums';

interface UserProfileData {
  housingCompanyId: string;
  role: UserRole;
}

/**
 * Custom hook for fetching and caching user profile.
 * Used by screens that need user role and housing company ID.
 * 
 * @returns Object with loading state, profile data, and error
 * 
 * @example
 * const { loading, profile, error } = useUserProfile();
 * if (loading) return <LoadingState />;
 * if (error) return <ErrorState message={error} />;
 */
export const useUserProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (data) {
          setProfile(data as UserProfileData);
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  return { loading, profile, error };
};
