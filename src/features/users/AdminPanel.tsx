import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Shield, Plus } from "lucide-react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import AuditTab from "./AuditTab"
import StaffTab from "./StaffTab"
import InvitationTab from "./InvitationTab"

export const AVAILABLE_ROLES = [
  "sales_admin",
  "accounts",
  "manager",
  "super_admin",
] as const

export const AdminPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  // Dialog controls
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["sales_admin"])

  const [email, setEmail] = useState("")
  const [date, setDate] = React.useState<Date>()

  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      if (selectedRoles.length === 0) {
        throw new Error("Select at least one role for the user")
      }

      const { data, error } = await supabase.from("invited_users").insert({
        email: email,
        role: selectedRoles,
        invited_by: profile?.id,
        expire_at: date?.toISOString() || Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
      })

      await supabase.from("audit_log").insert([
        {
          actor_id: profile?.id,
          action: `New user invited by  ${email}`,
          entity_type: "invited_users",
          details: { roles: selectedRoles },
        },
      ])

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] })
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] })
      toast.success("User registered successfully!")
      setInviteOpen(false)
      setSelectedRoles(["sales_admin"])
    },
    onError: (err: any) => {
      console.log(err)

      toast.error(err.message || "Failed to create user")
    },
  })

  const handleRoleToggle = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Super Admin Control Hub
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts, assign database roles, and view audit trail
            logs.
          </p>
        </div>

        {/* Invite User Dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger
            render={
              <Button className="flex items-center gap-2 rounded-xl shadow-md">
                <Plus className="h-4 w-4" />
                Register Staff Member
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Register New Staff Member</DialogTitle>
              <CardDescription>
                Creates an active account in Supabase Auth and binds their
                initial roles.
              </CardDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@aiswarya.com"
                />
                {/* {!email.includes('@') && (
                    <p className="text-xs text-rose-500">
                      Please enter a valid email address.
                    </p>
                  )} */}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Select expiry date</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      data-empty={!date}
                      className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                      <ChevronDownIcon />
                    </Button>
                  }
                ></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    defaultMonth={date}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Roles selection */}
            <div className="dark:border-slate-850 space-y-2.5 border-t border-slate-100 pt-2">
              <Label className="text-xs font-semibold">
                Assign System Roles (Choose multiple)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role)
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleToggle(role)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                        isChecked
                          ? "border-primary bg-primary/5 font-bold text-primary shadow-sm"
                          : "border-slate-200 text-muted-foreground hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span className="capitalize">
                        {role.replace("_", " ")}
                      </span>
                      <Shield
                        className={`h-3.5 w-3.5 ${isChecked ? "text-primary opacity-100" : "opacity-35"}`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                }
              />
              <Button
                onClick={() => inviteUserMutation.mutate()}
                disabled={inviteUserMutation.isPending}
                className="rounded-xl"
              >
                {inviteUserMutation.isPending ? "Creating..." : "Save Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TAB CONTENTS */}
      <Tabs defaultValue="staff" className="w-full">
        <TabsList>
          <TabsTrigger value="staff">Staff Directory</TabsTrigger>
          <TabsTrigger value="invites">Invitations</TabsTrigger>
          <TabsTrigger value="audit">System Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
        <TabsContent value="staff">
          <StaffTab />
        </TabsContent>
        <TabsContent value="invites">
          <InvitationTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminPanel
