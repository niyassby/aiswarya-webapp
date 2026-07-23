import React, { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
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
  ChevronRight,
  Package,
  PanelLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationDropdown } from "@/components/NotificationDropdown"

interface NavItem {
  name: string
  path: string
  icon: React.ComponentType<any>
  roles: string[]
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, profile, logout } = useAuth()
  const { hasAnyRole } = useRole()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)

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
      name: "Products Catalog",
      path: "/products",
      icon: Package,
      roles: ["sales_admin", "accounts", "manager", "super_admin"],
    },
    {
      name: "User Management",
      path: "/admin",
      icon: Settings,
      roles: ["super_admin"],
    },
  ]

  const allowedNavItems = navItems.filter((item) =>
    hasAnyRole(item.roles as any)
  )

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  const getIsActive = (path: string) => {
    if (path === "/") {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  useEffect(() => {
    const scrollToTop = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
      }
    }
    scrollToTop()
  }, [location.pathname])

  return (
    <div className="flex h-svh w-screen overflow-hidden bg-background font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 animate-in bg-foreground/60 backdrop-blur-sm duration-200 fade-in lg:hidden"
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
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-muted p-1.5 dark:bg-accent-foreground">
              <img className="w-8" src={logo} alt="logo" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg leading-none font-semibold">Aiswarya</h1>
              <h1 className="text-xs leading-none tracking-[2px] text-muted-foreground">
                Home
              </h1>
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
            const isActive = getIsActive(item.path)
            const Icon = item.icon
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
                  <Icon
                    strokeWidth={1.5}
                    className={`size-4.5 ${isActive ? "text-primary-foreground" : "text"}`}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 opacity-80" />}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="space-y-4 border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {profile?.full_name || "User Account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className={"w-full"}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {isMobile && (
        <nav className="fixed bottom-0 z-30 w-full border-t bg-background py-4">
          <div className="flex items-center justify-between px-6">
            {allowedNavItems.map((item, i) => {
              const isActive = getIsActive(item.path)
              const Icon = item.icon
              return (
                <Button
                  variant={isActive ? "default" : "ghost"}
                  key={i}
                  size={"icon-lg"}
                  className={"size-11"}
                  nativeButton={false}
                  render={
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                    />
                  }
                >
                  <Icon strokeWidth={1.6} className="size-4.5" />
                </Button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-lg lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">
                {location.pathname === "/"
                  ? "Dashboard Overview"
                  : navItems.find((n) => n.path === location.pathname)?.name ||
                    "Management System"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationDropdown />
          </div>
        </header>

        {/* Content Page Container */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-background p-6 md:p-8"
        >
          <div className="mx-auto max-w-7xl">{children}</div>
          {isMobile && <div className="h-18"></div>}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
