import React, { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
import { toast } from "@/components/ui/toast"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  Truck,
  MessageSquareWarning,
  Plus,
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
import { useIsMobile } from "@/hooks/use-mobile"
const items = [
  { label: "Select Status", value: null },
  { label: "Enquiry", value: "enquiry" },
  { label: "Quotation", value: "quotation" },
  { label: "Invoice", value: "invoice" },
  { label: "Purchase", value: "purchase" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { isSalesAdmin, isSuperAdmin, isManager } = useRole()
  const isMobile = useIsMobile()

  const [statusNote, setStatusNote] = useState("")
  const [nextStatus, setNextStatus] = useState<string|null>(null)
  const [prDialogOpen, setPrDialogOpen] = useState(false)

  interface PrFormItem {
    id: string
    item_name: string
    specs: string
    quantity: number
    selected: boolean
    is_custom: boolean
  }
  const [prFormItems, setPrFormItems] = useState<PrFormItem[]>([])
  const [prSupplier, setPrSupplier] = useState("")
  const [prExpectedDate, setPrExpectedDate] = useState("")

  const handleOpenBulkPrDialog = () => {
    const initialItems = (order?.order_items || []).map((item: any) => ({
      id: item.id,
      item_name: item.item_name,
      specs: item.specs || "",
      quantity: item.quantity,
      selected: true,
      is_custom: false,
    }))
    setPrFormItems(initialItems)
    setPrDialogOpen(true)
  }

  const handleOpenSinglePrDialog = (selectedItem: any) => {
    const initialItems = (order?.order_items || []).map((item: any) => ({
      id: item.id,
      item_name: item.item_name,
      specs: item.specs || "",
      quantity: item.quantity,
      selected: item.id === selectedItem.id,
      is_custom: false,
    }))
    setPrFormItems(initialItems)
    setPrDialogOpen(true)
  }

  const handleAddCustomPrItem = () => {
    setPrFormItems([
      ...prFormItems,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_name: "",
        specs: "",
        quantity: 1,
        selected: true,
        is_custom: true,
      }
    ])
  }

  const handleUpdatePrItem = (id: string, field: keyof PrFormItem, value: any) => {
    setPrFormItems(
      prFormItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleDeleteCustomPrItem = (id: string) => {
    setPrFormItems(prFormItems.filter((item) => item.id !== id))
  }

  // 1. Fetch Order Details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          customers (*),
          order_items (*),
          profiles (full_name)
        `
        )
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // 2. Fetch Order Status History
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["order-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select(
          `
          *,
          profiles (full_name)
        `
        )
        .eq("order_id", id)
        .order("changed_at", { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // 3. Fetch Linked Purchase Requests
  const { data: purchaseRequests = [] } = useQuery({
    queryKey: ["order-purchase-requests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*, purchase_request_items (*)")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // 4. Fetch Linked Complaints
  const { data: complaints = [] } = useQuery({
    queryKey: ["order-complaints", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // 5. Supabase Realtime Listener
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`order-updates-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["order", id] })
          queryClient.invalidateQueries({ queryKey: ["order-history", id] })
          toast.info(
            `Order status was updated to: ${payload.new.status.toUpperCase()}`
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, queryClient])

  // Mutation: Update status
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!nextStatus) throw new Error("Select a status")

      const fromStatus = order?.status
      const toStatus = nextStatus

      // Update orders table
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: toStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (orderErr) throw orderErr

      // Insert order status history
      const { error: histErr } = await supabase
        .from("order_status_history")
        .insert([
          {
            order_id: id,
            from_status: fromStatus,
            to_status: toStatus,
            changed_by: profile?.id,
            note:
              statusNote || `Status changed from ${fromStatus} to ${toStatus}`,
          },
        ])
      if (histErr) throw histErr

      // Log to audit log
      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `Changed Order ${order?.order_no} status from ${fromStatus} to ${toStatus}`,
          entity_type: "orders",
          entity_id: id,
          details: { note: statusNote },
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] })
      queryClient.invalidateQueries({ queryKey: ["order-history", id] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success("Order status updated!")
      setStatusNote("")
      setNextStatus("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status")
    },
  })

  // Mutation: Create Purchase Request (Multi-Item)
  const createPrMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = prFormItems.filter((item) => item.selected && item.item_name.trim() !== "")
      if (selectedItems.length === 0) {
        throw new Error("Select or add at least one item to purchase")
      }

      // 1. Insert PR
      const { data: prData, error: prError } = await supabase
        .from("purchase_requests")
        .insert([
          {
            order_id: id,
            supplier_info: prSupplier || null,
            requested_by: profile?.id,
            expected_date: prExpectedDate || null,
            status: "requested",
          },
        ])
        .select()
        .single()
      if (prError) throw prError

      // 2. Insert Items
      const itemsPayload = selectedItems.map((item) => ({
        purchase_request_id: prData.id,
        product_name: item.item_name,
        specs: item.specs || null,
        quantity: item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from("purchase_request_items")
        .insert(itemsPayload)
      if (itemsError) throw itemsError

      return prData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["order-purchase-requests", id],
      })
      queryClient.invalidateQueries({
        queryKey: ["purchase-requests"],
      })
      toast.success("Purchase request created!")
      setPrDialogOpen(false)
      setPrFormItems([])
      setPrSupplier("")
      setPrExpectedDate("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit purchase request")
    },
  })

  // Delete Order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id)
      if (error) throw error

      // Log to audit log
      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `Deleted Order ${order?.order_no}`,
          entity_type: "orders",
          entity_id: id,
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success("Order deleted successfully")
      navigate("/orders")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete order")
    },
  })

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      deleteOrderMutation.mutate()
    }
  }

  if (orderLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">
          Loading order details...
        </p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-2xl font-bold">Order not found</h2>
        <Button onClick={() => navigate("/orders")} className="mt-4 rounded-xl">
          Back to Orders
        </Button>
      </div>
    )
  }

  const orderTotal = (order.order_items || []).reduce(
    (sum: number, item: any) =>
      sum + Number(item.quantity) * Number(item.unit_price),
    0
  )

  // Stepper timeline configurations
  const pipelineStatuses = ["enquiry", "quotation", "invoice", "purchase", "completed"]
  const currentStatusIndex = pipelineStatuses.indexOf(order.status)
  const isCancelled = order.status === "cancelled"


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center md:justify-between max-md:flex-col max-md:items-start gap-3">
        <Button
          render={<Link to="/orders" />}
          variant="ghost"
          size="sm"
          className="gap-1 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>

        <div className="flex gap-2">
          {/* Edit Order */}
          {(isSalesAdmin || isSuperAdmin) && (
            <Button
              render={<Link to={`/orders/${order.id}/edit`} />}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs shadow-sm"
              nativeButton={false}
            >
              Edit Order
            </Button>
          )}

          {/* Delete Order */}
          {(isSuperAdmin || isManager) && (
            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              disabled={deleteOrderMutation.isPending}
              className="gap-1.5 rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50"
            >
              Delete Order
            </Button>
          )}

          {/* Quick File Complaint */}
          <Button
            render={
              <Link
                to={`/complaints?customer_id=${order.customer_id}&order_id=${order.id}`}
              />
            }
            variant="outline"
            className="gap-1.5 rounded-xl text-xs shadow-sm"
            nativeButton={false}
          >
            <MessageSquareWarning className="h-4 w-4 text-rose-500" />
            Complaint
          </Button>
        </div>
      </div>

      {/* Pipeline Stepper Stepper */}
      {!isMobile &&<Card>
        <CardContent className="p-4">
          {isCancelled ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-bold">
                This order has been Cancelled
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between gap-6  sm:flex-row sm:gap-2">
              {pipelineStatuses.map((status, index) => {
                const isPassed = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex
                return (
                  <React.Fragment key={status}>
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                          isCurrent
                            ? "scale-110 border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : isPassed
                              ? "border-primary bg-muted"
                              : ""
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`mt-2 text-[10px] font-bold tracking-wider uppercase ${
                          isCurrent
                            ? "text-primary"
                            : isPassed
                              ? ""
                              : "text-muted-foreground"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    {index < pipelineStatuses.length - 1 && (
                      <div
                        className={`mx-4 hidden h-[2px] flex-1 rounded-full sm:block ${
                          index < currentStatusIndex
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Core items and comments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Details card */}
          <Card>
            <CardHeader className="flex md:flex-row flex-col md:items-center  md:justify-between border-b p-5 ">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Order details
                </span>
                <CardTitle className="mt-0.5 font-mono text-lg font-bold">
                  {order.order_no}
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {isSalesAdmin && (
                  <Button
                    onClick={handleOpenBulkPrDialog}
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl text-xs gap-1"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Raise Purchase Request
                  </Button>
                )}
                <StatusBadge
                  status={order.status}
                  type="order"
                  className="scale-110"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">
                      Item & Specs
                    </TableHead>
                    <TableHead className="w-24 font-semibold">Price</TableHead>
                    <TableHead className="w-20 font-semibold">Qty</TableHead>
                    <TableHead className="w-28 text-right font-semibold">
                      Subtotal
                    </TableHead>
                    {isSalesAdmin && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                    >
                      <TableCell className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.item_name}
                        </div>
                        {item.specs && (
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.specs}
                          </div>
                        )}
                        {item.barcode && (
                          <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            EAN: {item.barcode}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-4">
                        ₹{Number(item.unit_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="p-4 font-semibold">
                        {item.quantity} units
                      </TableCell>
                      <TableCell className="p-4 text-right font-bold">
                        ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </TableCell>
                      {isSalesAdmin && (
                        <TableCell className="p-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Request Stock Purchase"
                            onClick={() => handleOpenSinglePrDialog(item)}
                            className="h-7 w-7 rounded-lg text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow >
                    <TableCell colSpan={3} className="p-4 text-right text-xs">
                      Grand Total Amount
                    </TableCell>
                    <TableCell className="p-4 text-right text-sm ">
                      ₹
                      {orderTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    {isSalesAdmin && <TableCell></TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Linked Modules Accordions (Purchase requests, complaints) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Purchase requests card */}
            <Card >
              <CardHeader className="flex flex-row items-center justify-between border-b  p-4">
                <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <Truck className="h-4 w-4 text-indigo-500" />
                  Procurements ({purchaseRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {purchaseRequests.length === 0 ? (
                  <p className="p-5 text-center text-xs text-muted-foreground">
                    No linked purchase requests.
                  </p>
                ) : (
                  <div className="dark:divide-slate-850 divide-y">
                    {purchaseRequests.map((pr: any) => (
                      <div
                        key={pr.id}
                        className="flex items-center justify-between p-4 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                      >
                        <div>
                          <Link
                            to={`/purchase-requests/${pr.id}`}
                            className="block font-mono text-[11px] font-semibold text-primary hover:underline"
                          >
                            {pr.request_no}
                          </Link>
                          <span className="mt-0.5 block text-[10px] text-slate-650 dark:text-slate-400">
                            {pr.purchase_request_items?.[0]
                              ? `${pr.purchase_request_items[0].product_name} (x${pr.purchase_request_items[0].quantity})${pr.purchase_request_items.length > 1 ? ` (+${pr.purchase_request_items.length - 1} more)` : ""}`
                              : "No items"}
                          </span>
                        </div>
                        <StatusBadge
                          status={pr.status}
                          type="purchase"
                          className="scale-90"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Complaints card */}
            <Card >
              <CardHeader className="flex flex-row items-center justify-between border-b  p-4">
                <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  Complaints filed ({complaints.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {complaints.length === 0 ? (
                  <p className="p-5 text-center text-xs text-muted-foreground">
                    No complaints filed for this order.
                  </p>
                ) : (
                  <div className="dark:divide-slate-850 divide-y ">
                    {complaints.map((c: any) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-4 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                      >
                        <div>
                          <Link
                            to={`/complaints/${c.id}`}
                            className="block font-mono text-[11px] font-semibold hover:underline"
                          >
                            {c.complaint_no}
                          </Link>
                          <span className="mt-0.5 block max-w-[150px] truncate text-[10px] text-slate-600 dark:text-slate-400">
                            {c.subject}
                          </span>
                        </div>
                        <StatusBadge
                          status={c.status}
                          type="complaint"
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

        {/* Sidebar Info & Update Status Forms */}
        <div className="space-y-6">
          {/* Customer profile link card */}
          <Card >
            <CardContent className="space-y-3 p-5">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Customer Account
                </span>
                <Link
                  to={`/customers/${order.customer_id}`}
                  className="mt-0.5 block text-sm font-bold  hover:underline "
                >
                  {order.customers?.name}
                </Link>
              </div>

              <div className="text-muted-foreground space-y-1.5 border-t  pt-2 text-xs ">
                {order.customers?.phone && (
                  <p>Phone: {order.customers.phone}</p>
                )}
                {order.customers?.email && (
                  <p>Email: {order.customers.email}</p>
                )}
              </div>

              <div className="dark:border-slate-850 border-t  pt-2 text-[10px] text-muted-foreground">
                <p>Created by: {order.profiles?.full_name || "System"}</p>
                <p className="mt-1">
                  Date: {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Update Status form */}
          <Card >
            <CardHeader className="dark:border-slate-850 border-b  pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Clock className="h-4.5 w-4.5 text-primary" />
                Pipeline status control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="status-select">Transition Status To</Label>
                <Select  value={nextStatus||order.status}  onValueChange={(value:any) => setNextStatus(value)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Select Status</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-note">Transition log note</Label>
                <Textarea
                  id="status-note"
                  placeholder="Reason for change (e.g. invoice cleared, payment verified...)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  className="rounded-xl text-xs"
                />
              </div>

              <Button
                onClick={() => updateStatusMutation.mutate()}
                disabled={!nextStatus || updateStatusMutation.isPending}
                className="h-10 w-full rounded-xl text-xs shadow-md"
              >
                {updateStatusMutation.isPending
                  ? "Updating..."
                  : "Commit Transition"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog for Raising Purchase Request */}
      <Dialog open={prDialogOpen} onOpenChange={setPrDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center md:justify-between max-md:flex-col max-md:items-start gap-3">
            <DialogTitle>Raise Stock Purchase Request</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomPrItem}
              className="rounded-lg text-xs gap-1 mr-6"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Item
            </Button>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Items List */}
            <div className="space-y-2 rounded-xl border p-3 max-h-[35vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
              <span className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider">
                Select Items to Order
              </span>
              {prFormItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No items added yet.</p>
              ) : (
                <div className="space-y-3">
                  {prFormItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 border-b pb-2.5 last:border-b-0 last:pb-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => handleUpdatePrItem(item.id, "selected", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {item.is_custom ? (
                          <div className="space-y-1">
                            <Input
                              placeholder="Product Name"
                              value={item.item_name}
                              onChange={(e) => handleUpdatePrItem(item.id, "item_name", e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Input
                              placeholder="Specs (e.g. size, details)"
                              value={item.specs}
                              onChange={(e) => handleUpdatePrItem(item.id, "specs", e.target.value)}
                              className="h-7 text-[10px] text-muted-foreground"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.item_name}
                            </p>
                            {item.specs && (
                              <p className="text-[10px] text-muted-foreground">
                                {item.specs}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground mr-1 text-[11px]">Qty:</span>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdatePrItem(item.id, "quantity", Math.max(1, Number(e.target.value)))}
                            className="h-8 w-16 text-center text-xs"
                          />
                          {item.is_custom && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCustomPrItem(item.id)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg animate-fade-in"
                            >
                              <Plus className="h-4 w-4 rotate-45" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pr-supplier">Supplier Details (Optional)</Label>
                <Input
                  id="pr-supplier"
                  placeholder="e.g. Acme Supplier Ltd..."
                  value={prSupplier}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPrSupplier(e.target.value)
                  }
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pr-date">Expected Delivery Date</Label>
                <Input
                  id="pr-date"
                  type="date"
                  value={prExpectedDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPrExpectedDate(e.target.value)
                  }
                  className="rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
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
                onClick={() => createPrMutation.mutate()}
                disabled={createPrMutation.isPending || prFormItems.filter(item => item.selected && item.item_name.trim() !== "").length === 0}
                className="rounded-xl"
              >
                {createPrMutation.isPending
                  ? "Creating..."
                  : "Submit Purchase Request"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chronological Status history card */}
      <Card >
        <CardHeader className="border-b p-5">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Audit Transition history log
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Loading history log...
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No history transitions logged.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Operator</TableHead>
                  <TableHead className="font-semibold">From Status</TableHead>
                  <TableHead className="font-semibold">To Status</TableHead>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">
                    Transition Log notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((log) => (
                  <TableRow
                    key={log.id}
                  >
                    <TableCell className="font-medium">
                      {log.profiles?.full_name || "System"}
                    </TableCell>
                    <TableCell>
                      {log.from_status ? (
                        <StatusBadge
                          status={log.from_status}
                          type="order"
                          className="scale-90"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Creation
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={log.to_status}
                        type="order"
                        className="scale-90"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.changed_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                      {log.note || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  )
}

export default OrderDetail
