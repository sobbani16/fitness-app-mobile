import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMyRoles, UserRolesResponse } from '../api/roles';

interface RolesContextValue {
  roles: string[];
  permissions: string[];
  loading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (perm: string) => boolean;
  refresh: () => Promise<void>;
}

const RolesContext = createContext<RolesContextValue>({
  roles: [],
  permissions: [],
  loading: true,
  hasRole: () => false,
  hasPermission: () => false,
  refresh: async () => {},
});

export function RolesProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getMyRoles();
      setRoles(data.roles);
      setPermissions(data.permissions);
    } catch {
      // User may not have any roles yet — that's fine
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasRole = (role: string) => roles.includes(role);
  const hasPermission = (perm: string) => permissions.includes(perm);

  return (
    <RolesContext.Provider value={{ roles, permissions, loading, hasRole, hasPermission, refresh }}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  return useContext(RolesContext);
}
