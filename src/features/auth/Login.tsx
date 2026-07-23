import React, { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { useAuth } from "./useAuth"
import { supabase } from "@/utils/supabase"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldAlert } from "lucide-react"

export const Login: React.FC = () => {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [signingIn, setSigningIn] = useState(false)
  const navigate = useNavigate()

  // If already logged in, redirect to home
  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    setSigningIn(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log(error)

      if (error) throw error

      toast.success("Welcome back!")
      navigate("/", { replace: true })
    } catch (err: any) {
      console.error("Login error:", err)
      toast.error(
        err.message || "Failed to sign in. Please verify your credentials."
      )
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 p-4 font-sans dark:bg-slate-950">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden border border-slate-200/80 bg-white/70 p-0 shadow-2xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form
              onSubmit={handleLogin}
              className="flex flex-col justify-center space-y-6 p-8 md:p-10"
            >
              <div className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center self-center rounded-lg bg-primary font-bold text-primary-foreground shadow-md md:self-start">
                  A
                </div>
                <h1 className="mt-2 text-center text-2xl font-bold tracking-tight md:text-left">
                  Welcome back
                </h1>
                <p className="text-center text-sm text-muted-foreground md:text-left">
                  Sign in to the Aiswarya Sales & Purchase system.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@aiswarya.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-lg"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg"
                disabled={signingIn}
              >
                {signingIn ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="pt-2 text-center text-xs text-muted-foreground">
                <p className="flex items-center justify-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Authorized access only. Invitations required.
                </p>
              </div>
            </form>

            <div className="relative hidden overflow-hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-primary/95 mix-blend-multiply" />
              <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />

              <div className="relative z-10">
                <span className="text-xs font-semibold tracking-widest uppercase opacity-85">
                  AISWARYA GROUP
                </span>
              </div>

              <div className="relative z-10 space-y-4">
                <blockquote className="space-y-2">
                  <p className="text-lg leading-relaxed font-medium">
                    &ldquo;Seamlessly manage customers, order processing
                    pipelines, purchase requests, and complaints queue
                    resolution under a unified RBAC system.&rdquo;
                  </p>
                  <footer className="text-sm font-light opacity-75">
                    Operations Control Center
                  </footer>
                </blockquote>
              </div>

              <div className="relative z-10 text-xs opacity-50">
                © {new Date().getFullYear()} Aiswarya Group. All rights
                reserved.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
