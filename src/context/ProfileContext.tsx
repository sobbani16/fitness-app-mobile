import { getSession } from '../storage/session';
import { api } from '../api/client';
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
    const account = getSession()?.user.id;
    api.get('/me/profile').then(async res => { if (getSession()?.user.id !== account) return null; if(res.data.profile) await saveProfile(res.data.profile); return res.data.profile || loadProfile(); }).catch(()=>loadProfile())
      .then(setProfileState)
      .finally(() => setLoading(false));
  }, []);

  const setProfile = useCallback(async (p: Profile) => {
    const account = getSession()?.user.id;
    await api.put('/me/profile', p);
    if (getSession()?.user.id !== account) return;
    await saveProfile(p);
    setProfileState(p);
  }, []);

  const update = useCallback(async (patch: Partial<Profile>) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    const account = getSession()?.user.id;
    await api.put('/me/profile', next);
    if (getSession()?.user.id !== account) return;
    await saveProfile(next);
    setProfileState(next);
  }, [profile]);

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
