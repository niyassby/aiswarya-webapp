import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { toast } from "@/components/ui/toast"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Search,
  Barcode,
  Trash2,
  Plus,
  ArrowLeft,
  User,
  ShoppingBag,
  Info,
  DollarSign,
  Minus,
} from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { OrderDrawer } from "./OrderDrawer"

export interface CheckoutItem {
  id: string // Product ID or temp random ID for custom items
  item_name: string
  barcode: string | null
  specs: string | null
  quantity: number
  unit_price: number
  is_custom: boolean
}

export const OrderCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  // Fetch Existing Order if in edit mode
  const { data: existingOrder, isLoading: isOrderLoading } = useQuery({
    queryKey: ["edit-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEdit,
  })

  // State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [cart, setCart] = useState<CheckoutItem[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const isMobile = useIsMobile()

  // Pre-select customer from query param
  const paramCustomerId = searchParams.get("customer_id")

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name")
      if (error) throw error
      return data || []
    },
  })

  // Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ["products-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("name, barcode, specs, unit_price")
        .order("name")
      if (error) throw error
      return data || []
    },
  })
  console.log(products);
  

  useEffect(() => {
    if (isEdit && existingOrder) {
      setSelectedCustomerId(existingOrder.customer_id)
      const mappedCart: CheckoutItem[] = existingOrder.order_items.map((item: any) => ({
        id: item.id,
        item_name: item.item_name,
        barcode: item.barcode,
        specs: item.specs,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        is_custom: item.is_custom,
      }))
      setCart(mappedCart)
    } else if (paramCustomerId && customers.length > 0) {
      const exists = customers.some((c) => c.id === paramCustomerId)
      if (exists) {
        setSelectedCustomerId(paramCustomerId)
      }
    }
  }, [isEdit, existingOrder, paramCustomerId, customers])

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // Filtered customer list
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  )

  // Filtered product catalog search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
  )

  // Add catalog item to cart
  const handleAddProduct = (product: any) => {
    const existing = cart.find(
      (item) => !item.is_custom && item.id === product.id
    )
    if (existing) {
      setCart(
        cart.map((item) =>
          !item.is_custom && item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
      toast.success(`Incremented quantity of ${product.name}`)
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          item_name: product.name,
          barcode: product.barcode,
          specs: product.specs,
          quantity: 1,
          unit_price: Number(product.unit_price),
          is_custom: false,
        },
      ])
      toast.success(`Added ${product.name} to order`)
    }
    setProductSearch("")
    setShowProductDropdown(false)
  }

  // Add custom manual item
  const handleAddCustomItem = () => {
    const tempId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setCart([
      ...cart,
      {
        id: tempId,
        item_name: "",
        barcode: null,
        specs: "",
        quantity: 1,
        unit_price: 0,
        is_custom: true,
      },
    ])
  }

  // Barcode scanned callback
  const handleBarcodeScanned = (barcode: string) => {
    // Search in catalog
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      handleAddProduct(product)
    } else {
      toast.warning(
        `Barcode "${barcode}" not found in catalog. Adding manual entry.`
      )
      const tempId = `custom-${Date.now()}`
      setCart([
        ...cart,
        {
          id: tempId,
          item_name: `Product [${barcode}]`,
          barcode: barcode,
          specs: "Scanned, not in catalog",
          quantity: 1,
          unit_price: 0,
          is_custom: true,
        },
      ])
    }
  }

  // Update item details inside cart
  const handleUpdateItem = (
    id: string,
    field: keyof CheckoutItem,
    value: any
  ) => {
    setCart(
      cart.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [field]: value,
        }
      })
    )
  }

  // Delete item from cart
  const handleDeleteItem = (id: string) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  // Calculate order total
  const grandTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )

  // Mutation to Submit Order
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) throw new Error("Select a customer")
      if (cart.length === 0) throw new Error("Add at least one item")

      if (isEdit) {
        // 1. Update order
        const { error: orderErr } = await supabase
          .from("orders")
          .update({
            customer_id: selectedCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
        if (orderErr) throw orderErr

        // 2. Delete existing items
        const { error: deleteErr } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", id)
        if (deleteErr) throw deleteErr

        // 3. Insert new items
        const itemsPayload = cart.map((item) => ({
          order_id: id,
          barcode: item.barcode,
          item_name: item.item_name,
          specs: item.specs,
          is_custom: item.is_custom,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))

        const { error: itemsErr } = await supabase
          .from("order_items")
          .insert(itemsPayload)
        if (itemsErr) throw itemsErr

        // 4. Log to audit log
        await supabase.from("audit_log").insert([
          {
            actor_id: profile?.id,
            action: `Edited Order ${existingOrder?.order_no}`,
            entity_type: "orders",
            entity_id: id,
            details: { total_items: cart.length, total_amount: grandTotal },
          },
        ])

        return { id }
      } else {
        // 1. Insert order
        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .insert([
            {
              customer_id: selectedCustomerId,
              status: "enquiry",
              created_by: profile?.id,
            },
          ])
          .select()
          .single()

        if (orderErr) throw orderErr
        const newOrder = orderData

        // 2. Insert items
        const itemsPayload = cart.map((item) => ({
          order_id: newOrder.id,
          barcode: item.barcode,
          item_name: item.item_name,
          specs: item.specs,
          is_custom: item.is_custom,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))

        const { error: itemsErr } = await supabase
          .from("order_items")
          .insert(itemsPayload)
        if (itemsErr) throw itemsErr

        // 3. Log initial status history
        const { error: historyErr } = await supabase
          .from("order_status_history")
          .insert([
            {
              order_id: newOrder.id,
              from_status: null,
              to_status: "enquiry",
              changed_by: profile?.id,
              note: "Order created successfully",
            },
          ])
        if (historyErr) throw historyErr

        // 4. Log to audit log
        await supabase.from("audit_log").insert([
          {
            actor_id: profile?.id,
            action: `Created Order ${newOrder.order_no}`,
            entity_type: "orders",
            entity_id: newOrder.id,
            details: { total_items: cart.length, total_amount: grandTotal },
          },
        ])

        return newOrder
      }
    },
    onSuccess: (orderResult) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["order", orderResult.id] })
      queryClient.invalidateQueries({
        queryKey: ["customer-orders", selectedCustomerId],
      })
      toast.success(isEdit ? "Order Updated Successfully!" : "Order Created Successfully!")
      navigate(`/orders/${orderResult.id}`)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit order")
    },
  })

  if (isEdit && isOrderLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent font-semibold"></div>
        <p className="text-sm text-muted-foreground font-semibold">Loading order details for edit...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between max-md:flex-col max-md:items-start gap-3">
        <Button onClick={() => navigate(-1)} variant="secondary" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          {isEdit ? `Edit Sales Order: ${existingOrder?.order_no || ""}` : "Create Sales Order"}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Checkout Items Area */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="py-0">
            <CardHeader className="flex flex-row max-md:flex-col max-md:items-start gap-4 items-center justify-between border-b p-5">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Line Items Cart ({cart.length})
              </CardTitle>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setScannerOpen(true)}
                  size={'sm'}
                >
                  <Barcode className="h-4 w-4" />
                  Camera Scan
                </Button>

                {isMobile ? <OrderDrawer cart={cart} setCart={setCart} /> :
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomItem}
                  size={'sm'}
                >
                  <Plus className="h-4 w-4" />
                  Custom Row
                </Button>
                }
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Product Catalog Search Dropdown inside card */}
              <div className="dark:border-slate-850 relative  p-4">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search catalog by name or barcode to add..."
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

                {/* Catalog Search Panel dropdown */}
                {showProductDropdown && productSearch && (
                  <div className="absolute right-4 left-4 z-10 mt-1 max-h-56 space-y-1 overflow-y-auto rounded-xl border  p-2 shadow-lg bg-popover">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No product matches found. Add a custom row instead!
                      </div>
                    ) : (
                      filteredProducts.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-secondary"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.name}
                            </span>
                            {p.barcode && (
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                ({p.barcode})
                              </span>
                            )}
                          </div>
                          <span className="font-bold">
                            ₹{Number(p.unit_price).toFixed(2)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Cart Table */}
              <div className="overflow-x-auto">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Your order cart is empty
                    </p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Search catalog items, click "Camera Scan" to read
                      barcodes, or add "Custom Rows" for bespoke items.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow >
                        <TableHead className=" font-semibold">
                          Item
                        </TableHead>
                        <TableHead className="w-[15%] font-semibold">Barcode</TableHead>
                        <TableHead className=" font-semibold">
                          Description
                        </TableHead>
                        <TableHead className="w-20 font-semibold">
                          Quantity
                        </TableHead>
                        {/* <TableHead className="w-[20%] font-semibold text-right">Subtotal</TableHead> */}
                        <TableHead className="w"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow
                          key={item.id}
                        >
                          <TableCell >
                            {item.is_custom ? (
                              <div className="space-y-1.5">
                                <Input
                                  value={item.item_name}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      item.id,
                                      "item_name",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Item Name (required)"
                                  className="w-fit"
                                />
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {item.item_name}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell >
                            {item.is_custom ? (
                              <div className="space-y-1.5">
                                <Input
                                  value={item.barcode ?? ""}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      item.id,
                                      "barcode",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Barcode"
                                  className="w-35"
                                />
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {item.barcode}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell >
                            <div className="space-y-1.5">
                                <Input
                                  value={item.specs || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      item.id,
                                      "specs",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Specs (e.g. Dimensions)"
                                  className="w-fit"
                                />
                              </div>
                          </TableCell>
                          <TableCell >
                            <ButtonGroup>
                              <Button size={'icon'} onClick={()=> handleUpdateItem(item.id, "quantity",  Math.max(1,item.quantity - 1))} variant="outline">
                                <Minus />
                              </Button>
                              <Input
                              type="number"
                              min={1}
                              onFocus={(e) => e.target.select()}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  "quantity",
                                  Math.max(1, Number(e.target.value))
                                )
                              }
                              className="min-w-10 px-1 text-center appearance-none"
                            />
                              <Button size={'icon'} onClick={()=> handleUpdateItem(item.id, "quantity", item.quantity + 1)} variant="outline">
                                <Plus />
                              </Button>
                            </ButtonGroup>
                            
                          </TableCell>
                          {/* <TableCell className="p-3 text-right font-bold text-xs">
                            ₹{(item.quantity * item.unit_price).toFixed(2)}
                          </TableCell> */}
                          <TableCell className="p-3 text-center">
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

        {/* Sidebar Summary Area (Customer selection and checkout action) */}
        <div className="space-y-6">
          {/* Customer Selection Card */}
          <Card className="overflow-visible">
            <CardHeader className="dark:border-slate-850 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <User className="h-4.5 w-4.5 text-primary" />
                Select Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {!selectedCustomerId ? (
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers directory..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="rounded-xl pl-10 text-xs"
                  />

                  {/* Customer search result dropdown panel */}
                  {showCustomerDropdown && (
                    <div className="absolute right-0 left-0 z-10 mt-1 max-h-56 space-y-1 overflow-y-auto rounded-xl border  bg-popover p-2 shadow-lg ">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          No matching customer.{" "}
                          <Link
                            to="/customers"
                            className="font-medium text-primary underline"
                          >
                            Create customer
                          </Link>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id)
                              setCustomerSearch("")
                              setShowCustomerDropdown(false)
                            }}
                            className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            <span className="font-semibold">
                              {c.name}
                            </span>
                            {c.phone && (
                              <span className="text-[10px] text-muted-foreground">
                                {c.phone}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                selectedCustomer && (
                  <div className="relative space-y-3 rounded-xl border bg-muted p-4">
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                        Selected Customer
                      </span>
                      <h4 className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {selectedCustomer.name}
                      </h4>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {selectedCustomer.phone && (
                        <p>Phone: {selectedCustomer.phone}</p>
                      )}
                      {selectedCustomer.email && (
                        <p className="truncate">
                          Email: {selectedCustomer.email}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSelectedCustomerId("")}
                      className="mt-1 block h-auto p-0 text-xs font-medium text-rose-500 hover:text-rose-600"
                    >
                      Change Customer
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Pricing Summary Card */}
          <Card className="rounded-2xl pb-0">
            <CardHeader className="dark:border-slate-850 border-b  pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <DollarSign className="h-4.5 w-4.5 text-primary" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Order Type</span>
                <span className="dark:text-slate-350 rounded border bg-muted px-2 py-0.5 font-semibold ">
                  Enquiry Pipeline
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-dashed  pt-3 ">
                <span className="text-sm font-semibold">Grand Total</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  ₹
                  {grandTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <Button
                onClick={() => submitOrderMutation.mutate()}
                disabled={
                  !selectedCustomerId ||
                  cart.length === 0 ||
                  submitOrderMutation.isPending
                }
                className="mt-2 w-full"
              >
                {submitOrderMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent font-semibold"></div>
                    {isEdit ? "Saving Changes..." : "Placing Order..."}
                  </div>
                ) : (
                  isEdit ? "Save Order Changes" : "Create Enquiry Order"
                )}
              </Button>

              {(!selectedCustomerId || cart.length === 0) && (
                <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Select customer and add items to checkout.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barcode Camera Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScanned}
      />
    </div>
  )
}

export default OrderCreate
