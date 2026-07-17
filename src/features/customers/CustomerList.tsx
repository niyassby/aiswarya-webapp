import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase";
// import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, Phone, Mail, ChevronRight, Users2 } from "lucide-react";
import PaginationUI from "@/components/PaginationUI";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRole } from "@/hooks/useRole";


// Form Schema
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export const CustomerList: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSalesAdmin, isManager, isSuperAdmin } = useRole();
  const { profile, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debounceSearchTerm,setDebounceSearchTerm]=useState("")
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page,setPage]=useState(1)
  const [limit,setLimit]=useState(10)
  const [gotoPage,setGotoPage]=useState("")
  const navigate = useNavigate();



  useEffect(()=>{
    const timer=setTimeout(()=>{
      setDebounceSearchTerm(searchTerm)
      setPage(1)
    },300)
    return()=>clearTimeout(timer)
  },[searchTerm])

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
  });

  // Query to fetch customers
  const { data: {customers = [] , totalCount = 0} = {}, isLoading } = useQuery({
    queryKey: ["customers", page,debounceSearchTerm, limit],
    queryFn: async () => {
        let query = supabase
          .from("customers")
          .select("*, created_by(full_name)", { count: "exact" })
          .order("created_at", { ascending: false });

        if (debounceSearchTerm) {
          query = query.or(
            `name.ilike.%${debounceSearchTerm}%,phone.ilike.%${debounceSearchTerm}%`
          );
        }

        if (isSalesAdmin && !isSuperAdmin && !isManager) {
          query = query.eq("created_by", user?.id)
        }

        const { data, error, count } = await query.range(
          (page - 1) * limit,
          page * limit - 1
        );
      if (error) throw error;
      return {customers:data || [] , totalCount: count || 0}
    },
  });
  const totalPages = Math.ceil(totalCount / limit);
  console.log(customers);
  

  // Mutation to create customer
  const createCustomerMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const { data, error } = await supabase.from("customers").insert([
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
      .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added successfully!");
      reset();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add customer");
    },
  });

const onSubmit = async (values: CustomerFormValues) => {
  try {
    const customer = await createCustomerMutation.mutateAsync(values);

    if (gotoPage) {
      if (gotoPage === "salesOrder") {
        navigate(`/orders/create?customer_id=${customer.id}`);
      } else {
        navigate(`/complaints?customer_id=${customer.id}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

  

  return (
    <div className="space-y-6">
      {/* Header and Counters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight ">Customers Directory</h1>
          <p className="text-muted-foreground">Manage and view order histories for Aiswarya customers.</p>
        </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={
              <Button>
                <UserPlus className="h-4 w-4" />
                Add Customer
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" {...register("name")} placeholder="John Doe" />
                  {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" {...register("phone")} placeholder="+1234567890" />
                    {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="john@example.com" />
                    {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" {...register("address")} placeholder="Customer street address..." rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea id="notes" {...register("notes")} placeholder="Preferences, tax details, terms..." rows={2} />
                </div>

                <div>
                  <RadioGroup onValueChange={(value:string)=>setGotoPage(value)} className="flex max-md:flex-col md:items-center gap-2">
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
          <RadioGroupItem value="fileComplaint" id="fileComplaint" />
        </Field>
      </FieldLabel>
    </RadioGroup>
                </div>

                <DialogFooter className="pt-4">
                  <DialogClose render={
                    <Button type="button" variant="outline" className="rounded-xl">
                      Cancel
                    </Button>
                  } />
                  <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                    {isSubmitting ? "Saving..." : "Save Customer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
      </div>

      {/* Directory Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border  bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-950/30">
            <Users2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Customers</span>
            <h3 className="text-2xl font-bold mt-0.5">{totalCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="p-5 border-b  flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, tax ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 "
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading customers directory...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No customers found. {searchTerm ? "Try adjusting your filters." : "Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-950/20">
                  <TableHead className="font-semibold w-[200px] max-w-sm">Name</TableHead>
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
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                    <TableCell className="font-semibold text-slate-900 dark:text-white">
                      <Link to={`/customers/${customer.id}`} className="hover:underline">
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
                    {(isSuperAdmin || isManager) && (<TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {customer.created_by?.full_name || "-"}
                    </TableCell>)}
                    <TableCell className="font-mono text-xs w-fit ">
                      <div className="space-x-2">
                        <Button nativeButton={false} render={<Link to={`/orders/create?customer_id=${customer.id}`} />} variant="outline" size="sm"> Order</Button>
                        <Button nativeButton={false} render={<Link to={`/complaints?customer_id=${customer.id}`} />} variant="destructive" size="sm"> Complaint</Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button nativeButton={false} render={<Link to={`/customers/${customer.id}`} />} variant="ghost" size="sm" className="rounded-xl flex items-center gap-1">
                        Profile
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
  );
};

export default CustomerList;
