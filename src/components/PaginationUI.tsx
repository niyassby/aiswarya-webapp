import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "./ui/input"
import type { Dispatch, SetStateAction } from "react"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  setPage: Dispatch<SetStateAction<number>>
  totalCount: number
  pageSize: number
  setPageSize: Dispatch<SetStateAction<number>>
}
const items = [10, 20, 30, 50, 100]

function PaginationUI({
  page = 1,
  setPage,
  totalCount = 0,
  pageSize = 10,
  setPageSize,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize)

  const handleGoToPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum)
    }
  }
  return (
    <div className="flex flex-col gap-2 border-t p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex  items-center gap-2">
          <Select
            defaultValue={pageSize}
            onValueChange={(e) => {
              setPageSize(Number(e))
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue placeholder="Per page" />
            </SelectTrigger>
            <SelectContent className={'min-w-20'}>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        <span className="text-xs text-muted-foreground">
          {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)}{" "}
          of <span className="font-medium text-foreground">{totalCount}</span>{" "}
          records
        </span>
      </div>
      <div className="">
        <div className="flex items-center gap-2">
          <Button
            size={"sm"}
            variant={"secondary"}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft /> Previous
          </Button>
          <Input
            placeholder="Go to Page"
            type="number"
            className="h-8 w-fit"
            min={1}
            max={totalPages}
            value={page}
            onChange={handleGoToPage}
            onFocus={(e)=>e.target.select()}
          />
          <Button
            size={"sm"}
            variant={"secondary"}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next<ChevronRight /> 
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PaginationUI
