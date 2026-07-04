import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans text-center">
      <div className="max-w-md p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xl space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account does not have the required role permissions to access this module. Please contact your administrator if you believe this is an error.
        </p>
        <div className="pt-2">
          <Button render={<Link to="/" />} className="w-full rounded-xl">
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
