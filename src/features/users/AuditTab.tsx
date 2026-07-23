import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useState } from "react"
import PaginationUI from "@/components/PaginationUI"

function AuditTab() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const {
    data: { auditData = [], totalCount = 0 } = {},
    isLoading: auditLoading,
  } = useQuery({
    queryKey: ["admin-audit-logs", page, pageSize],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order("created_at", { ascending: false })
      if (error) throw error
      console.log(error)

      return { auditData: data || [], totalCount: count || 0 }
    },
  })
  const totalPages = Math.ceil(totalCount / pageSize)
  return (
    <div>
      <Card>
        <div className="overflow-x-auto">
          {auditLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading trails...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Operator</TableHead>
                  <TableHead className="font-semibold">
                    Action Description
                  </TableHead>
                  <TableHead className="font-semibold">Component</TableHead>
                  <TableHead className="font-semibold">Details</TableHead>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditData.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-semibold">
                      {log.profiles?.full_name || "System"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {log.action}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] capitalize">
                      {log.entity_type}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate font-mono text-[10px] text-muted-foreground"
                      title={JSON.stringify(log.details)}
                    >
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {totalPages > 1 && (
          <PaginationUI
            page={page}
            setPage={setPage}
            totalCount={totalCount}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        )}
      </Card>
    </div>
  )
}

export default AuditTab
