import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, ShoppingBag, Plus, Calendar, ArrowUpRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import PaginationUI from "@/components/PaginationUI"

const items = [
  { label: "All Statuses", value: "all" },
  { label: "Enquiry", value: "enquiry" },
  { label: "Quotation", value: "quotation" },
  { label: "Invoice", value: "invoice" },
  { label: "Purchase", value: "purchase" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

export const OrderList: React.FC = () => {
  const { isSalesAdmin, isAccounts, isManager, isSuperAdmin } = useRole()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Super Admin / Manager Sort & Filter states
  const [operatorFilter, setOperatorFilter] = useState<string>("all")
  const [daysFilter, setDaysFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const canCreate = isSalesAdmin || isSuperAdmin

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Metrics Query
  const { data: orderMetrics = [] } = useQuery({
    queryKey: ["orders-metrics", user?.id],
    queryFn: async () => {
      if (!user) return []
      let query = supabase.from("orders").select("id, status")
      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("created_by", user.id)
      } else if (isAccounts && !isSuperAdmin && !isManager) {
        query = query.neq("status", "enquiry")
      }
      const { data } = await query
      return data || []
    },
    enabled: !!user,
  })

  // Fetch profiles for created_by filter (super admin/manager only)
  const { data: profilesList = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
      if (error) throw error
      return data || []
    },
    enabled: isSuperAdmin || isManager,
  })

  // Fetch orders
  const { data: { orders = [], totalCount = 0 } = {}, isLoading } = useQuery({
    queryKey: [
      "orders",
      user?.id,
      page,
      debouncedSearchTerm,
      statusFilter,
      pageSize,
      operatorFilter,
      daysFilter,
      sortBy,
    ],
    queryFn: async () => {
      if (!user) return { orders: [], totalCount: 0 }
      let query = supabase.from("orders").select(
        `
          *,
          customers (name),
          order_items (*),
          profiles (full_name)
        `,
        { count: "exact" }
      )

      if (debouncedSearchTerm) {
        // Simple search by order_no
        query = query.ilike("order_no", `%${debouncedSearchTerm}%`)
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("created_by", user.id)
      } else if (isAccounts && !isSuperAdmin && !isManager) {
        query = query.neq("status", "enquiry")
      }

      // Operator filter (super admin and manager only)
      if ((isSuperAdmin || isManager) && operatorFilter !== "all") {
        query = query.eq("created_by", operatorFilter)
      }

      // Days filter (super admin and manager only)
      if ((isSuperAdmin || isManager) && daysFilter !== "all") {
        const days = parseInt(daysFilter)
        if (!isNaN(days)) {
          const dateLimit = new Date()
          dateLimit.setDate(dateLimit.getDate() - days)
          query = query.gte("created_at", dateLimit.toISOString())
        }
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Sort logic
      if ((isSuperAdmin || isManager) && sortBy === "operator-asc") {
        query = query.order("created_by", { ascending: true })
      } else if ((isSuperAdmin || isManager) && sortBy === "date-asc") {
        query = query.order("created_at", { ascending: true })
      } else {
        // Default to newest first
        query = query.order("created_at", { ascending: false })
      }

      const { data, count, error } = await query.range(from, to)

      if (error) throw error
      return { orders: data || [], totalCount: count || 0 }
    },
    enabled: !!user,
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setOperatorFilter("all")
    setDaysFilter("all")
    setSortBy("date-desc")
    setPage(1)
    setPageSize(10)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sales Orders
          </h1>
          <p className="text-muted-foreground">
            Monitor enquiry pipelines, invoices, and completed transactions.
          </p>
        </div>

        {canCreate && (
          <Button render={<Link to="/orders/create" />} nativeButton={false}>
            <Plus className="h-4 w-4" />
            New Sales Order
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-950/30">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Total Orders
            </span>
            <h3 className="mt-0.5 text-xl font-bold">{orderMetrics.length}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-950/30">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Active Pipelines
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {
                orderMetrics.filter(
                  (o) => o.status !== "completed" && o.status !== "cancelled"
                ).length
              }
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>
          <div className="flex md:items-center gap-2 max-md:flex-col">
            <div className="grid w-full max-w-xl grid-cols-2 gap-2 lg:grid-cols-4">
              <Select
                defaultValue={items[0]}
                value={statusFilter}
                items={items}
                onValueChange={(value: any) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={"w-full"}>
                  <SelectGroup>
                    <SelectLabel>Statuses</SelectLabel>
                    {items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {(isSuperAdmin || isManager) && (
                <>
                  <Select
                    value={
                      profilesList.find((p: any) => p.id === operatorFilter)
                        ?.full_name || "All Operators"
                    }
                    onValueChange={(value: any) => {
                      setOperatorFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Operators" />
                    </SelectTrigger>
                    <SelectContent className={"w-full"}>
                      <SelectGroup>
                        <SelectLabel>Operators</SelectLabel>
                        <SelectItem value="all">All Operators</SelectItem>
                        {profilesList.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={daysFilter}
                    onValueChange={(value: any) => {
                      setDaysFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent className={"w-full"}>
                      <SelectGroup>
                        <SelectLabel>Time Period</SelectLabel>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="1">Last 24 Hours</SelectItem>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => {
                      setSortBy(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className={"w-full"}>
                      <SelectGroup>
                        <SelectLabel>Sort By</SelectLabel>
                        <SelectItem value="date-desc">
                          Date (Newest First)
                        </SelectItem>
                        <SelectItem value="date-asc">
                          Date (Oldest First)
                        </SelectItem>
                        <SelectItem value="operator-asc">
                          Operator (Grouped)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <Button onClick={clearAllFilters}>Clear All</Button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Loading sales orders...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No orders found matching filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Order No</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  {(isSuperAdmin || isManager) && (
                    <TableHead className="font-semibold">Operator</TableHead>
                  )}
                  <TableHead className="font-semibold">Order Items</TableHead>
                  <TableHead className="font-semibold">Total Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const itemsSummary = (order.order_items || [])
                    .map((item: any) => `${item.item_name} (x${item.quantity})`)
                    .join(", ")

                  const orderTotal = (order.order_items || []).reduce(
                    (sum: number, item: any) =>
                      sum + Number(item.quantity) * Number(item.unit_price),
                    0
                  )

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {order.order_no}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link
                          to={`/customers/${order.customer_id}`}
                          className="text-slate-900 hover:underline dark:text-white"
                        >
                          {order.customers?.name || "Unknown Customer"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      {(isSuperAdmin || isManager) && (
                        <TableCell className="text-xs font-medium">
                          {order.profiles?.full_name || "System"}
                        </TableCell>
                      )}
                      <TableCell
                        className="max-w-[200px] truncate text-xs"
                        title={itemsSummary}
                      >
                        {itemsSummary || "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹
                        {orderTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} type="order" />
                      </TableCell>
                      <TableCell>
                        <Button
                          render={<Link to={`/orders/${order.id}`} />}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 rounded-xl"
                          nativeButton={false}
                        >
                          Details
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationUI
            page={page}
            setPage={setPage}
            totalCount={totalCount}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        )}
      </div>
    </div>
  )
}

export default OrderList
