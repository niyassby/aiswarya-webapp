import { Card } from '@/components/ui/card'
import { supabase } from '@/utils/supabase'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {  ClipboardCheck } from 'lucide-react'
import { toast } from '@/components/ui/toast'

function InvitationTab() {
    const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invited_users")
        .select()
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const handleCopytoClipboard = (id: any)=>{
    const link = `${import.meta.env.VITE_SITE_URL}/#/join/${id}`
    navigator.clipboard.writeText(link)
    toast.success("Link copied to clipboard")
  }
  return (
    <div>
        <div className="overflow-x-auto">
          {invitesLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading directory...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-950/20">
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Created At</TableHead>
                  <TableHead className="font-semibold">
                    Assigned Roles
                  </TableHead>
                  <TableHead className="font-semibold">Expires On</TableHead>
                  <TableHead className="w-[180px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((member) => {
                  return (
                    <TableRow
                      key={member.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                    >
                      <TableCell>
                        <div>
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell >
                        {format(new Date(member.created_at), "PPP") || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member?.role?.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">
                              No Roles
                            </span>
                          ) : (
                            member?.role?.map((r: string) => (
                              <span
                                key={r}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase dark:border-slate-800 dark:bg-slate-950"
                              >
                                {r}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(member.expire_at) > new Date() ? format(new Date(member.expire_at), "PPP") || "-" : <span className="text-rose-500">Expired</span>}
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleCopytoClipboard(member.id)} variant='outline' size='icon'><ClipboardCheck/></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
    </div>
  )
}

export default InvitationTab