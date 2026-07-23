import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/utils/supabase"

export type AppRole = "sales_admin" | "accounts" | "manager" | "super_admin"

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  roles: AppRole[]
  loading: boolean
  error: string | null
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadedUserIdRef = useRef<string | null>(null)
  const fetchingUserIdRef = useRef<string | null>(null)

  const fetchCredentialsFromSupabase = async (userId: string) => {
    // 1. Fetch Profile
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileErr) throw profileErr

    if (profileData && !profileData.is_active) {
      return {
        profile: profileData,
        roles: [] as AppRole[],
        error: "Your account is deactivated. Please contact the administrator.",
      }
    }

    // 2. Fetch Roles
    const { data: rolesData, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)

    if (rolesErr) throw rolesErr

    const userRoles = (rolesData || []).map((r) => r.role as AppRole)
    return {
      profile: profileData,
      roles: userRoles,
      error: null,
    }
  }

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      const data = await fetchCredentialsFromSupabase(userId)
      setProfile(data.profile)
      setRoles(data.roles)
      setError(data.error)
      loadedUserIdRef.current = userId
    } catch (err: any) {
      console.error("Error loading profile or roles:", err)
      setError(err.message || "Failed to load user credentials.")
      setProfile(null)
      setRoles([])
      loadedUserIdRef.current = null
    }
  }

  const clearAuth = () => {
    setSession(null)
    setUser(null)
    setProfile(null)
    setRoles([])
    setError(null)
    loadedUserIdRef.current = null
    fetchingUserIdRef.current = null
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRoles(user.id)
    }
  }

  const logout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    clearAuth()
    setLoading(false)
  }

  useEffect(() => {
    let active = true

    const loadUserCredentials = async (
      userId: string,
      isInitial: boolean = false
    ) => {
      // If we already loaded this user's details, skip fetching
      if (loadedUserIdRef.current === userId) {
        if (active) setLoading(false)
        return
      }
      // If a fetch is already in progress for this user, do not start another one
      if (fetchingUserIdRef.current === userId) {
        return
      }

      fetchingUserIdRef.current = userId
      if (isInitial || loadedUserIdRef.current !== userId) {
        if (active) setLoading(true)
      }

      try {
        const data = await fetchCredentialsFromSupabase(userId)
        if (active) {
          setProfile(data.profile)
          setRoles(data.roles)
          setError(data.error)
          loadedUserIdRef.current = userId
        }
      } catch (err: any) {
        console.error("Error loading profile or roles:", err)
        if (active) {
          setError(err.message || "Failed to load user credentials.")
          setProfile(null)
          setRoles([])
          loadedUserIdRef.current = null
        }
      } finally {
        if (active) {
          fetchingUserIdRef.current = null
          setLoading(false)
        }
      }
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserCredentials(session.user.id, true)
      } else {
        setLoading(false)
      }
    })

    // Listen to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!active) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        loadUserCredentials(currentSession.user.id, false)
      } else {
        clearAuth()
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

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
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
