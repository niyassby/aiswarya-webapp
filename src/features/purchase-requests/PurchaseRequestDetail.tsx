import React, { useState, useEffect, useRef } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
import { toast } from "@/components/ui/toast"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Send,
  Truck,
  MessageSquare,
  Activity,
  Box,
  ClipboardList,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const PurchaseRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { isManager, isSuperAdmin } = useRole()

  const [commentText, setCommentText] = useState("")
  const threadEndRef = useRef<HTMLDivElement>(null)

  const canApprove = isManager || isSuperAdmin

  // 1. Fetch Purchase Request Details
  const { data: pr, isLoading: prLoading } = useQuery({
    queryKey: ["purchase-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(
          `
          *,
          orders (order_no),
          profiles (full_name),
          purchase_request_items (*)
        `
        )
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // 2. Fetch Comments (Discussions)
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["pr-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_request_comments")
        .select(
          `
          *,
          profiles (full_name)
        `
        )
        .eq("purchase_request_id", id)
        .order("created_at", { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // 3. Fetch Audit Logs (Change Actions)
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["pr-audit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select(
          `
          *,
          profiles(full_name)
        `
        )
        .eq("entity_type", "purchase_requests")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // Realtime subscription for comments
  useEffect(() => {
    if (!id) return

    const commentsChannel = supabase
      .channel(`pr-comments-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "purchase_request_comments",
          filter: `purchase_request_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["pr-comments", id],
          })
          setTimeout(scrollToBottom, 300)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(commentsChannel)
    }
  }, [id, queryClient])

  const scrollToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom()
    }
  }, [comments.length])

  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: async () => {
      if (!commentText.trim() || !id) throw new Error("Comment cannot be empty")
      const { data, error } = await supabase
        .from("purchase_request_comments")
        .insert([
          {
            purchase_request_id: id,
            author_id: profile?.id,
            comment: commentText,
          },
        ])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setCommentText("")
      queryClient.invalidateQueries({ queryKey: ["pr-comments", id] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post comment")
    },
  })

  // 4. Products Query for Stock Updates
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

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ nextStatus }: { nextStatus: string }) => {
      if (!pr) return

      // Update PR status
      const { error: prErr } = await supabase
        .from("purchase_requests")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", pr.id)
      if (prErr) throw prErr

      // If marked as received, increment product stock if match exists
      if (nextStatus === "received") {
        const prItems = pr.purchase_request_items || []
        for (const item of prItems) {
          const matchProduct = products.find(
            (p) => p.name.toLowerCase() === item.product_name.toLowerCase()
          )
          if (matchProduct) {
            const { error: stockErr } = await supabase
              .from("products")
              .update({
                stock_quantity: matchProduct.stock_quantity + item.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", matchProduct.id)
            if (stockErr) throw stockErr

            // Log to audit log
            await supabase.from("audit_log").insert([
              {
                actor_id: profile?.id,
                action: `Received PR-${pr.request_no}. Auto-incremented stock for ${matchProduct.name} by ${item.quantity}`,
                entity_type: "products",
                entity_id: matchProduct.id,
              },
            ])
          }
        }
        toast.success("Inventory stock for all items auto-incremented!")
      }

      // Log PR update
      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `Updated PR-${pr.request_no} status to ${nextStatus}`,
          entity_type: "purchase_requests",
          entity_id: pr.id,
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-request", id] })
      queryClient.invalidateQueries({ queryKey: ["pr-audit", id] })
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
      toast.success("Status updated successfully!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status")
    },
  })

  // Delete Purchase Request mutation
  const deletePrMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("purchase_requests")
        .delete()
        .eq("id", id)
      if (error) throw error

      // Log to audit log
      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `Deleted Purchase Request ${pr?.request_no}`,
          entity_type: "purchase_requests",
          entity_id: id,
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
      toast.success("Purchase request deleted successfully")
      navigate("/purchase-requests")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete purchase request")
    },
  })

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this purchase request? This action cannot be undone."
      )
    ) {
      deletePrMutation.mutate()
    }
  }

  // Loading state
  if (prLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">
          Loading request details...
        </p>
      </div>
    )
  }

  if (!pr) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <Truck className="h-12 w-12 text-slate-200 dark:text-slate-800" />
        <div>
          <h2 className="text-xl font-bold">Request Not Found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This purchase request doesn't exist or you don't have access.
          </p>
        </div>
        <Button
          onClick={() => navigate("/purchase-requests")}
          className="mt-2 rounded-xl"
        >
          Back to Requests
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 max-md:flex-col max-md:items-start md:items-center">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 items-center justify-between gap-4 max-md:flex-col max-md:items-start md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {pr.request_no}
              </h1>
              <StatusBadge status={pr.status} type="purchase" />
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Requested on {new Date(pr.created_at).toLocaleString()}
            </p>
          </div>

          {/* Manager Controls */}
          {canApprove && (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {/* Delete Request */}
              <Button
                onClick={handleDelete}
                disabled={deletePrMutation.isPending}
                variant="outline"
                className="rounded-xl border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900/50"
              >
                Delete Request
              </Button>
              {/* Edit Request */}
              {pr.status != "fulfilled" && (
                <Button
                  render={<Link to={`/purchase-requests/${pr.id}/edit`} />}
                  variant="outline"
                  className="rounded-xl"
                  nativeButton={false}
                >
                  Edit Request
                </Button>
              )}

              {pr.status === "requested" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateStatusMutation.mutate({ nextStatus: "cancelled" })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({ nextStatus: "ordered" })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Approve & Order
                  </Button>
                </>
              )}

              {pr.status === "ordered" && (
                <Button
                  onClick={() =>
                    updateStatusMutation.mutate({ nextStatus: "received" })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Received
                </Button>
              )}

              {pr.status === "received" && (
                <Button
                  onClick={() =>
                    updateStatusMutation.mutate({ nextStatus: "fulfilled" })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                >
                  <Box className="mr-2 h-4 w-4" />
                  Mark Fulfilled
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Details & Audit Log */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Details Card */}
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Box className="h-5 w-5 text-primary" />
                Product & Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Items Table */}
              <div>
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <Box className="h-4 w-4" /> Requested Items
                </h4>
                <div className="overflow-x-auto rounded-xl border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">
                          Product Name
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Specifications
                        </TableHead>
                        <TableHead className="w-28 text-xs font-semibold">
                          Quantity
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pr.purchase_request_items &&
                      pr.purchase_request_items.length > 0 ? (
                        pr.purchase_request_items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs font-semibold">
                              {item.product_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.specs || "-"}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {item.quantity} units
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-4 text-center text-xs text-muted-foreground"
                          >
                            No items found in this request
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 border-t pt-4 md:grid-cols-2">
                <div>
                  <h4 className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <User className="h-3 w-3" /> Requested By
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {pr.profiles?.full_name || "Unknown Staff"}
                  </p>
                </div>

                <div>
                  <h4 className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <Calendar className="h-3 w-3" /> Expected Delivery
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {pr.expected_date
                      ? new Date(pr.expected_date).toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <ClipboardList className="h-3 w-3" /> Linked Order
                  </h4>
                  <p className="mt-1 text-sm font-medium">
                    {pr.order_id ? (
                      <Link
                        to={`/orders/${pr.order_id}`}
                        className="text-primary hover:underline"
                      >
                        {pr.orders?.order_no || "View Order"}
                      </Link>
                    ) : (
                      <span className="text-slate-500 italic">
                        General Stock Replenishment
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Supplier Info
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {pr.supplier_info || "Not specified"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log / History */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Activity className="h-5 w-5 text-amber-500" />
                Change Actions & History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading history...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No history logs found for this request.
                </div>
              ) : (
                <div className="divide-y">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500"></div>
                      <div>
                        <p className="text-xs">{log.action}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString()}
                          <span>•</span>
                          <span className="font-medium">
                            {log.profiles?.full_name || "System"}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Discussions */}
        <div className="space-y-6">
          <Card className="flex h-[600px] flex-col pb-0 shadow-sm">
            <CardHeader className="shrink-0 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <MessageSquare className="h-5 w-5 text-indigo-500" />
                Discussions
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              <div className="flex-1 scrollbar-thin space-y-4 overflow-y-auto p-4">
                {commentsLoading ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Loading discussions...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="mb-2 h-8 w-8 text-slate-200 dark:text-slate-800" />
                    <p className="text-xs text-muted-foreground">
                      No discussion points yet.
                      <br />
                      Start coordinating below.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isMe = comment.author_id === profile?.id
                    return (
                      <div
                        key={comment.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="mb-1 flex items-center gap-2 px-1">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {isMe ? "You" : comment.profiles?.full_name}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(comment.created_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? "rounded-tr-sm bg-indigo-600 text-white"
                              : "rounded-tl-sm border border-slate-200/50 bg-slate-100 text-slate-800 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {comment.comment}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={threadEndRef} />
              </div>

              <div className="shrink-0 border-t bg-muted p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") postCommentMutation.mutate()
                    }}
                    className="flex-1 rounded-xl text-sm"
                  />
                  <Button
                    onClick={() => postCommentMutation.mutate()}
                    disabled={
                      !commentText.trim() || postCommentMutation.isPending
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PurchaseRequestDetail
