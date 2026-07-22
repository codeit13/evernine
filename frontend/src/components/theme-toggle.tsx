import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

function getInitial(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem("evernine-theme")
  if (stored) return stored === "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeToggle() {
  const [dark, setDark] = useState(getInitial)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("evernine-theme", dark ? "dark" : "light")
  }, [dark])

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      className="flex size-9 items-center justify-center rounded-[9px] border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
    </button>
  )
}
