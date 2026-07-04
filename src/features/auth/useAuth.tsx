import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

export type AppRole = 'sales_admin' | 'accounts' | 'manager' | 'super_admin';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileErr) throw profileErr;

      if (profileData && !profileData.is_active) {
        setProfile(profileData);
        setRoles([]);
        setError("Your account is deactivated. Please contact the administrator.");
        return;
      }

      setProfile(profileData);

      // 2. Fetch Roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesErr) throw rolesErr;

      const userRoles = (rolesData || []).map((r) => r.role as AppRole);
      setRoles(userRoles);
      setError(null);
    } catch (err: any) {
      console.error("Error loading profile or roles:", err);
      setError(err.message || "Failed to load user credentials.");
      setProfile(null);
      setRoles([]);
    }
  };

  const clearAuth = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setError(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRoles(user.id);
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    clearAuth();
    setLoading(false);
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndRoles(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setLoading(true);
          await fetchProfileAndRoles(currentSession.user.id);
          setLoading(false);
        } else {
          clearAuth();
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        error,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
