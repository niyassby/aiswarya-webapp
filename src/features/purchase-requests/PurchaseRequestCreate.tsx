import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Trash2,
  Plus,
  ArrowLeft,
  ShoppingBag,
  Info,
  // Calendar,
  Truck,
  Minus,
  ChevronDownIcon,
} from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"
import { PurchaseDrawer } from "./PurchaseDrawer"

export interface PurchaseItemInput {
  id: string // Temp ID for React key/lookup
  product_name: string
  specs: string
  quantity: number
  is_custom: boolean
}

export const PurchaseRequestCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const isMobile = useIsMobile()

  // Fetch existing Purchase Request for editing
  const { data: existingPr, isLoading: isPrLoading } = useQuery({
    queryKey: ["edit-pr", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*, purchase_request_items(*)")
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEdit,
  })

  // General fields
  const [expectedDate, setExpectedDate] = useState<Date>()
  const [supplierInfo, setSupplierInfo] = useState("")

  // Items fields
  const [items, setItems] = useState<PurchaseItemInput[]>([])

  useEffect(() => {
    if (isEdit && existingPr) {
      setExpectedDate(existingPr.expected_date ? new Date(existingPr.expected_date) : undefined)
      setSupplierInfo(existingPr.supplier_info || "")
      const mappedItems: PurchaseItemInput[] = existingPr.purchase_request_items.map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        specs: item.specs || "",
        quantity: item.quantity,
        is_custom: true, // make them editable inputs
      }))
      setItems(mappedItems)
    }
  }, [isEdit, existingPr])
  const [productSearch, setProductSearch] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // Fetch Products for Autocomplete
  const { data: products = [] } = useQuery({
    queryKey: ["products-pr-create"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name")
      if (error) throw error
      return data || []
    },
  })

  // Filtered product catalog search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Add catalog item
  const handleAddProduct = (product: any) => {
    const existing = items.find(
      (item) => !item.is_custom && item.product_name.toLowerCase() === product.name.toLowerCase()
    )
    if (existing) {
      setItems(
        items.map((item) =>
          !item.is_custom && item.product_name.toLowerCase() === product.name.toLowerCase()
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
      toast.success(`Incremented quantity of ${product.name}`)
    } else {
      setItems([
        ...items,
        {
          id: product.id,
          product_name: product.name,
          specs: product.specs || "",
          quantity: 1,
          is_custom: false,
        },
      ])
      toast.success(`Added ${product.name} to request`)
    }
    setProductSearch("")
    setShowProductDropdown(false)
  }

  // Add custom manual item
  const handleAddCustomItem = () => {
    const tempId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setItems([
      ...items,
      {
        id: tempId,
        product_name: "",
        specs: "",
        quantity: 1,
        is_custom: true,
      },
    ])
  }

  // Update item fields
  const handleUpdateItem = (
    id: string,
    field: keyof PurchaseItemInput,
    value: any
  ) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: value,
        }
      })
    )
  }

  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  // Mutation to Submit Purchase Request
  const submitPrMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Add at least one item to request")
      const invalidItem = items.find((item) => !item.product_name.trim())
      if (invalidItem) throw new Error("All items must have a product name")

      if (isEdit) {
        // 1. Update Purchase Request
        const { error: prErr } = await supabase
          .from("purchase_requests")
          .update({
            expected_date: expectedDate || null,
            supplier_info: supplierInfo || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
        if (prErr) throw prErr

        // 2. Delete existing items
        const { error: deleteErr } = await supabase
          .from("purchase_request_items")
          .delete()
          .eq("purchase_request_id", id)
        if (deleteErr) throw deleteErr

        // 3. Insert new items
        const itemsPayload = items.map((item) => ({
          purchase_request_id: id,
          product_name: item.product_name,
          specs: item.specs || null,
          quantity: item.quantity,
        }))
        const { error: itemsErr } = await supabase
          .from("purchase_request_items")
          .insert(itemsPayload)
        if (itemsErr) throw itemsErr

        // 4. Log to audit log
        await supabase.from("audit_log").insert([
          {
            actor_id: profile?.id,
            action: `Edited Purchase Request ${existingPr?.request_no}`,
            entity_type: "purchase_requests",
            entity_id: id,
            details: { total_items: items.length },
          },
        ])

        return { id }
      } else {
        // 1. Insert Purchase Request
        const { data: prData, error: prErr } = await supabase
          .from("purchase_requests")
          .insert([
            {
              expected_date: expectedDate || null,
              supplier_info: supplierInfo || null,
              requested_by: profile?.id,
              status: "requested",
            },
          ])
          .select()
          .single()

        if (prErr) throw prErr
        const newPr = prData

        // 2. Insert Items
        const itemsPayload = items.map((item) => ({
          purchase_request_id: newPr.id,
          product_name: item.product_name,
          specs: item.specs || null,
          quantity: item.quantity,
        }))

        const { error: itemsErr } = await supabase
          .from("purchase_request_items")
          .insert(itemsPayload)
        
        if (itemsErr) throw itemsErr

        // 3. Log to audit log
        await supabase.from("audit_log").insert([
          {
            actor_id: profile?.id,
            action: `Created Purchase Request ${newPr.request_no}`,
            entity_type: "purchase_requests",
            entity_id: newPr.id,
            details: { total_items: items.length },
          },
        ])

        return newPr
      }
    },
    onSuccess: (prResult) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
      queryClient.invalidateQueries({ queryKey: ["purchase-request", prResult.id] })
      toast.success(isEdit ? "Purchase request updated successfully!" : "Purchase request raised successfully!")
      navigate(`/purchase-requests/${prResult.id}`)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit request")
    },
  })

  if (isEdit && isPrLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent font-semibold"></div>
        <p className="text-sm text-muted-foreground font-semibold">Loading purchase request details for edit...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between max-md:flex-col max-md:items-start gap-3">
        <Button onClick={() => navigate("/purchase-requests")} variant="secondary" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          {isEdit ? `Edit Purchase Request: ${existingPr?.request_no || ""}` : "Raise Purchase Request"}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items List Area */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="py-0">
            <CardHeader className="flex flex-row max-md:flex-col max-md:items-start gap-4 items-center justify-between border-b p-5">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Requested items ({items.length})
              </CardTitle>

              <div className="flex gap-2">
                {isMobile ? <PurchaseDrawer setCart={setItems} />
                :<Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomItem}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Custom Row
                </Button>}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Product Catalog Search */}
              <div className="relative p-4">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search catalog by name to add..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowProductDropdown(true)
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="rounded-xl pl-10"
                  />
                  {productSearch && (
                    <button
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground underline hover:text-slate-900"
                      onClick={() => {
                        setProductSearch("")
                        setShowProductDropdown(false)
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Catalog Dropdown */}
                {showProductDropdown && productSearch && (
                  <div className="absolute right-4 left-4 z-10 mt-1 max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2 shadow-lg bg-popover">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No product matches found. Add a custom row instead!
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-secondary"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.name}
                            </span>
                            {p.specs && (
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                ({p.specs})
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Request items list is empty
                    </p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Search catalog items above to add them, or add "Custom Rows" for items not present in the catalog.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Item</TableHead>
                        <TableHead className="font-semibold">Specifications</TableHead>
                        <TableHead className="w-32 font-semibold">Quantity</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.is_custom ? (
                              <Input
                                value={item.product_name}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "product_name",
                                    e.target.value
                                  )
                                }
                                placeholder="Product Name (required)"
                                className="w-fit max-w-[240px]"
                              />
                            ) : (
                              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {item.product_name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.specs}
                              onChange={(e) =>
                                handleUpdateItem(item.id, "specs", e.target.value)
                              }
                              placeholder="e.g. Dimensions, Grade"
                              className="w-fit"
                            />
                          </TableCell>
                          <TableCell>
                            <ButtonGroup>
                              <Button
                                size="icon"
                                type="button"
                                onClick={() =>
                                  handleUpdateItem(
                                    item.id,
                                    "quantity",
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                                variant="outline"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "quantity",
                                    Math.max(1, Number(e.target.value))
                                  )
                                }
                                className="w-12 text-center p-1"
                              />
                              <Button
                                size="icon"
                                type="button"
                                onClick={() =>
                                  handleUpdateItem(
                                    item.id,
                                    "quantity",
                                    item.quantity + 1
                                  )
                                }
                                variant="outline"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </ButtonGroup>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info & Submit */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Truck className="h-4.5 w-4.5 text-primary" />
                Request Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="expected_date" className="flex items-center gap-1">
                  Expected Delivery Date
                </Label>
                <Popover>
      <PopoverTrigger render={<Button variant={"outline"} data-empty={!expectedDate} className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground">{expectedDate ? format(expectedDate, "PPP") : <span>Pick a date</span>}<ChevronDownIcon data-icon="inline-end" /></Button>} />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={expectedDate}
          onSelect={setExpectedDate}
          defaultMonth={expectedDate}
        />
      </PopoverContent>
    </Popover>
                {/* <Input
                  id="expected_date"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="rounded-xl"
                /> */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_info">Supplier / Vendor Info (Optional)</Label>
                <Textarea
                  id="supplier_info"
                  placeholder="Supplier name, contact details, notes..."
                  value={supplierInfo}
                  onChange={(e) => setSupplierInfo(e.target.value)}
                  rows={3}
                  className="rounded-xl text-xs"
                />
              </div>

              <Button
                onClick={() => submitPrMutation.mutate()}
                disabled={items.length === 0 || submitPrMutation.isPending}
                className="mt-2 w-full rounded-xl"
              >
                {submitPrMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent font-semibold"></div>
                    {isEdit ? "Saving Changes..." : "Submitting..."}
                  </div>
                ) : (
                  isEdit ? "Save Request Changes" : "Submit Purchase Request"
                )}
              </Button>

              {items.length === 0 && (
                <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Add at least one item to submit the request.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PurchaseRequestCreate
