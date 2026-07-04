import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { supabase } from "@/utils/supabase";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";

export const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect to home
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log(error);
      
      if (error) throw error;

      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden p-0 border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-2xl">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleLogin} className="p-8 md:p-10 flex flex-col justify-center space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md self-center md:self-start">
                  A
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-center md:text-left mt-2">Welcome back</h1>
                <p className="text-sm text-muted-foreground text-center md:text-left">
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

              <Button type="submit" className="w-full rounded-lg" disabled={signingIn}>
                {signingIn ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-2">
                <p className="flex items-center justify-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Authorized access only. Invitations required.
                </p>
              </div>
            </form>

            <div className="relative hidden bg-slate-900 md:flex md:flex-col md:justify-between p-10 text-white overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-primary/95 mix-blend-multiply" />
              <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
              
              <div className="relative z-10">
                <span className="text-xs font-semibold tracking-widest uppercase opacity-85">AISWARYA GROUP</span>
              </div>
              
              <div className="relative z-10 space-y-4">
                <blockquote className="space-y-2">
                  <p className="text-lg font-medium leading-relaxed">
                    &ldquo;Seamlessly manage customers, order processing pipelines, purchase requests, and complaints queue resolution under a unified RBAC system.&rdquo;
                  </p>
                  <footer className="text-sm font-light opacity-75">
                    Operations Control Center
                  </footer>
                </blockquote>
              </div>

              <div className="relative z-10 text-xs opacity-50">
                © {new Date().getFullYear()} Aiswarya Group. All rights reserved.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
