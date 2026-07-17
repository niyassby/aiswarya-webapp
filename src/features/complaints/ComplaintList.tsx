import React, { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
import { toast } from "@/components/ui/toast"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  Search,
  Plus,
  User,
  ArrowUpRight,
  ShieldAlert,
  LayoutGrid,
  AlertTriangle,
} from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

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
  { label: "Select Status", value: "all" },
  { label: "Open", value: "open" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
]

// Form Schema
const complaintSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  description: z.string().min(5, "Please provide a detailed description"),
  customer_id: z.string().min(1, "Please select a customer"),
  order_id: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
})

type ComplaintFormValues = z.infer<typeof complaintSchema>

export const ComplaintList: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const { isSuperAdmin, isManager } = useRole()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Pre-fill parameters from URL
  const urlCustomerId = searchParams.get("customer_id")
  const urlOrderId = searchParams.get("order_id")

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema) as any,
    defaultValues: {
      subject: "",
      description: "",
      customer_id: "",
      order_id: "",
      priority: "medium",
    },
  })

  // Queries
  // Metrics query for unpaginated counts
  const { data: complaintMetrics = [] } = useQuery({
    queryKey: ["complaint-metrics", profile?.id],
    queryFn: async () => {
      if (!profile) return []
      let query = supabase.from("complaints").select("id, status")
      if (!isSuperAdmin && !isManager) {
        query = query.or(
          `raised_by.eq.${profile.id},assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`
        )
      }
      const { data } = await query
      return data || []
    },
    enabled: !!profile,
  })

  const { data: { complaints = [], totalCount = 0 } = {}, isLoading } =
    useQuery({
      queryKey: [
        "complaints",
        profile?.id,
        page,
        searchTerm,
        statusFilter,
        pageSize,
      ],
      queryFn: async () => {
        if (!profile) return { complaints: [], totalCount: 0 }
        let query = supabase.from("complaints").select(
          `
          *,
          customers (name),
          orders (order_no),
          assigned_staff:profiles!complaints_assigned_to_fkey (full_name)
        `,
          { count: "exact" }
        )

        if (!isSuperAdmin && !isManager) {
          query = query.or(
            `raised_by.eq.${profile.id},assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`
          )
        }

        if (searchTerm) {
          query = query.ilike("complaint_no", `%${searchTerm}%`)
        }

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const { data, count, error } = await query
          .order("created_at", { ascending: false })
          .range(from, to)

        if (error) throw error
        return { complaints: data || [], totalCount: count || 0 }
      },
      enabled: !!profile,
    })

  const totalPages = Math.ceil(totalCount / pageSize)

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-complaints-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .order("name")
      if (error) throw error
      return data || []
    },
  })

  const { data: orders = [] } = useQuery({
    queryKey: ["orders-complaints-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_id")
        .order("order_no")
      if (error) throw error
      return data || []
    },
  })

  const selectedCustomerId = watch("customer_id")
  const filteredOrders = orders.filter(
    (o: any) => o.customer_id === selectedCustomerId
  )

  useEffect(() => {
    const currentOrderId = watch("order_id")
    if (currentOrderId) {
      const orderExistsForCustomer = orders.some(
        (o: any) =>
          o.id === currentOrderId && o.customer_id === selectedCustomerId
      )
      if (!orderExistsForCustomer) {
        setValue("order_id", "")
      }
    }
  }, [selectedCustomerId, setValue, orders])

  // Automatically open dialog if query params present
  useEffect(() => {
    if (!urlCustomerId || customers.length === 0) return
    reset({
      subject: "",
      description: "",
      customer_id: urlCustomerId,
      order_id: urlOrderId ?? "",
      priority: "medium",
    })

    setDialogOpen(true)
  }, [urlCustomerId, urlOrderId, customers, reset])

  // Mutation to insert complaint
  const fileComplaintMutation = useMutation({
    mutationFn: async (values: ComplaintFormValues) => {
      const { data, error } = await supabase.from("complaints").insert([
        {
          subject: values.subject,
          description: values.description,
          customer_id: values.customer_id,
          order_id: values.order_id || null,
          priority: values.priority,
          status: "open",
          raised_by: profile?.id,
        },
      ])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] })
      toast.success("Complaint logged successfully!")
      setDialogOpen(false)
      reset({
        subject: "",
        description: "",
        customer_id: "",
        order_id: "",
        priority: "medium",
      })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to file complaint")
    },
  })

  const onSubmit = (values: ComplaintFormValues) => {
    fileComplaintMutation.mutate(values)
  }

  // Filter logic moved to server side

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Complaints Board
          </h1>
          <p className="text-muted-foreground">
            Register issues, assign staff, and track resolution timelines.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4" />
                File Complaint
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>File Customer Complaint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Select Customer *</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        className={"flex w-full justify-start text-xs"}
                        variant="outline"
                      />
                    }
                  >
                    {customers.find((c) => c.id === watch("customer_id"))
                      ?.name ?? "Select Customer"}
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className={"p-0"}>
                    <Command>
                      <CommandInput placeholder="Type a command or search..." />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Suggestions">
                          {customers.map((c) => (
                            <CommandItem
                              onSelect={() => {
                                setValue("customer_id", c.id)
                                setPopoverOpen(false)
                              }}
                              key={c.id}
                              value={c.name}
                            >
                              {c.name} {c.phone ? `(${c.phone})` : ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.customer_id && (
                  <p className="text-xs text-rose-500">
                    {errors.customer_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_id">Linked Order</Label>
                  <Select
                    disabled={
                      !selectedCustomerId || filteredOrders.length === 0
                    }
                    value={
                      filteredOrders?.find(
                        (o: any) => o.id === watch("order_id")
                      )?.order_no
                    }
                    onValueChange={(value: any) => setValue("order_id", value)}
                    items={filteredOrders?.map((item) => ({
                      label: item.order_no,
                      value: item.id,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          !selectedCustomerId
                            ? "Select a customer first"
                            : filteredOrders.length === 0
                              ? "No Orders Available"
                              : "No Linked Order"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {filteredOrders?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.order_no}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    id="priority"
                    value={watch("priority")}
                    onValueChange={(value: any) => setValue("priority", value)}
                  >
                    <SelectTrigger className="w-full capitalize">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Brief Subject *</Label>
                <Input
                  id="subject"
                  {...register("subject")}
                  placeholder="e.g. Incomplete rod dimensions received"
                />
                {errors.subject && (
                  <p className="text-xs text-rose-500">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Provide explicit details. Photo evidence can be uploaded inside the case thread once filed."
                  rows={4}
                  className="rounded-xl text-xs"
                />
                {errors.description && (
                  <p className="text-xs text-rose-500">
                    {errors.description.message}
                  </p>
                )}
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
                  {isSubmitting ? "Filing..." : "Log Case File"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 dark:bg-slate-950/30">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Total Cases
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {complaintMetrics.length}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-950/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Open Cases
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {complaintMetrics.filter((c) => c.status === "open").length}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-950/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              In Progress
            </span>
            <h3 className="mt-0.5 text-xl font-bold">
              {
                complaintMetrics.filter(
                  (c) => c.status === "in_progress" || c.status === "assigned"
                ).length
              }
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex w-full flex-col items-center gap-4 border-b p-5 sm:flex-row md:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by case no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="pl-10"
            />
          </div>

          <Select
            items={items}
            value={statusFilter}
            onValueChange={(value: any) => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:max-w-45">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Loading complaints board...
              </p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No complaint cases found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Case ID</TableHead>
                  <TableHead className="font-semibold">
                    Subject & Customer
                  </TableHead>
                  <TableHead className="font-semibold">Linked Order</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">
                    Assigned Operator
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-slate-850 dark:text-slate-350 font-mono font-bold">
                      {c.complaint_no}
                    </TableCell>
                    <TableCell>
                      <div>
                        <Link
                          to={`/complaints/${c.id}`}
                          className="block font-semibold text-slate-900 hover:underline dark:text-white"
                        >
                          {c.subject}
                        </Link>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          Client: {c.customers?.name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.order_id ? (
                        <Link
                          to={`/orders/${c.order_id}`}
                          className="text-primary hover:underline"
                        >
                          {c.orders?.order_no}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                          c.priority === "urgent"
                            ? "animate-pulse border-rose-500/20 bg-rose-500/10 font-black text-rose-500"
                            : c.priority === "high"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                              : c.priority === "medium"
                                ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                                : "border-slate-200 bg-slate-50 text-slate-400 dark:bg-slate-950"
                        }`}
                      >
                        {c.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.assigned_staff?.full_name ? (
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <User className="h-3.5 w-3.5 opacity-60" />
                          {c.assigned_staff.full_name}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} type="complaint" />
                    </TableCell>
                    <TableCell>
                      <Button
                        render={<Link to={`/complaints/${c.id}`} />}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 rounded-xl"
                        nativeButton={false}
                      >
                        Open Thread
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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

export default ComplaintList
