import { getSession } from '../storage/session';
import { api } from '../api/client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Profile, clearProfile, loadProfile, saveProfile } from '../storage/profile';
interface ProfileContextValue {
  profile: Profile | null; loading: boolean;
  setProfile: (p: Profile) => Promise<void>; update: (patch: Partial<Profile>) => Promise<void>; reset: () => Promise<void>;
}
const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null), [loading, setLoading] = useState(true);
  const current = useRef<Profile | null>(null), revision = useRef(0), queue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true), account = useRef(getSession()?.user.id).current;
  const check = useCallback(() => { if (!mounted.current || !account || account !== getSession()?.user.id) throw new Error('Account changed'); }, [account]);
  useEffect(() => {
    mounted.current = true;
    const version = revision.current;
    (async () => {
      try {
        const saved = await loadProfile(); check();
        if (version === revision.current && saved) { current.current = saved; setProfileState(saved); }
        const { data } = await api.get('/me/profile'); check();
        if (version !== revision.current) return;
        if (data.profile) { await saveProfile(data.profile); check(); if (version === revision.current) { current.current = data.profile; setProfileState(data.profile); } }
      } catch { /* Keep the saved profile when the server is unavailable. */ }
      finally { if (mounted.current && account === getSession()?.user.id) setLoading(false); }
    })();
    return () => { mounted.current = false; };
  }, [account, check]);
  const write = useCallback((create: () => Profile) => {
    revision.current++;
    const action = async () => {
      check(); const next = create();
      const { data } = await api.put('/me/profile', next); check();
      const confirmed = data?.profile || next;
      await saveProfile(confirmed); check(); current.current = confirmed; setProfileState(confirmed);
    };
    const result = queue.current.then(action, action); queue.current = result.catch(() => {}); return result;
  }, [check]);
  const setProfile = useCallback((p: Profile) => write(() => p), [write]);
  const update = useCallback((patch: Partial<Profile>) => write(() => {
    if (!current.current) throw new Error('Create your profile first');
    return { ...current.current, ...patch };
  }), [write]);
  const reset = useCallback(async () => { revision.current++; check(); await clearProfile(); check(); current.current = null; setProfileState(null); }, [check]);
  return <ProfileContext.Provider value={{ profile, loading, setProfile, update, reset }}>{children}</ProfileContext.Provider>;
}
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
