import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { supabase } from "@/utils/supabase"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Download, UploadCloud } from "lucide-react"
import { useRef } from "react"
import * as XLSX from "xlsx"

export function BulkUpload() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const bulkUploadMutation = useMutation({
    mutationFn: async (newProducts: any[]) => {
      const { data, error } = await supabase.from("products").insert(
        newProducts.map((p) => ({
          ...p,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Products imported successfully!")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import products")
    },
  })

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        name: "Example Product",
        barcode: "123456789",
        specs: "Specs string",
        unit_price: 100,
        stock_quantity: 10,
      },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, "Product_Upload_Template.xlsx")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        const formattedData = data
          .map((item: any) => ({
            name: item.name || item.Name,
            barcode:
              item.barcode || item.Barcode
                ? String(item.barcode || item.Barcode)
                : null,
            specs: item.specs || item.Specs || null,
            unit_price: Number(
              item.unit_price ??
                item["Unit Price"] ??
                item.price ??
                item.Price ??
                0
            ),
            stock_quantity: Math.floor(
              Number(
                item.stock_quantity ??
                  item["Stock Quantity"] ??
                  item.stock ??
                  item.Stock ??
                  0
              )
            ),
          }))
          .filter((item: any) => item.name)

        if (formattedData.length === 0) {
          toast.error("No valid products found in the file")
          return
        }
        console.log(formattedData)

        bulkUploadMutation.mutate(formattedData)
      } catch (error) {
        console.log(error)

        toast.error("Error reading file")
      }
    }
    reader.readAsBinaryString(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline">Open Dialog</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              onChange={handleFileUpload}
              id="fileupload"
              type="file"
              className="hidden"
            />
            <label
              htmlFor="fileupload"
              className="flex h-25 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs hover:bg-muted hover:text-accent-foreground"
            >
              <UploadCloud size={30} strokeWidth={0.5} />
              <p>Upload File</p>
            </label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="sm:flex"
          >
            <Download className="mr-2 h-4 w-4" />
            Template
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkUploadMutation.isPending}
          >
            {bulkUploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
