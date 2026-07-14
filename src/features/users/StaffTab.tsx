import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardDescription } from "@/components/ui/card"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "../auth/useAuth"
import { Button } from "@/components/ui/button"
import { Shield, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useState } from "react"
import { AVAILABLE_ROLES } from "./AdminPanel"

function StaffTab() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [roleEditorOpen, setRoleEditorOpen] = useState(false)
  const [editingStaffMember, setEditingStaffMember] = useState<any | null>(null)
  const [staffEditRoles, setStaffEditRoles] = useState<string[]>([])
  
  const { data: staff = [], isLoading: staffLoading} = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles!user_roles_user_id_fkey (
            *
          )
        `)
        .order("full_name")
      if (error) throw error
      
      return data || []
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      userId,
      currentActive,
    }: {
      userId: string
      currentActive: boolean
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentActive })
        .eq("id", userId)
      if (error) throw error

      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `${currentActive ? "Suspended" : "Re-activated"} staff member profile ID ${userId}`,
          entity_type: "profiles",
          entity_id: userId,
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] })
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] })
      toast.success("Staff profile status updated!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to toggle profile status")
    },
  })

  const handleStaffRoleToggle = (role: string) => {
    if (staffEditRoles.includes(role)) {
      setStaffEditRoles(staffEditRoles.filter((r) => r !== role))
    } else {
      setStaffEditRoles([...staffEditRoles, role])
    }
  }

  const openRoleEditor = (member: any) => {
    setEditingStaffMember(member)
    const rolesList = (member.user_roles || []).map((r: any) => r.role)
    setStaffEditRoles(rolesList)
    setRoleEditorOpen(true)
  }

  const updateRolesMutation = useMutation({
    mutationFn: async () => {
      if (!editingStaffMember) return

      const userId = editingStaffMember.id

      // 1. Delete current roles
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
      if (delErr) throw delErr

      // 2. Insert new roles
      if (staffEditRoles.length > 0) {
        const rolesPayload = staffEditRoles.map((r) => ({
          user_id: userId,
          role: r as any,
          assigned_by: profile?.id,
        }))
        const { error: insErr } = await supabase
          .from("user_roles")
          .insert(rolesPayload)
        if (insErr) throw insErr
      }

      // 3. Log to audit log
      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `Modified roles for staff member ${editingStaffMember.full_name}`,
          entity_type: "user_roles",
          entity_id: userId,
          details: { roles: staffEditRoles },
        },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] })
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] })
      toast.success("User roles updated!")
      setRoleEditorOpen(false)
      setEditingStaffMember(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update roles")
    },
  })
  return (
    <div>
      <Card >
        <div className="overflow-x-auto">
          {staffLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading directory...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-950/20">
                  <TableHead className="font-semibold">Name & Email</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">
                    Assigned Roles
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => {
                  const rolesList = (member.user_roles || []).map(
                    (r: any) => r.role
                  )
                  const isSelf = member.id === profile?.id
                  return (
                    <TableRow
                      key={member.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                    >
                      <TableCell>
                        <div>
                          <span className="block font-semibold text-slate-900 dark:text-white">
                            {member.full_name}{" "}
                            {isSelf && (
                              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                                You
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                            ID: {member.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {member.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rolesList.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">
                              No Roles
                            </span>
                          ) : (
                            rolesList.map((r: string) => (
                              <span
                                key={r}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase dark:border-slate-800 dark:bg-slate-950"
                              >
                                {r.replace("_", " ")}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                            member.is_active
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                              : "border-rose-500/20 bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {member.is_active ? "Active" : "Suspended"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRoleEditor(member)}
                            className="h-8 rounded-lg text-xs"
                          >
                            Edit Roles
                          </Button>

                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  userId: member.id,
                                  currentActive: member.is_active,
                                })
                              }
                              className={`h-8 w-8 rounded-lg ${
                                member.is_active
                                  ? "text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                  : "hover:text-emerald-650 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              }`}
                              title={
                                member.is_active
                                  ? "Suspend Profile"
                                  : "Activate Profile"
                              }
                            >
                              {member.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
      {/* Role Editor Dialog */}
      <Dialog
        open={roleEditorOpen}
        onOpenChange={(o) => {
          if (!o) {
            setRoleEditorOpen(false)
            setEditingStaffMember(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Roles</DialogTitle>
            <CardDescription>
              Adjust roles for staff member: {editingStaffMember?.full_name}
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_ROLES.map((role) => {
                const isChecked = staffEditRoles.includes(role)
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleStaffRoleToggle(role)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                      isChecked
                        ? "border-primary bg-primary/5 font-bold text-primary shadow-sm"
                        : "border-slate-200 text-muted-foreground hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    }`}
                  >
                    <span className="capitalize">{role.replace("_", " ")}</span>
                    <Shield
                      className={`h-3.5 w-3.5 ${isChecked ? "text-primary opacity-100" : "opacity-35"}`}
                    />
                  </button>
                )
              })}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleEditorOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateRolesMutation.mutate()}
                disabled={updateRolesMutation.isPending}
                className="rounded-xl"
              >
                {updateRolesMutation.isPending
                  ? "Saving..."
                  : "Save Role Settings"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StaffTab
