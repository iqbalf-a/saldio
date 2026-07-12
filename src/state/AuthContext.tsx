import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadAccessToken, loadProfile, saveAccessToken, saveProfile } from "../lib/storage";
import type { UserProfile } from "../lib/types";

interface AuthState {
  /** null = belum login; profile tersimpan berarti sesi aktif */
  profile: UserProfile | null;
  accessToken: string | null;
  /** true selama sesi tersimpan masih dibaca dari AsyncStorage */
  restoring: boolean;
  /** Mode Tamu — menjelajah dengan data contoh, tanpa sinkron Drive */
  isGuest: boolean;
  signIn: (profile: UserProfile, accessToken: string) => Promise<void>;
  /** Mode lokal tanpa Google — data hanya di perangkat */
  signInOffline: () => Promise<void>;
  /** Mode Tamu dengan data contoh */
  signInGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const OFFLINE_PROFILE: UserProfile = { name: "Pengguna Lokal", email: "offline" };
export const GUEST_PROFILE: UserProfile = { name: "Andi Pratama", email: "guest" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([loadProfile(), loadAccessToken()]);
      setProfile(p);
      setAccessToken(t);
      setRestoring(false);
    })();
  }, []);

  const signIn = useCallback(async (p: UserProfile, token: string) => {
    setProfile(p);
    setAccessToken(token);
    await Promise.all([saveProfile(p), saveAccessToken(token)]);
  }, []);

  const signInOffline = useCallback(async () => {
    setProfile(OFFLINE_PROFILE);
    setAccessToken(null);
    await Promise.all([saveProfile(OFFLINE_PROFILE), saveAccessToken(null)]);
  }, []);

  const signInGuest = useCallback(async () => {
    setProfile(GUEST_PROFILE);
    setAccessToken(null);
    await Promise.all([saveProfile(GUEST_PROFILE), saveAccessToken(null)]);
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    setAccessToken(null);
    await Promise.all([saveProfile(null), saveAccessToken(null)]);
  }, []);

  const isGuest = profile?.email === GUEST_PROFILE.email;

  const value = useMemo(
    () => ({ profile, accessToken, restoring, isGuest, signIn, signInOffline, signInGuest, signOut }),
    [profile, accessToken, restoring, isGuest, signIn, signInOffline, signInGuest, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
