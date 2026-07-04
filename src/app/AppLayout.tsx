import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useRole } from "@/hooks/useRole";
import logo from "../assets/aiswarya.svg"
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Truck,
  AlertOctagon,
  Settings,
  LogOut,
  X,
  User,
  ShieldCheck,
  ChevronRight,
  Package,
  PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, logout } = useAuth();
  const { hasAnyRole, isSuperAdmin } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["sales_admin", "accounts", "manager", "super_admin"],
    },
    {
      name: "Customers",
      path: "/customers",
      icon: Users,
      roles: ["sales_admin", "accounts", "manager", "super_admin"],
    },
    {
      name: "Products Catalog",
      path: "/products",
      icon: Package,
      roles: ["sales_admin", "accounts", "manager", "super_admin"],
    },
    {
      name: "Sales Orders",
      path: "/orders",
      icon: ShoppingCart,
      roles: ["sales_admin", "accounts", "manager", "super_admin"],
    },
    {
      name: "Purchase Requests",
      path: "/purchase-requests",
      icon: Truck,
      roles: ["sales_admin", "manager", "super_admin"],
    },
    {
      name: "Complaints Queue",
      path: "/complaints",
      icon: AlertOctagon,
      roles: ["sales_admin", "accounts", "manager", "super_admin"],
    },
    {
      name: "User Management",
      path: "/admin",
      icon: Settings,
      roles: ["super_admin"],
    },
  ];

  const allowedNavItems = navItems.filter((item) => hasAnyRole(item.roles as any));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getIsActive = (path: string) => {
    if(path === "/"){
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }


  return (
    <div className="flex h-svh w-screen bg-background overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar backdrop-blur-md transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6  border-b">
          <div className="flex items-center gap-2">
            <div className=" bg-muted p-1.5 rounded-xl">
              <img className="w-8" src={logo} alt="logo" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-semibold leading-none">Aiswarya</h1>
              <h1 className="text-xs tracking-[2px] leading-none text-muted-foreground">Home</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          {allowedNavItems.map((item) => {
            const isActive = getIsActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon strokeWidth={1.5} className={`size-4.5 ${isActive ? "text-primary-foreground" : "text"}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 opacity-80" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t space-y-4">
          <div className="flex items-center gap-3 ">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || "User Account"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>


          <Button
            onClick={handleLogout}
            variant="destructive"
            className={'w-full'}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between px-6 border-b  bg-background backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="lg:hidden  rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-sm text-muted-foreground font-medium">
                {location.pathname === "/"
                  ? "Dashboard Overview"
                  : navItems.find((n) => n.path === location.pathname)?.name || "Management System"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <span className="hidden md:flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 px-2.5 py-0.5 text-xs font-semibold text-rose-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Super Admin Access
              </span>
            )}
            <div className="text-xs text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </header>

        {/* Content Page Container */}
        <main className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
