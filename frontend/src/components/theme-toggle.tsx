import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

function getInitial(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem("evernine-theme")
  if (stored) return stored === "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeToggle() {
  const [dark, setDark] = useState(getInitial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", dark)
    localStorage.setItem("evernine-theme", dark ? "dark" : "light")
  }, [dark])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
