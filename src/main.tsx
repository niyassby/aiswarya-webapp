import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/utils/theme-provider.tsx"
import ToastProvider from "@/components/ui/toast.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import TanstackProvider from "@/utils/tanstack-provider.tsx"
import { HashRouter } from "react-router-dom"

createRoot(document.getElementById("root")!).render(
  <TanstackProvider>
    <HashRouter>
      <ThemeProvider>
        <TooltipProvider>
          <ToastProvider position="top-right" />
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </HashRouter>
  </TanstackProvider>
)
