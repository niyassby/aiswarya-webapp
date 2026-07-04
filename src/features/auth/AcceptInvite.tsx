import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from '@/utils/supabase';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from '@/components/ui/toast';

function AcceptInvite() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const { data: invites, isLoading: invitesLoading, error: queryError } = useQuery({
        queryKey: ["admin-invitations", id],
        queryFn: async () => {
            if (!id) throw new Error("No invitation ID provided")
            const { data, error } = await supabase
                .from("invited_users")
                .select()
                .eq("id", id)
                .single()
            if (error) throw error
            return data
        },
        retry: false
    })

    if (invitesLoading) {
        return <div className='flex items-center justify-center w-full h-screen text-sm font-medium text-slate-500 bg-slate-50 dark:bg-slate-950'>Loading invitation...</div>
    }
    if (queryError || !invites) {
        return <div className='flex items-center justify-center w-full h-screen text-sm font-medium text-red-500 bg-slate-50 dark:bg-slate-950'>Invitation not found or invalid link</div>
    }
    if (!invites.role || invites.role.length === 0) {
        return <div className='flex items-center justify-center w-full h-screen text-sm font-medium text-red-500 bg-slate-50 dark:bg-slate-950'>No roles assigned to this invitation</div>
    }
    if (invites.expire_at && new Date(invites.expire_at) < new Date()) {
        return <div className='flex items-center justify-center w-full h-screen text-sm font-medium text-red-500 bg-slate-50 dark:bg-slate-950'>This invitation has expired</div>
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error("Please enter your full name.")
            return
        }
        if (!email.trim()) {
            toast.error("Please enter your email.")
            return
        }
        if (email.trim().toLowerCase() !== invites.email.trim().toLowerCase()) {
            toast.error("The entered email does not match the invitation email.")
            return
        }
        if (invites.expire_at && new Date(invites.expire_at) < new Date()) {
            toast.error("This invitation has expired.")
            return
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long.")
            return
        }

        setSubmitting(true)

        try {
            // 1. Create a new auth user
            // Passing metadata so triggers can optionally pick it up
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: {
                        full_name: name.trim(),
                        phone: phone.trim() || null,
                    }
                }
            })

            if (signUpError) throw signUpError
            if (!signUpData.user) throw new Error("Failed to create user account.")

            const userId = signUpData.user.id

            // 2. Create the user profile
            const { error: profileError } = await supabase
                .from("profiles")
                .insert({
                    id: userId,
                    full_name: name.trim(),
                    phone: phone.trim() || null,
                    is_active: true,
                })

            if (profileError && !profileError.message.includes("duplicate key")) {
                console.error("Error creating profile:", profileError)
                throw new Error("Account created, but failed to initialize profile: " + profileError.message)
            }

            // 3. Assign roles
            if (invites.role && invites.role.length > 0) {
                const rolesPayload = invites.role.map((r: string) => ({
                    user_id: userId,
                    role: r,
                }))
                
                const { error: rolesError } = await supabase
                    .from("user_roles")
                    .insert(rolesPayload)

                if (rolesError && !rolesError.message.includes("duplicate key")) {
                    console.error("Error assigning roles:", rolesError)
                    throw new Error("Profile created, but failed to assign roles: " + rolesError.message)
                }
            }

            // 4. Delete the invitation from invited_users
            const { error: deleteError } = await supabase
                .from("invited_users")
                .delete()
                .eq("id", id)

            if (deleteError) {
                console.warn("Failed to delete invitation record:", deleteError)
            }

            toast.success("Invitation accepted successfully! Please log in.")
            navigate("/")
        } catch (err: any) {
            console.error("Error accepting invitation:", err)
            toast.error(err.message || "An error occurred while accepting the invitation.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex items-center justify-center w-full h-screen bg-slate-50 dark:bg-slate-950 p-4 font-sans">
            <Card className="w-full max-w-md border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold tracking-tight text-center">Accept Invitation</CardTitle>
                    <CardDescription className="text-center">
                        Complete your registration details to join the team
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="grid gap-1.5">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="rounded-lg"
                            />
                        </div>
                        
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="rounded-lg"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <Input 
                                id="phone" 
                                type="text" 
                                placeholder="Enter phone number" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="rounded-lg"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Create a password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                                className="rounded-lg"
                            />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" className="w-full rounded-lg" disabled={submitting}>
                                {submitting ? "Accepting..." : "Accept & Register"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default AcceptInvite