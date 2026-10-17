import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const light = {
  primary: '#137C63', onPrimary: '#FFFFFF', background: '#F7F9F8', surface: '#FFFFFF',
  text: '#172321', muted: '#52655F', accent: '#E5F4ED', border: '#CAD8D1',
  danger: '#A52A32', warning: '#80520B', track: '#DEE8E2',
};
export const dark: typeof light = {
  primary: '#7ADDB9', onPrimary: '#092D23', background: '#101916', surface: '#1B2923',
  text: '#F1F7F3', muted: '#B3C8BD', accent: '#233D32', border: '#4C6356',
  danger: '#FFB3B7', warning: '#F1CD88', track: '#354B3E',
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { control: 12, card: 20 };
export const typography = { caption: 13, body: 16, title: 20, heading: 28, display: 40 };
export const elevation = { shadowColor: '#172321', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 };
export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'humai.appearance.v1'; // Device preference only; contains no account/health data.
const ThemeContext = createContext({ colors: light, isDark: false, preference: 'system' as ThemePreference,
  setPreference: (_value: ThemePreference) => {}, storageError: false });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setValue] = useState<ThemePreference>('system');
  const [storageError, setStorageError] = useState(false);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY).then(value => {
      if (live && !changed.current && (value === 'light' || value === 'dark' || value === 'system')) setValue(value);
    }).catch(() => { if (live) setStorageError(true); });
    return () => { live = false; };
  }, []);
  const setPreference = (value: ThemePreference) => {
    changed.current = true;
    setValue(value);
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, value))
      .then(() => setStorageError(false)).catch(() => setStorageError(true));
  };
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark, preference, setPreference, storageError }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
