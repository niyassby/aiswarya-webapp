import React from "react"
import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-4 text-center font-sans dark:bg-slate-950">
      <div className="max-w-md space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl dark:border-slate-800/80 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Access Denied
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your account does not have the required role permissions to access
          this module. Please contact your administrator if you believe this is
          an error.
        </p>
        <div className="pt-2">
          <Button render={<Link to="/" />} className="w-full rounded-xl">
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized
