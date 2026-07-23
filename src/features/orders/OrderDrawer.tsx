import { Button } from "@/components/ui/button"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import type { CheckoutItem } from "./OrderCreate"
import { ButtonGroup } from "@/components/ui/button-group"
import { Minus, Plus } from "lucide-react"

const initialItem: CheckoutItem = {
  id: "",
  item_name: "",
  barcode: "",
  specs: "",
  quantity: 1,
  unit_price: 0,
  is_custom: true,
}

export function OrderDrawer({
  setCart,
}: {
  cart: CheckoutItem[]
  setCart: React.Dispatch<React.SetStateAction<CheckoutItem[]>>
}) {
  const [open, setOpen] = useState(false)
  const [item, setItem] = useState<CheckoutItem>(initialItem)

  useEffect(() => {
    if (open) {
      setItem({
        ...initialItem,
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })
    }
  }, [open])

  const handleChange = (
    field: keyof CheckoutItem,
    value: CheckoutItem[keyof CheckoutItem]
  ) => {
    setItem((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = () => {
    if (!item.item_name.trim()) return

    setCart((prev) => [...prev, item])

    setOpen(false)
    setItem(initialItem)
  }

  const handleCancel = () => {
    setOpen(false)
    setItem(initialItem)
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button variant="outline" />}>
        Custom Row
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Custom Item</DrawerTitle>
          <DrawerDescription>
            Create a custom item for this order.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={item.item_name}
              placeholder="Item Name"
              onChange={(e) => handleChange("item_name", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Barcode</Label>
            <Input
              value={item.barcode ?? ""}
              placeholder="Barcode"
              onChange={(e) => handleChange("barcode", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Specs</Label>
            <Input
              value={item.specs || ""}
              placeholder="Specifications"
              onChange={(e) => handleChange("specs", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Quantity</Label>

            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() =>
                  handleChange("quantity", Math.max(1, item.quantity - 1))
                }
              >
                <Minus />
              </Button>

              <Input
                type="number"
                min={1}
                onFocus={(e) => e.target.select()}
                className="text-center"
                value={item.quantity}
                onChange={(e) =>
                  handleChange(
                    "quantity",
                    Math.max(1, Number(e.target.value) || 1)
                  )
                }
              />

              <Button
                variant="outline"
                onClick={() => handleChange("quantity", item.quantity + 1)}
              >
                <Plus />
              </Button>
            </ButtonGroup>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit}>Add Item</Button>

          <DrawerClose
            render={<Button variant="outline">Cancel</Button>}
            onClick={handleCancel}
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
