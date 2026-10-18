import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { accountKey, getSession } from '../storage/session';
import { accountStorage } from '../storage/accountStorage';
export const dashboardDefaults = { note: true, water: true, steps: true, meals: true };
export type DashboardCard = keyof typeof dashboardDefaults;
const Context = createContext({ cards: dashboardDefaults, loading: false, busy: false, error: '', setCard: async (_key: DashboardCard, _value: boolean) => {} });
export function DisplayPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState(dashboardDefaults), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const identity = useRef({ account: getSession()?.user.id, key: accountKey('fitness.dashboard.v1') }).current;
  const lock = useRef(false), active = useRef(true), current = useRef(cards);
  useEffect(() => {
    active.current = true;
    accountStorage.getItem(identity.key).then(raw => {
      if (!active.current || identity.account !== getSession()?.user.id) return;
      const data = raw ? JSON.parse(raw) : {};
      const next = { ...dashboardDefaults };
      for (const key of Object.keys(next) as DashboardCard[]) if (typeof data[key] === 'boolean') next[key] = data[key];
      current.current = next; setCards(next);
    }).catch(() => { if (active.current) setError('Could not load your card choices. Showing the default cards.'); })
      .finally(() => { if (active.current) setLoading(false); });
    return () => { active.current = false; };
  }, [identity]);
  const setCard = async (key: DashboardCard, value: boolean) => {
    if (lock.current || loading || !identity.account || identity.account !== getSession()?.user.id) return;
    lock.current = true; setBusy(true); setError('');
    const next = { ...current.current, [key]: value };
    try {
      await accountStorage.setItem(identity.key, JSON.stringify(next));
      if (active.current && identity.account === getSession()?.user.id) { current.current = next; setCards(next); }
    } catch { if (active.current) setError('Could not save your card choices. Please try again.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  return <Context.Provider value={{ cards, loading, busy, error, setCard }}>{children}</Context.Provider>;
}
export const useDisplayPreferences = () => useContext(Context);
