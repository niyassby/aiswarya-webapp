import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/utils/supabase"
// import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/features/auth/useAuth"
import { toast } from "@/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  UserPlus,
  Phone,
  Mail,
  ChevronRight,
  Users2,
  List,
  LayoutGrid,
  MapPin,
} from "lucide-react"
import PaginationUI from "@/components/PaginationUI"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRole } from "@/hooks/useRole"
import { useIsMobile } from "@/hooks/use-mobile"

// Form Schema
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export const CustomerList: React.FC = () => {
  const queryClient = useQueryClient()
  const { isSalesAdmin, isManager, isSuperAdmin } = useRole()
  const { profile, user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [debounceSearchTerm, setDebounceSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [gotoPage, setGotoPage] = useState("")
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [isGrid, setIsGrid] = useState(false)

  useEffect(() => {
    setIsGrid(isMobile)
  }, [isMobile])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceSearchTerm(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  })

  // Query to fetch customers
  const { data: { customers = [], totalCount = 0 } = {}, isLoading } = useQuery(
    {
      queryKey: ["customers", page, debounceSearchTerm, limit],
      queryFn: async () => {
        let query = supabase
          .from("customers")
          .select("*, created_by(full_name)", { count: "exact" })
          .order("created_at", { ascending: false })

        if (debounceSearchTerm) {
          query = query.or(
            `name.ilike.%${debounceSearchTerm}%,phone.ilike.%${debounceSearchTerm}%`
          )
        }

        if (isSalesAdmin && !isSuperAdmin && !isManager) {
          query = query.eq("created_by", user?.id)
        }

        const { data, error, count } = await query.range(
          (page - 1) * limit,
          page * limit - 1
        )
        if (error) throw error
        return { customers: data || [], totalCount: count || 0 }
      },
    }
  )
  const totalPages = Math.ceil(totalCount / limit)

  // Mutation to create customer
  const createCustomerMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            name: values.name,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            notes: values.notes || null,
            created_by: profile?.id,
          },
        ])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast.success("Customer added successfully!")
      reset()
      setDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add customer")
    },
  })

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      const customer = await createCustomerMutation.mutateAsync(values)

      if (gotoPage) {
        if (gotoPage === "salesOrder") {
          navigate(`/orders/create?customer_id=${customer.id}`)
        } else {
          navigate(`/complaints?customer_id=${customer.id}`)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Counters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Customers Directory
          </h1>
          <p className="text-muted-foreground">
            Manage and view order histories for Aiswarya customers.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <UserPlus className="h-4 w-4" />
                Add Customer
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register("name")} placeholder="John Doe" />
                {errors.name && (
                  <p className="text-xs text-rose-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+1234567890"
                  />
                  {errors.phone && (
                    <p className="text-xs text-rose-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  {...register("address")}
                  placeholder="Customer street address..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Preferences, tax details, terms..."
                  rows={2}
                />
              </div>

              <div>
                <RadioGroup
                  onValueChange={(value: string) => setGotoPage(value)}
                  className="flex gap-2 max-md:flex-col md:items-center"
                >
                  <FieldLabel htmlFor="salesOrder">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Create Sales Order</FieldTitle>
                      </FieldContent>
                      <RadioGroupItem value="salesOrder" id="salesOrder" />
                    </Field>
                  </FieldLabel>
                  <FieldLabel htmlFor="fileComplaint">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>File Complaint</FieldTitle>
                      </FieldContent>
                      <RadioGroupItem
                        value="fileComplaint"
                        id="fileComplaint"
                      />
                    </Field>
                  </FieldLabel>
                </RadioGroup>
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
                  {isSubmitting ? "Saving..." : "Save Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Directory Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-950/30">
            <Users2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Total Customers
            </span>
            <h3 className="mt-0.5 text-2xl font-bold">{totalCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="overflow-hidden rounded-2xl border">
        <div className="flex gap-4  border-b p-5  sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, tax ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex items-center  gap-1 rounded-xl border p-1 ">
            <Button
              variant={!isGrid ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsGrid(false)}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={isGrid ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsGrid(true)}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Loading customers directory...
              </p>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No customers found.{" "}
              {searchTerm
                ? "Try adjusting your filters."
                : "Create one to get started."}
            </div>
          ) : isGrid ? (
            <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((customer) => {
                const phone = String(customer.phone || "")
                  .replace(/^\+?91\s*/, "")
                  .replace(/[\s+]/g, "")
                const initials = customer.name
                  ? customer.name
                      .trim()
                      .split(/\s+/)
                      .map((n:any) => n[0])
                      .filter(Boolean)
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "?"

                return (
                  <div
                    key={customer.id}
                    className="flex flex-col justify-between rounded-2xl border bg-card p-5  transition-all "
                  >
                    <div className="space-y-4">
                      {/* Customer Info Header */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary shadow-inner">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/customers/${customer.id}`}
                            className="block truncate text-lg font-semibold  hover:underline "
                          >
                            {customer.name}
                          </Link>
                          {(isSuperAdmin || isManager) && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Operator: {customer.created_by?.full_name || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1 text-sm ">
                        {customer.phone &&<div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {customer.phone || "N/A"}
                          </span>
                        </div>}
                        {customer.email && <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {customer.email || "N/A"}
                          </span>
                        </div>}
                        {customer.address &&<div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {customer.address|| "N/A"}
                          </span>
                        </div>}
                        
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="mt-3 border-t pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Quick Contact Icons */}
                        <div className="grid max-md:w-full grid-cols-2 gap-2">
                          <Button
                            nativeButton={false}
                            render={
                              <a
                                href={`https://wa.me/91${phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                            variant="default"
                            className="w-full md:h-8 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700"
                          >
                            <svg width="15px" height="15px" viewBox="0 0 24 24">
                              <path
                                fill="white"
                                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                              />
                            </svg>
                          </Button>
                          <Button
                            nativeButton={false}
                            render={
                              <a
                                href={`tel:+91${phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                            variant="default"
                            className="w-full md:h-8 items-center justify-center rounded-lg bg-blue-700 hover:bg-blue-800"
                          >
                            <Phone className="size-4 text-white" />
                          </Button>
                        </div>

                        {/* Order & Complaint & Profile */}
                        <div className="ml-auto flex items-center gap-1.5">
                          <Button
                            nativeButton={false}
                            render={
                              <Link
                                to={`/orders/create?customer_id=${customer.id}`}
                              />
                            }
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2.5 text-xs"
                          >
                            Order
                          </Button>
                          <Button
                            nativeButton={false}
                            render={
                              <Link
                                to={`/complaints?customer_id=${customer.id}`}
                              />
                            }
                            variant="destructive"
                            size="sm"
                            className="h-8 rounded-lg px-2.5 text-xs"
                          >
                            Complaint
                          </Button>
                          <Button
                            nativeButton={false}
                            render={<Link to={`/customers/${customer.id}`} />}
                            variant="ghost"
                            size="sm"
                            className="flex h-8 items-center gap-0.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <span>Profile</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-950/20">
                  <TableHead className="w-[200px] max-w-sm font-semibold">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold">Phone No</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Address</TableHead>
                  {(isSuperAdmin || isManager) && (
                    <TableHead className="font-semibold">Operator</TableHead>
                  )}
                  <TableHead className="">Actions</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const phone = String(customer.phone || "")
                    .replace(/^\+?91\s*/, "")
                    .replace(/[\s+]/g, "") // Remove any remaining spaces or plus signs
                  return (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                    >
                      <TableCell className="font-semibold text-slate-900 dark:text-white">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 opacity-80" />
                          {customer.phone || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 opacity-80" />
                          {customer.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {customer.address || "-"}
                      </TableCell>
                      {(isSuperAdmin || isManager) && (
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {customer.created_by?.full_name || "-"}
                        </TableCell>
                      )}
                      <TableCell className="w-fit font-mono text-xs">
                        <div className="space-x-2">
                          <Button
                            nativeButton={false}
                            render={
                              <Link
                                to={`/orders/create?customer_id=${customer.id}`}
                              />
                            }
                            variant="outline"
                            size="sm"
                          >
                            {" "}
                            Order
                          </Button>
                          <Button
                            nativeButton={false}
                            render={
                              <Link
                                to={`/complaints?customer_id=${customer.id}`}
                              />
                            }
                            variant="destructive"
                            size="sm"
                          >
                            {" "}
                            Complaint
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            nativeButton={false}
                            render={
                              <a
                                href={`https://wa.me/91${phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                            variant="default"
                            size="icon-sm"
                            className="flex bg-emerald-600 hover:bg-emerald-700"
                          >
                            <svg width="16px" height="16px" viewBox="0 0 24 24">
                              <path
                                fill="white"
                                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                              />
                            </svg>
                          </Button>
                          <Button
                            nativeButton={false}
                            render={
                              <a
                                href={`tel:+91${phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                            variant="default"
                            size="icon-sm"
                            className="flex bg-blue-700 hover:bg-blue-800"
                          >
                            <Phone className="size-4" />
                          </Button>
                          <Button
                            nativeButton={false}
                            render={<Link to={`/customers/${customer.id}`} />}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            Profile
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <PaginationUI
              page={page}
              setPage={setPage}
              totalCount={totalCount}
              pageSize={limit}
              setPageSize={setLimit}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerList
