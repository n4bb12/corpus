import { Monitor, Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "src/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/ui/shadcn/dropdown-menu"
import {
  applyTheme,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
  useThemePreference,
} from "src/lib/theme"
import { cn } from "src/lib/utils"

export type ThemeMenuProps = {
  className?: string
}

export function ThemeMenu({ className }: ThemeMenuProps) {
  const preference = useThemePreference()
  const [mounted, setMounted] = useState(false)
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  useEffect(() => {
    setMounted(true)
    applyTheme(preference)
    setResolved(resolveTheme(preference))

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      applyTheme()
      setResolved(resolveTheme(preference))
    }

    media.addEventListener("change", onChange)
    const unsubscribe = subscribeTheme((value) => {
      applyTheme(value)
      setResolved(resolveTheme(value))
    })

    return () => {
      media.removeEventListener("change", onChange)
      unsubscribe()
    }
  }, [preference])

  const Icon = !mounted
    ? Monitor
    : resolved === "dark"
      ? Moon
      : preference === "system"
        ? Monitor
        : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Theme"
          className={cn("rounded-sm", className)}
        >
          <Icon size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem onClick={() => setThemePreference("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemePreference("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemePreference("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
