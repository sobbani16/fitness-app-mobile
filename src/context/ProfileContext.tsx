import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Profile, clearProfile, loadProfile, saveProfile } from '../storage/profile';

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  setProfile: (p: Profile) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
  reset: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile()
      .then(setProfileState)
      .finally(() => setLoading(false));
  }, []);

  const setProfile = useCallback(async (p: Profile) => {
    await saveProfile(p);
    setProfileState(p);
  }, []);

  const update = useCallback(async (patch: Partial<Profile>) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as Profile;
      saveProfile(next);
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    await clearProfile();
    setProfileState(null);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, setProfile, update, reset }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
