import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/utils/supabase"
import { useRole } from "@/hooks/useRole"
import { toast } from "@/components/ui/toast"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Search, Plus, Barcode, Edit, Package, AlertCircle } from "lucide-react"
import PaginationUI from "@/components/PaginationUI"

// Form Schema
const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  barcode: z
    .string()
    .min(3, "Barcode must be at least 3 characters")
    .optional()
    .or(z.literal("")),
  specs: z.string().optional().or(z.literal("")),
  stock_quantity: z.coerce.number().min(0, "Stock cannot be negative"),
  unit_price: z.coerce.number().min(0, "Price cannot be negative"),
})

type ProductFormValues = z.infer<typeof productSchema>

export const ProductList: React.FC = () => {
  const queryClient = useQueryClient()
  const { isSalesAdmin, isManager, isSuperAdmin } = useRole()
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const canModify = isSalesAdmin || isManager || isSuperAdmin

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: "",
      barcode: "",
      specs: "",
      stock_quantity: 0,
      unit_price: 0,
    },
  })

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Query to fetch products
  const { data, isLoading } = useQuery({
    queryKey: ["products", page, pageSize, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,barcode.ilike.%${debouncedSearch}%,specs.ilike.%${debouncedSearch}%`
        )
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error
      return { products: data || [], totalCount: count || 0 }
    },
  })

  const products = data?.products || []
  const totalCount = data?.totalCount || 0

  // Mutation to create/update product
  const saveProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name,
        barcode: values.barcode || null,
        specs: values.specs || null,
        stock_quantity: values.stock_quantity,
        unit_price: values.unit_price,
        updated_at: new Date().toISOString(),
      }

      if (editingProduct) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id)
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from("products").insert([
          {
            ...payload,
            created_at: new Date().toISOString(),
          },
        ])
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(editingProduct ? "Product updated!" : "Product created!")
      handleCloseDialog()
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save product")
    },
  })

  const onSubmit = (values: ProductFormValues) => {
    saveProductMutation.mutate(values)
  }

  const handleOpenAdd = () => {
    setEditingProduct(null)
    reset({
      name: "",
      barcode: "",
      specs: "",
      stock_quantity: 0,
      unit_price: 0,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product)
    reset({
      name: product.name,
      barcode: product.barcode || "",
      specs: product.specs || "",
      stock_quantity: product.stock_quantity,
      unit_price: product.unit_price,
    })
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingProduct(null)
  }

  const handleBarcodeScanned = (barcode: string) => {
    setValue("barcode", barcode)
    toast.success(`Scanned: ${barcode}`)
  }

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Products Catalog
          </h1>
          <p className="text-muted-foreground">
            Manage and track inventory stock counts and pricing.
          </p>
        </div>

        {canModify && (
          <div className="flex gap-2">
            {/* <BulkUpload/> */}
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Catalog Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:bg-violet-950/30">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Catalog Items
            </span>
            <h3 className="mt-0.5 text-2xl font-bold">{totalCount}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-950/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Low Stock Warning
            </span>
            <h3 className="mt-0.5 text-2xl font-bold">
              {products.filter((p) => p.stock_quantity <= 5).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Dialog for Add/Edit */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. 10mm Steel Rods"
              />
              {errors.name && (
                <p className="text-xs text-rose-500">{errors.name.message}</p>
              )}
            </div>

            {/* Barcode with camera scanner button */}
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode / EAN (Optional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="barcode"
                    {...register("barcode")}
                    className="pl-10"
                    placeholder="e.g. 890123456789"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                  className="flex shrink-0 items-center gap-1 rounded-xl"
                >
                  <Barcode className="h-4 w-4" />
                  Scan
                </Button>
              </div>
              {errors.barcode && (
                <p className="text-xs text-rose-500">
                  {errors.barcode.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  {...register("unit_price")}
                />
                {errors.unit_price && (
                  <p className="text-xs text-rose-500">
                    {errors.unit_price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  {...register("stock_quantity")}
                />
                {errors.stock_quantity && (
                  <p className="text-xs text-rose-500">
                    {errors.stock_quantity.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specs">Technical Specifications</Label>
              <Textarea
                id="specs"
                {...register("specs")}
                placeholder="Grade, dimensions, weight, manufacturer..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Camera Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScanned}
      />

      {/* Catalog Table */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center border-b p-5">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search catalog by name, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Loading products catalog...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No products found in catalog.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Barcode</TableHead>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold">
                    Specifications
                  </TableHead>
                  <TableHead className="font-semibold">Price</TableHead>
                  <TableHead className="font-semibold">
                    Stock Quantity
                  </TableHead>
                  {canModify && <TableHead className="w-[80px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {product.barcode ? (
                        <div className="flex items-center gap-1">
                          <Barcode className="h-3.5 w-3.5 opacity-65" />
                          {product.barcode}
                        </div>
                      ) : (
                        <span className="font-sans text-slate-400 italic">
                          No Barcode
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {product.name}
                    </TableCell>
                    <TableCell
                      className="max-w-xs truncate text-xs text-muted-foreground"
                      title={product.specs}
                    >
                      {product.specs || "-"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₹
                      {Number(product.unit_price).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold ${
                          product.stock_quantity <= 5
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-500"
                            : ""
                        } inline-block rounded-full border px-2.5 py-0.5 text-xs`}
                      >
                        {product.stock_quantity} units
                      </span>
                    </TableCell>
                    {canModify && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(product)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalCount > 1 && (
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
    </div>
  )
}

export default ProductList
