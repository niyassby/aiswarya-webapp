import { useAuth, type AppRole } from "@/features/auth/useAuth"

export function useRole() {
  const { roles, loading } = useAuth()

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role)
  }

  const hasAnyRole = (allowedRoles: AppRole[]): boolean => {
    return allowedRoles.some((r) => roles.includes(r))
  }

  return {
    roles,
    loading,
    hasRole,
    hasAnyRole,
    isSalesAdmin: roles.includes("sales_admin"),
    isAccounts: roles.includes("accounts"),
    isManager: roles.includes("manager"),
    isSuperAdmin: roles.includes("super_admin"),
  }
}
