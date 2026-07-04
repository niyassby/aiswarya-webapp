import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/utils/supabase"
import { useRole } from "@/hooks/useRole"
import { useAuth } from "@/features/auth/useAuth"
import { toast } from "@/components/ui/toast"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Truck,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react"


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
  { label: "All", value: "all" },
  { label: "Requested", value: "requested" },
  { label: "Ordered", value: "ordered" },
  { label: "Received", value: "received" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Cancelled", value: "cancelled" },
]

// Form Schema
const prSchema = z.object({
  product_name: z.string().min(2, "Product name must be at least 2 characters"),
  specs: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  supplier_info: z.string().optional().or(z.literal("")),
  expected_date: z.string().optional().or(z.literal("")),
})

type PrFormValues = z.infer<typeof prSchema>

export const PurchaseRequestList: React.FC = () => {
  const queryClient = useQueryClient()
  const { isSalesAdmin, isManager, isSuperAdmin } = useRole()
  const { profile } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const canCreate = isSalesAdmin || isManager || isSuperAdmin
  const canApprove = isManager || isSuperAdmin

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrFormValues>({
    resolver: zodResolver(prSchema) as any,
    defaultValues: {
      product_name: "",
      specs: "",
      quantity: 1,
      supplier_info: "",
      expected_date: "",
    },
  })

  // Queries
  // Separate query for metrics/counters
  const { data: prMetrics = [] } = useQuery({
    queryKey: ["purchase-requests-metrics", profile?.id],
    queryFn: async () => {
      if (!profile) return []
      let query = supabase.from("purchase_requests").select("id, status")
      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("requested_by", profile.id)
      }
      const { data } = await query
      return data || []
    },
    enabled: !!profile,
  })

  const { data: { purchaseRequests = [], totalCount = 0 } = {}, isLoading } = useQuery({
    queryKey: ["purchase-requests", profile?.id, page, searchTerm, statusFilter],
    queryFn: async () => {
      if (!profile) return { purchaseRequests: [], totalCount: 0 }
      let query = supabase
        .from("purchase_requests")
        .select(
          `
          *,
          orders (order_no),
          profiles (full_name)
        `,
          { count: "exact" }
        )

      if (searchTerm) {
        query = query.or(`request_no.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`)
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("requested_by", profile.id)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) throw error
      return { purchaseRequests: data || [], totalCount: count || 0 }
    },
    enabled: !!profile,
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  const { data: products = [] } = useQuery({
    queryKey: ["products-pr-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name")
      if (error) throw error
      return data || []
    },
  })


  // Mutations
  const createPrMutation = useMutation({
    mutationFn: async (values: PrFormValues) => {
      const { data, error } = await supabase.from("purchase_requests").insert([
        {
          product_name: values.product_name,
          specs: values.specs || null,
          quantity: values.quantity,
          supplier_info: values.supplier_info || null,
          expected_date: values.expected_date || null,
          requested_by: profile?.id,
          status: "requested",
        },
      ])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
      toast.success("Purchase request created!")
      setAddDialogOpen(false)
      reset()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create request")
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      prId,
      nextStatus,
    }: {
      prId: string
      nextStatus: string
    }) => {
      const targetPr = purchaseRequests.find((r) => r.id === prId)
      if (!targetPr) return

      // Update PR status
      const { error: prErr } = await supabase
        .from("purchase_requests")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", prId)
      if (prErr) throw prErr

      // If marked as received, increment product stock if match exists
      if (nextStatus === "received") {
        const matchProduct = products.find(
          (p) => p.name.toLowerCase() === targetPr.product_name.toLowerCase()
        )
        if (matchProduct) {
          const { error: stockErr } = await supabase
            .from("products")
            .update({
              stock_quantity: matchProduct.stock_quantity + targetPr.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchProduct.id)
          if (stockErr) throw stockErr

          // Log to audit log
          await supabase.from("audit_log").insert([
            {
              actor_id: profile?.id,
              action: `Received PR-${targetPr.request_no}. Auto-incremented stock for ${matchProduct.name} by ${targetPr.quantity}`,
              entity_type: "products",
              entity_id: matchProduct.id,
            },
          ])
          toast.success(
            `Inventory stock for ${matchProduct.name} auto-incremented!`
          )
        }
      }

      // Log PR update
      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `Updated PR-${targetPr.request_no} status to ${nextStatus}`,
          entity_type: "purchase_requests",
          entity_id: prId,
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
      queryClient.invalidateQueries({ queryKey: ["products-pr-select"] })
      toast.success("Status updated successfully!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status")
    },
  })


  // Autocomplete select for product search
  const handleSelectProduct = (productName: string) => {
    const product = products.find((p) => p.name === productName)
    if (product) {
      setValue("product_name", product.name)
      setValue("specs", product.specs || "")
    }
  }

  // Filter logic moved to server-side

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Purchase Requests
          </h1>
          <p className="text-muted-foreground">
            Manage stock refills, procurement orders, and supplier receipts.
          </p>
        </div>

        {canCreate && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger
              render={
                <Button className="flex items-center gap-2 rounded-xl shadow-md">
                  <Plus className="h-4 w-4" />
                  Submit Request
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Raise Purchase Request</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((v) => createPrMutation.mutate(v))}
                className="space-y-4 pt-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    {...register("product_name")}
                    placeholder="e.g. 10mm Steel Rods"
                    list="catalog-names"
                    onChange={(e) => handleSelectProduct(e.target.value)}
                  />
                  <datalist id="catalog-names">
                    {products.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                  {errors.product_name && (
                    <p className="text-xs text-rose-500">
                      {errors.product_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specs">Product Specifications</Label>
                  <Textarea
                    id="specs"
                    {...register("specs")}
                    placeholder="Grade, size, dimensions..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity Required *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      {...register("quantity")}
                    />
                    {errors.quantity && (
                      <p className="text-xs text-rose-500">
                        {errors.quantity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected_date">
                      Expected Delivery Date
                    </Label>
                    <Input
                      id="expected_date"
                      type="date"
                      {...register("expected_date")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier_info">
                    Supplier / Vendor Info (Optional)
                  </Label>
                  <Input
                    id="supplier_info"
                    {...register("supplier_info")}
                    placeholder="Supplier name, contact details..."
                  />
                </div>

                <DialogFooter className="pt-4">
                  <DialogClose
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    }
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl"
                  >
                    {isSubmitting ? "Submitting..." : "Submit PR"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-950/30">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Requested
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {prMetrics.filter((r) => r.status === "requested").length}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:bg-yellow-950/30">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Ordered
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {prMetrics.filter((r) => r.status === "ordered").length}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Received
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {prMetrics.filter((r) => r.status === "received").length}
            </h3>
          </div>
        </div>
      </div>

      {/* Table & Filters */}
      <div className="overflow-hidden rounded-2xl border bg-card p-1">
        <div className="flex flex-col items-center justify-between gap-4 border-b p-5 sm:flex-row">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by product, PR no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="rounded-xl pl-10"
            />
          </div>

          <div className="flex items-center gap-2 justify-center sm:justify-end w-full">
             <Select items={items} value={statusFilter} onValueChange={(value:any) => {
                setStatusFilter(value)
                setPage(1)
              }}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Filter by Status</SelectLabel>
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

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Loading purchase requests...
              </p>
            </div>
          ) : purchaseRequests.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No purchase requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow >
                  <TableHead className="font-semibold">PR No</TableHead>
                  <TableHead className="font-semibold">
                    Product Requested
                  </TableHead>
                  <TableHead className="font-semibold">Qty</TableHead>
                  <TableHead className="font-semibold">Date Expected</TableHead>
                  <TableHead className="font-semibold">Linked Order</TableHead>
                  <TableHead className="font-semibold">Requested by</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRequests.map((pr) => (
                  <TableRow
                    key={pr.id}
                  >
                    <TableCell className="font-mono font-bold ">
                      {pr.request_no}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="block font-semibold ">
                          {pr.product_name}
                        </span>
                        {pr.specs && (
                          <span className="block text-[10px] text-muted-foreground">
                            {pr.specs}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {pr.quantity} units
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pr.expected_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          {new Date(pr.expected_date).toLocaleDateString()}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-primary">
                      {pr.order_id ? (
                        <Link
                          to={`/orders/${pr.order_id}`}
                          className="hover:underline"
                        >
                          {pr.orders?.order_no || "View Order"}
                        </Link>
                      ) : (
                        <span className="font-sans text-slate-400 italic">
                          General stock
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pr.profiles?.full_name || "Staff"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={pr.status} type="purchase" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          render={<Link to={`/purchase-requests/${pr.id}`} />}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 rounded-xl"
                        >
                          Details
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>

                        {/* Manager controls */}
                        {canApprove && (
                          <div className="flex gap-1">
                            {pr.status === "requested" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Approve & Order"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      prId: pr.id,
                                      nextStatus: "ordered",
                                    })
                                  }
                                  className="h-7 w-7 rounded-lg text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/20"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Reject"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      prId: pr.id,
                                      nextStatus: "cancelled",
                                    })
                                  }
                                  className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}

                            {pr.status === "ordered" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Mark Received"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    prId: pr.id,
                                    nextStatus: "received",
                                  })
                                }
                                className="h-7 w-7 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
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
                {Array.from({ length: totalPages >5 ? 5 : totalPages }).map((_, i) => (
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
    // </div>
  )
}

export default PurchaseRequestList
