import React from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import type { AppRole } from "@/features/auth/useAuth";
import { useAuth } from "@/features/auth/useAuth";

interface RoleGuardProps {
  children: React.ReactNode;
  allow: AppRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allow,
  fallback = null,
  redirectTo,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAnyRole, loading: roleLoading } = useRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = hasAnyRole(allow);

  if (!isAllowed) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;
