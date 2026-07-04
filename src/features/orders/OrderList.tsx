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

const items = [
  { label: "All Statuses", value: "all" },
  { label: "Enquiry", value: "enquiry" },
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

  const canCreate = isSalesAdmin || isSuperAdmin

  const [page, setPage] = useState(1)
  const pageSize = 10

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

  // Fetch orders
  const { data: { orders = [], totalCount = 0 } = {}, isLoading } = useQuery({
    queryKey: ["orders", user?.id, page, debouncedSearchTerm, statusFilter],
    queryFn: async () => {
      if (!user) return { orders: [], totalCount: 0 }
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          customers (name),
          order_items (*)
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

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error
      return { orders: data || [], totalCount: count || 0 }
    },
    enabled: !!user,
  })

  const totalPages = Math.ceil(totalCount / pageSize)

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
          <Button
            render={<Link to="/orders/create" />}
            className="flex items-center gap-2 rounded-xl shadow-md"
          >
            <Plus className="h-4 w-4" />
            New Sales Order
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm bg-card">
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

        <div className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm bg-card">
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
        <div className="flex flex-col items-center justify-between gap-4 border-b p-5 sm:flex-row">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="rounded-xl pl-10"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto w-full">
            <Select defaultValue={items[0]} value={statusFilter} items={items} onValueChange={(value:any) => {
                setStatusFilter(value)
                setPage(1)
              }}>
      <SelectTrigger className="w-full md:max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
                <TableRow >
                  <TableHead className="font-semibold">Order No</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
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
                    <TableRow
                      key={order.id}
                    >
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
          <div className="flex items-center justify-between border-t  p-4 ">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages > 5 ? 5 : totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                      page === i + 1
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderList
