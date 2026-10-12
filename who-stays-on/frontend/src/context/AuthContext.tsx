import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "@/services/api";
import type { Role, User } from "@/types/api";

const RANK: Record<Role, number> = { committee: 0, secretary: 1, admin: 2 };

interface AuthState {
  user: User | null;
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (role: Role) => boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && (e.status === 401 || e.status === 403))) console.warn(e);
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setUser(await api.login(username, password));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const can = useCallback((role: Role) => !!user && RANK[user.role] >= RANK[role], [user]);
  const value = useMemo(() => ({ user, checking, login, logout, can }), [user, checking, login, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
