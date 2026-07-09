import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Users,
  ShoppingBag,
  FileText,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  Truck,
} from "lucide-react"

export const Dashboard: React.FC = () => {
  const { profile } = useAuth()
  const { isSalesAdmin, isAccounts, isManager, isSuperAdmin } = useRole()
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all")

  // 1. Fetch metrics in parallel

  // Helper to apply time filter
  const applyTimeFilter = (query: any) => {
    if (timeFilter === "month") {
      const date = new Date()
      date.setMonth(date.getMonth() - 1)
      return query.gte("created_at", date.toISOString())
    } else if (timeFilter === "week") {
      const date = new Date()
      date.setDate(date.getDate() - 7)
      return query.gte("created_at", date.toISOString())
    }
    return query
  }

  const { data: products = [] } = useQuery({
    queryKey: ["dash-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*")
      if (error) throw error
      return data || []
    },
  })

  const { data: orders = [] } = useQuery({
    queryKey: ["dash-orders", profile?.id, timeFilter],
    queryFn: async () => {
      if (!profile) return []
      let query = supabase
        .from("orders")
        .select("*, customers(name), order_items(*)")
        .order("created_at", { ascending: false })

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("created_by", profile.id)
      } else if (isAccounts && !isSuperAdmin && !isManager) {
        query = query.neq("status", "enquiry")
      }

      query = applyTimeFilter(query)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!profile,
  })

  const { data: purchaseRequests = [] } = useQuery({
    queryKey: ["dash-prs", profile?.id, timeFilter],
    queryFn: async () => {
      if (!profile) return []
      let query = supabase
        .from("purchase_requests")
        .select("*, purchase_request_items (*)")
        .order("created_at", { ascending: false })

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("requested_by", profile.id)
      }

      query = applyTimeFilter(query)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!profile,
  })

  const { data: complaints = [] } = useQuery({
    queryKey: ["dash-complaints", profile?.id, timeFilter],
    queryFn: async () => {
      if (!profile) return []
      let query = supabase.from("complaints").select("*, customers(name)")

      if (!isSuperAdmin && !isManager) {
        query = query.or(
          `raised_by.eq.${profile.id},assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`
        )
      }

      query = applyTimeFilter(query)

      const { data, error } = await query.order("created_at", {
        ascending: false,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!profile,
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["dash-audit"],
    queryFn: async () => {
      if (!isSuperAdmin) return []
      const { data, error } = await supabase
        .from("audit_log")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(6)
      if (error) throw error
      return data || []
    },
    enabled: isSuperAdmin,
  })

  // Aggregated logic
  const lowStockProducts = products.filter((p) => p.stock_quantity <= 5)
  const activePrs = purchaseRequests.filter(
    (pr) => pr.status === "requested" || pr.status === "ordered"
  )
  const openComplaints = complaints.filter(
    (c) =>
      c.status === "open" ||
      c.status === "assigned" ||
      c.status === "in_progress"
  )

  const totalSalesRevenue = orders.reduce((sum, order) => {
    if (order.status === "cancelled") return sum
    const orderTotal = (order.order_items || []).reduce(
      (s: number, item: any) =>
        s + Number(item.quantity) * Number(item.unit_price),
      0
    )
    return sum + orderTotal
  }, 0)

  // Render role badges
  const roleLabels: string[] = []
  if (isSuperAdmin) roleLabels.push("Super Admin")
  if (isManager) roleLabels.push("Manager")
  if (isSalesAdmin) roleLabels.push("Sales Admin")
  if (isAccounts) roleLabels.push("Accounts")

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 to-indigo-950 p-6 text-background shadow-xl md:flex-row md:items-center md:justify-between md:p-8 ">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 space-y-2 text-white">
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            Welcome back, {profile?.full_name || "Operator"}!
          </h1>
          <p className=" max-w-xl text-xs font-light md:text-sm">
            Aiswarya Group Operations Control Center. Real-time updates and
            sales flow monitoring are active.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {roleLabels.map((lbl) => (
            <span
              key={lbl}
              className="flex items-center gap-1 rounded-full border bg-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Global Time Filter */}
      {isSuperAdmin &&
        isManager && (
          <div className="flex items-center justify-between gap-2 max-md:flex-col">
            <h2 className="text-sm font-bold tracking-wider  uppercase">
              Metrics Overview
            </h2>
            <div className="flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setTimeFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeFilter === "all"
                    ? "shadow-sm bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimeFilter("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeFilter === "month"
                    ? "shadow-sm bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeFilter("week")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeFilter === "week"
                    ? "shadow-sm bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                This Week
              </button>
            </div>
          </div>
        )}

      {/* RENDER VIEW BASED ON PRIMARY CAPABILITY */}

      {/* 1. SALES ADMIN DASHBOARD */}
      {isSalesAdmin && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Sales & Customer Operations Quick Deck
          </h2>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex h-36 flex-col justify-between p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">New Sales Enquiry</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Draft invoice, add barcode scans
                  </p>
                </div>
                <Button
                  render={<Link to="/orders/create" />}
                  size="sm"
                  className="h-8 self-start rounded-xl text-xs"
                >
                  Launch Checkout
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex h-36 flex-col justify-between p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Customer Directory</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add, search, review purchase logs
                  </p>
                </div>
                <Button
                  render={<Link to="/customers" />}
                  variant="outline"
                  size="sm"
                  className="h-8 self-start rounded-xl text-xs"
                >
                  Add Customer
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex h-36 flex-col justify-between p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">File Ticket Complaint</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Register issues, upload photo damages
                  </p>
                </div>
                <Button
                  render={<Link to="/complaints" />}
                  variant="outline"
                  size="sm"
                  className="h-8 self-start rounded-xl text-xs"
                >
                  Log Incident
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Recent Orders created by sales_admin */}
            <Card className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <CardHeader className="border-b p-5">
                <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                  <ShoppingBag className="h-4 w-4 text-indigo-500" />
                  Your Active Order Pipelines
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Most recent orders created in system.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {orders.length === 0 ? (
                  <p className="p-5 text-center text-xs text-muted-foreground">
                    No orders created yet.
                  </p>
                ) : (
                  <div className="max-h-72 divide-y overflow-y-auto">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/15"
                      >
                        <div className="space-y-0.5">
                          <Link
                            to={`/orders/${order.id}`}
                            className="font-mono text-xs font-semibold hover:underline"
                          >
                            {order.order_no}
                          </Link>
                          <span className="block text-[10px] text-muted-foreground">
                            Client: {order.customers?.name}
                          </span>
                        </div>
                        <StatusBadge
                          status={order.status}
                          type="order"
                          className="scale-90"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. ACCOUNTS DASHBOARD */}
      {isAccounts && !isSuperAdmin && !isManager && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Finance & Ledger Control Overview
          </h2>

          {/* Accounts Aggregate counters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Total Sales Ledger
                  </span>
                  <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    ₹
                    {totalSalesRevenue.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Invoices Pending Clearance
                  </span>
                  <h3 className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-500">
                    {orders.filter((o) => o.status === "invoice").length}
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <FileText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Invoices for Accounts review */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-sm dark:border-slate-800/85 dark:bg-slate-900">
            <CardHeader className="flex items-center justify-between border-b p-5">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Awaiting Payments / Clearance Invoices
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Please verify banking transcripts and sign off on completed
                  deliveries.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {orders.filter((o) => o.status === "invoice").length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  No invoices currently awaiting clearances.
                </p>
              ) : (
                <div className="divide-y">
                  {orders
                    .filter((o) => o.status === "invoice")
                    .map((order) => {
                      const totalAmt = (order.order_items || []).reduce(
                        (sum: number, item: any) =>
                          sum + Number(item.quantity) * Number(item.unit_price),
                        0
                      )
                      return (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                        >
                          <div>
                            <Link
                              to={`/orders/${order.id}`}
                              className="block font-mono text-xs font-semibold text-primary hover:underline"
                            >
                              {order.order_no}
                            </Link>
                            <span className="mt-0.5 block text-[10px] text-slate-500">
                              Client: {order.customers?.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                              ₹
                              {totalAmt.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <span className="mt-0.5 block text-[9px] text-muted-foreground">
                              Invoice Stage
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. MANAGER DASHBOARD */}
      {(isManager || isSuperAdmin) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Global Managerial Operations deck
            </h2>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="shadow-sm">
              <CardContent className="flex h-24 flex-col justify-between p-4">
                <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Gross Sales (Net)
                </span>
                <div className="mt-2 flex items-end justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    ₹
                    {totalSalesRevenue.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </h3>
                  <TrendingUp className="mb-0.5 h-4 w-4 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="flex h-24 flex-col justify-between p-4">
                <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Low Stock products
                </span>
                <div className="mt-2 flex items-end justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {lowStockProducts.length}
                  </h3>
                  <AlertTriangle className="mb-0.5 h-4 w-4 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="flex h-24 flex-col justify-between p-4">
                <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Procurement Pipeline
                </span>
                <div className="mt-2 flex items-end justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {activePrs.length}
                  </h3>
                  <Truck className="mb-0.5 h-4 w-4 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="flex h-24 flex-col justify-between p-4">
                <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Open Complaint Cases
                </span>
                <div className="mt-2 flex items-end justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {openComplaints.length}
                  </h3>
                  <AlertTriangle className="mb-0.5 h-4 w-4 text-rose-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Purchase requests awaiting approval */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b p-5">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                    <Truck className="h-4 w-4 text-primary" />
                    Pending Purchase Requests (
                    {
                      purchaseRequests.filter((r) => r.status === "requested")
                        .length
                    }
                    )
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Requests needing approval or purchase order updates.
                  </CardDescription>
                </div>
                <Button
                  render={<Link to="/purchase-requests" />}
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {purchaseRequests.filter((r) => r.status === "requested")
                  .length === 0 ? (
                  <p className="p-5 text-center text-xs text-muted-foreground">
                    No pending purchase approvals.
                  </p>
                ) : (
                  <div className="divide-y">
                    {purchaseRequests
                      .filter((r) => r.status === "requested")
                      .slice(0, 5)
                      .map((pr) => (
                        <div
                          key={pr.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                        >
                          <div>
                            <span className="block font-mono text-xs font-bold">
                              {pr.request_no}
                            </span>
                            <span className="text-slate-650 mt-0.5 block text-[10px] dark:text-slate-400">
                              {pr.purchase_request_items?.[0]
                                ? `${pr.purchase_request_items[0].product_name} (x${pr.purchase_request_items[0].quantity})${pr.purchase_request_items.length > 1 ? ` (+${pr.purchase_request_items.length - 1} more)` : ""}`
                                : "No items"}
                            </span>
                          </div>
                          <Button
                            render={<Link to="/purchase-requests" />}
                            size="sm"
                            className="h-7 rounded-lg px-2.5 text-[10px]"
                          >
                            Review
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unassigned / Open Complaints */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b p-5">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-rose-500">
                    <AlertTriangle className="h-4 w-4" />
                    Unassigned Incident Complaints (
                    {complaints.filter((c) => c.status === "open").length})
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    New complaints needing assignment or review.
                  </CardDescription>
                </div>
                <Button
                  render={<Link to="/complaints" />}
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {complaints.filter((c) => c.status === "open").length === 0 ? (
                  <p className="p-5 text-center text-xs text-muted-foreground">
                    No open complaints awaiting assignments.
                  </p>
                ) : (
                  <div className="divide-y">
                    {complaints
                      .filter((c) => c.status === "open")
                      .slice(0, 5)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                        >
                          <div>
                            <span className="block font-mono text-xs font-bold">
                              {c.complaint_no}
                            </span>
                            <span className="text-slate-655 mt-0.5 block max-w-[180px] truncate text-[10px] dark:text-slate-400">
                              {c.subject} (Client: {c.customers?.name})
                            </span>
                          </div>
                          <Button
                            render={<Link to={`/complaints/${c.id}`} />}
                            size="sm"
                            className="h-7 rounded-lg px-2.5 text-[10px]"
                          >
                            Assign
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 4. SUPER ADMIN SYSTEM STATISTICS TRAIL */}
      {isSuperAdmin && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Super Admin Control Hub Summary
              </h2>
              <p className="text-xs text-muted-foreground">
                Monitor system auditing trails and system metadata logs.
              </p>
            </div>

            <Button
              render={<Link to="/admin" />}
              size="sm"
              className="flex items-center gap-1.5 rounded-xl shadow"
            >
              <UserCheck className="h-4 w-4" />
              Manage Staff & Roles
            </Button>
          </div>

          {/* Audit trail preview */}
          <Card className="shadow-sm">
            <CardHeader className="border-b p-5">
              <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Recent System Audit logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <p className="p-5 text-center text-xs text-muted-foreground">
                  No logs recorded.
                </p>
              ) : (
                <div className="divide-y">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-4 text-xs hover:bg-muted/50"
                    >
                      <div className="max-w-[70%] space-y-1">
                        <span className="block font-bold">{log.action}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          Actor: {log.profiles?.full_name || "System"} | Entity:{" "}
                          {log.entity_type}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Dashboard
