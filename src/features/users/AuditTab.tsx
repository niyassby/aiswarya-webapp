import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

function AuditTab() {
  const [page,setPage]=useState(1)
  const limit = 10
     const { data:  {auditData = [], totalCount = 0 } = {}, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs", page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false })
      if (error) throw error
      console.log(error);
      
      return {auditData:data || [], totalCount:count|| 0}
    },
  })
  const totalPages = Math.ceil(totalCount / limit);
  return (
    <div>
        <Card >
          <div className="overflow-x-auto">
            {auditLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading trails...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow >
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
                    <TableRow
                      key={log.id}
                    >
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
                    <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
                      <span className="text-xs text-muted-foreground">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} entries
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1 max-md:hidden">
                          {Array.from({ length: totalPages > 5 ? 5 : totalPages }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPage(i + 1)}
                              className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                                page === i + 1
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
        </Card>
    </div>
  )
}

export default AuditTab