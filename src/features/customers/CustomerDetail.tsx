import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "@/components/ui/toast";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  Plus,
  Edit2,
  Calendar,
  DollarSign,
  ArrowLeft,
  ShoppingBag
} from "lucide-react";

// Form Schema
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  tax_id: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSalesAdmin, isAccounts, isManager, isSuperAdmin } = useRole();
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const canEdit = isSalesAdmin || isSuperAdmin;

  // 1. Fetch Customer Data
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // 2. Fetch Customer Orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (isSalesAdmin && !isSuperAdmin && !isManager) {
        query = query.eq("created_by", user.id);
      } else if (isAccounts && !isSuperAdmin && !isManager) {
        query = query.neq("status", "enquiry");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!user,
  });

  // React Hook Form for Edit
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    values: customer
      ? {
          name: customer.name,
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
          tax_id: customer.tax_id || "",
          notes: customer.notes || "",
        }
      : undefined,
  });

  // Update Customer Mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: values.name,
          phone: values.phone || null,
          email: values.email || null,
          address: values.address || null,
          tax_id: values.tax_id || null,
          notes: values.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer profile updated!");
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const onEditSubmit = (values: CustomerFormValues) => {
    updateCustomerMutation.mutate(values);
  };

  if (customerLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading profile details...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold">Customer profile not found</h2>
        <Button onClick={() => navigate("/customers")} className="mt-4 rounded-xl">
          Back to Directory
        </Button>
      </div>
    );
  }

  // Calculate Order Aggregates
  const totalOrdersCount = orders.length;
  const totalSales = orders.reduce((sum, order) => {
    const orderTotal = (order.order_items || []).reduce(
      (s: number, item: any) => s + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0
    );
    return sum + (order.status !== "cancelled" ? orderTotal : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Back navigation & Actions */}
      <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-2">
        <Button onClick={() => navigate(-1)} variant="secondary" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {canEdit && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger render={
                <Button variant="outline">
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              } />
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Customer Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" {...register("phone")} />
                      {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_id">GST / Tax ID</Label>
                    <Input id="tax_id" {...register("tax_id")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" {...register("address")} rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Internal Notes</Label>
                    <Textarea id="notes" {...register("notes")} rows={2} />
                  </div>

                  <DialogFooter className="pt-4">
                    <DialogClose render={
                      <Button type="button" variant="outline" className="rounded-xl">
                        Cancel
                      </Button>
                    } />
                    <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {isSalesAdmin && (
            <Button render={<Link to={`/orders/create?customer_id=${customer.id}`} />} >
              <Plus className="h-4 w-4" />
              New Sales Order
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Info card left, stats & history right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="">
            <CardHeader className="">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-3 shadow-sm">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">{customer.name}</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Customer since {new Date(customer.created_at).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Contact Grid */}
              <div className="space-y-3">
                {customer.phone && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <Phone className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Phone</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{customer.phone}</span>
                    </div>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <Mail className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Email</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate block max-w-[200px]">
                        {customer.email}
                      </span>
                    </div>
                  </div>
                )}
                {customer.tax_id && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <FileSpreadsheet className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground block">GST / Tax ID</span>
                      <span className="font-mono text-xs font-semibold  px-1.5 py-0.5 rounded border ">
                        {customer.tax_id}
                      </span>
                    </div>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Billing Address</span>
                      <span className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                        {customer.address}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {customer.notes && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Internal Notes
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                    {customer.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orders History & Aggregates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aggregate Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-5 bg-card flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-950/30">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Orders</span>
                <h3 className="text-xl font-bold mt-0.5">{totalOrdersCount}</h3>
              </div>
            </div>

            <div className="rounded-2xl border p-5 bg-card flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-950/30">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sales (Net)</span>
                <h3 className="text-xl font-bold mt-0.5">₹{totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <Card className="">
            <CardHeader className="border-b  p-5">
              <CardTitle className="text-base font-bold">Order History Log</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Loading orders history...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  This customer has not placed any orders yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow >
                      <TableHead className="font-semibold text-xs">Order No</TableHead>
                      <TableHead className="font-semibold text-xs">Date</TableHead>
                      <TableHead className="font-semibold text-xs">Items</TableHead>
                      <TableHead className="font-semibold text-xs">Total Amount</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const itemsText = (order.order_items || [])
                        .map((item: any) => `${item.item_name} (x${item.quantity})`)
                        .join(", ");
                      
                      const orderTotal = (order.order_items || []).reduce(
                        (s: number, item: any) => s + Number(item.quantity || 0) * Number(item.unit_price || 0),
                        0
                      );

                      return (
                        <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-xs">
                          <TableCell className="font-semibold font-mono">{order.order_no}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate" title={itemsText}>
                            {itemsText || "-"}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                            ₹{orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} type="order" />
                          </TableCell>
                          <TableCell>
                            <Button render={<Link to={`/orders/${order.id}`} />} variant="ghost" size="sm" className="h-8 rounded-lg text-[10px] px-2.5">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
