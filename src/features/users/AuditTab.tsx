import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'

function AuditTab() {
     const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      console.log(error);
      
      return data || []
    },
  })
  return (
    <div>
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="overflow-x-auto">
            {auditLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading trails...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-950/20">
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
                  {auditLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
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
        </Card>
    </div>
  )
}

export default AuditTab