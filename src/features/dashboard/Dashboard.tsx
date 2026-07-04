import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/features/auth/useAuth";
import { useRole } from "@/hooks/useRole";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Truck
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { isSalesAdmin, isAccounts, isManager, isSuperAdmin } = useRole();
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all");

  // 1. Fetch metrics in parallel

  // Helper to apply time filter
  const applyTimeFilter = (query: any) => {
    if (timeFilter === "month") {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return query.gte("created_at", date.toISOString());
    } else if (timeFilter === "week") {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return query.gte("created_at", date.toISOString());
    }
    return query;
  };

  const { data: products = [] } = useQuery({
    queryKey: ["dash-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["dash-orders", profile?.id, timeFilter],
    queryFn: async () => {
      if (!profile) return [];
      let query = supabase
        .from("orders")
        .select("*, customers(name), order_items(*)")
        .order("created_at", { ascending: false });

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("created_by", profile.id);
      } else if (isAccounts && !isSuperAdmin && !isManager) {
        query = query.neq("status", "enquiry");
      }

      query = applyTimeFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: purchaseRequests = [] } = useQuery({
    queryKey: ["dash-prs", profile?.id, timeFilter],
    queryFn: async () => {
      if (!profile) return [];
      let query = supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("requested_by", profile.id);
      }

      query = applyTimeFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["dash-complaints", profile?.id, timeFilter],
    queryFn: async () => {
      if (!profile) return [];
      let query = supabase
        .from("complaints")
        .select("*, customers(name)")
      
      if (!isSuperAdmin && !isManager) {
        query = query.or(`raised_by.eq.${profile.id},assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`);
      }

      query = applyTimeFilter(query);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["dash-audit"],
    queryFn: async () => {
      if (!isSuperAdmin) return [];
      const { data, error } = await supabase
        .from("audit_log")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Aggregated logic
  const lowStockProducts = products.filter((p) => p.stock_quantity <= 5);
  const activePrs = purchaseRequests.filter((pr) => pr.status === "requested" || pr.status === "ordered");
  const openComplaints = complaints.filter((c) => c.status === "open" || c.status === "assigned" || c.status === "in_progress");

  const totalSalesRevenue = orders.reduce((sum, order) => {
    if (order.status === "cancelled") return sum;
    const orderTotal = (order.order_items || []).reduce(
      (s: number, item: any) => s + Number(item.quantity) * Number(item.unit_price),
      0
    );
    return sum + orderTotal;
  }, 0);

  // Render role badges
  const roleLabels: string[] = [];
  if (isSuperAdmin) roleLabels.push("Super Admin");
  if (isManager) roleLabels.push("Manager");
  if (isSalesAdmin) roleLabels.push("Sales Admin");
  if (isAccounts) roleLabels.push("Accounts");

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 dark:from-slate-200 dark:to-indigo-800 to-indigo-950 p-6 md:p-8 rounded-3xl text-background shadow-xl relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        
        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Welcome back, {profile?.full_name || "Operator"}!
          </h1>
          <p className="text-xs md:text-sm text-slate-350 max-w-xl font-light">
            Aiswarya Group Operations Control Center. Real-time updates and sales flow monitoring are active.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10">
          {roleLabels.map((lbl) => (
            <span
              key={lbl}
              className="text-[10px] text-white  uppercase font-bold tracking-widest bg-white/10  border px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Global Time Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Metrics Overview</h2>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setTimeFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeFilter === "all" ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeFilter("month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeFilter === "month" ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeFilter("week")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeFilter === "week" ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            This Week
          </button>
        </div>
      </div>

      {/* RENDER VIEW BASED ON PRIMARY CAPABILITY */}

      {/* 1. SALES ADMIN DASHBOARD */}
      {isSalesAdmin && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sales & Customer Operations Quick Deck</h2>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow rounded-2xl bg-card">
              <CardContent className="p-5 flex flex-col justify-between h-36">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">New Sales Enquiry</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Draft invoice, add barcode scans</p>
                </div>
                <Button render={<Link to="/orders/create" />} size="sm" className="rounded-xl self-start text-xs h-8">
                  Launch Checkout
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow  rounded-2xl bg-card">
              <CardContent className="p-5 flex flex-col justify-between h-36">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Customer Directory</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Add, search, review purchase logs</p>
                </div>
                <Button render={<Link to="/customers" />} variant="outline" size="sm" className="rounded-xl self-start text-xs h-8">
                  Open Directory
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow  rounded-2xl bg-card">
              <CardContent className="p-5 flex flex-col justify-between h-36">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">File Ticket Complaint</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Register issues, upload photo damages</p>
                </div>
                <Button render={<Link to="/complaints" />} variant="outline" size="sm" className="rounded-xl self-start text-xs h-8">
                  Log Incident
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low stock alerts */}
            <Card className="rounded-2xl bg-card overflow-hidden shadow-sm">
              <CardHeader className="border-b  p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-destructive ">
                    <AlertTriangle className="h-4 w-4" />
                    Low Inventory Alerts
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Products with 5 units or less remaining.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {lowStockProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-5 text-center">All catalog stock quantities are stable.</p>
                ) : (
                  <div className="divide-y  max-h-72 overflow-y-auto">
                    {lowStockProducts.map((p) => (
                      <div key={p.id} className="p-4 flex items-center justify-between ">
                        <div>
                          <span className="font-semibold text-xs  block">{p.name}</span>
                          <span className="text-[10px]  block mt-0.5">EAN: {p.barcode || "N/A"}</span>
                        </div>
                        <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-550/20">
                          {p.stock_quantity} remaining
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders created by sales_admin */}
            <Card className="rounded-2xl bg-card overflow-hidden shadow-sm">
              <CardHeader className="border-b p-5">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-indigo-500" />
                  Your Active Order Pipelines
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Most recent orders created in system.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {orders.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-5 text-center">No orders created yet.</p>
                ) : (
                  <div className="divide-y max-h-72 overflow-y-auto">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-950/15">
                        <div className="space-y-0.5">
                          <Link to={`/orders/${order.id}`} className="font-semibold font-mono text-xs hover:underline ">
                            {order.order_no}
                          </Link>
                          <span className="text-[10px] text-muted-foreground block">Client: {order.customers?.name}</span>
                        </div>
                        <StatusBadge status={order.status} type="order" className="scale-90" />
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Finance & Ledger Control Overview</h2>

          {/* Accounts Aggregate counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className=" shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sales Ledger</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{totalSalesRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className=" shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoices Pending Clearance</span>
                  <h3 className="text-2xl font-black text-amber-600 dark:text-amber-500 mt-1">
                    {orders.filter((o) => o.status === "invoice").length}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Invoices for Accounts review */}
          <Card className="rounded-2xl border border-slate-200/85 dark:border-slate-800/85 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <CardHeader className="border-b   p-5 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Awaiting Payments / Clearance Invoices
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Please verify banking transcripts and sign off on completed deliveries.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {orders.filter((o) => o.status === "invoice").length === 0 ? (
                <p className="text-xs text-muted-foreground p-6 text-center">No invoices currently awaiting clearances.</p>
              ) : (
                <div className="divide-y ">
                  {orders
                    .filter((o) => o.status === "invoice")
                    .map((order) => {
                      const totalAmt = (order.order_items || []).reduce(
                        (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unit_price),
                        0
                      );
                      return (
                        <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                          <div>
                            <Link to={`/orders/${order.id}`} className="font-semibold font-mono text-xs text-primary hover:underline block">
                              {order.order_no}
                            </Link>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Client: {order.customers?.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-xs block text-slate-800 dark:text-slate-200">
                              ₹{totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5 block">Invoice Stage</span>
                          </div>
                        </div>
                      );
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Global Managerial Operations deck</h2>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className=" shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-24">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Gross Sales (Net)</span>
                <div className="flex justify-between items-end mt-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">₹{totalSalesRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</h3>
                  <TrendingUp className="h-4 w-4 text-emerald-500 mb-0.5" />
                </div>
              </CardContent>
            </Card>

            <Card className=" shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-24">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Low Stock products</span>
                <div className="flex justify-between items-end mt-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{lowStockProducts.length}</h3>
                  <AlertTriangle className="h-4 w-4 text-amber-500 mb-0.5" />
                </div>
              </CardContent>
            </Card>

            <Card className=" shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-24">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Procurement Pipeline</span>
                <div className="flex justify-between items-end mt-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{activePrs.length}</h3>
                  <Truck className="h-4 w-4 text-indigo-500 mb-0.5" />
                </div>
              </CardContent>
            </Card>

            <Card className=" shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-24">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Open Complaint Cases</span>
                <div className="flex justify-between items-end mt-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{openComplaints.length}</h3>
                  <AlertTriangle className="h-4 w-4 text-rose-500 mb-0.5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase requests awaiting approval */}
            <Card className="shadow-sm">
              <CardHeader className="border-b   p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-primary" />
                    Pending Purchase Requests ({purchaseRequests.filter((r) => r.status === "requested").length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Requests needing approval or purchase order updates.</CardDescription>
                </div>
                <Button render={<Link to="/purchase-requests" />} variant="ghost" size="sm" className="h-8 text-xs rounded-lg">
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {purchaseRequests.filter((r) => r.status === "requested").length === 0 ? (
                  <p className="text-xs text-muted-foreground p-5 text-center">No pending purchase approvals.</p>
                ) : (
                  <div className="divide-y ">
                    {purchaseRequests
                       .filter((r) => r.status === "requested")
                       .slice(0, 5)
                       .map((pr) => (
                        <div key={pr.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                          <div>
                            <span className="font-mono font-bold text-xs block">{pr.request_no}</span>
                            <span className="text-[10px] text-slate-650 dark:text-slate-400 mt-0.5 block">
                              {pr.product_name} (x{pr.quantity})
                            </span>
                          </div>
                          <Button render={<Link to="/purchase-requests" />} size="sm" className="rounded-lg h-7 text-[10px] px-2.5">
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
              <CardHeader className="border-b   p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-rose-500">
                    <AlertTriangle className="h-4 w-4" />
                    Unassigned Incident Complaints ({complaints.filter((c) => c.status === "open").length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">New complaints needing assignment or review.</CardDescription>
                </div>
                <Button render={<Link to="/complaints" />} variant="ghost" size="sm" className="h-8 text-xs rounded-lg">
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {complaints.filter((c) => c.status === "open").length === 0 ? (
                  <p className="text-xs text-muted-foreground p-5 text-center">No open complaints awaiting assignments.</p>
                ) : (
                  <div className="divide-y ">
                    {complaints
                       .filter((c) => c.status === "open")
                       .slice(0, 5)
                       .map((c) => (
                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                          <div>
                            <span className="font-mono font-bold text-xs block">{c.complaint_no}</span>
                            <span className="text-[10px] text-slate-655 dark:text-slate-400 mt-0.5 block truncate max-w-[180px]">
                              {c.subject} (Client: {c.customers?.name})
                            </span>
                          </div>
                          <Button render={<Link to={`/complaints/${c.id}`} />} size="sm" className="rounded-lg h-7 text-[10px] px-2.5">
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
        <div className="pt-4  space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Super Admin Control Hub Summary</h2>
              <p className="text-xs text-muted-foreground">Monitor system auditing trails and system metadata logs.</p>
            </div>
            
            <Button render={<Link to="/admin" />} size="sm" className="rounded-xl flex items-center gap-1.5 shadow">
              <UserCheck className="h-4 w-4" />
              Manage Staff & Roles
            </Button>
          </div>

          {/* Audit trail preview */}
          <Card className="shadow-sm">
            <CardHeader className="border-b   p-5">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Recent System Audit logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground p-5 text-center">No logs recorded.</p>
              ) : (
                <div className="divide-y ">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start justify-between text-xs hover:bg-muted/50">
                      <div className="space-y-1 max-w-[70%]">
                        <span className="font-bold  block">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Actor: {log.profiles?.full_name || "System"} | Entity: {log.entity_type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
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
  );
};

export default Dashboard;
