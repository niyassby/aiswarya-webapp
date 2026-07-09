import { Laptop, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/utils/theme-provider"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        }>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={'min-w-30 p-2'} align="end">
        <DropdownMenuItem className="p-2 hover:bg-muted" onClick={() => setTheme("light")}>
          <Sun/> Light
        </DropdownMenuItem>
        <DropdownMenuItem className="p-2 hover:bg-muted" onClick={() => setTheme("dark")}>
          <Moon/> Dark
        </DropdownMenuItem>
        <DropdownMenuItem className="p-2 hover:bg-muted" onClick={() => setTheme("system")}>
          <Laptop/> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}