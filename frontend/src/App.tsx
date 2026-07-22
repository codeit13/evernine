import { Link, NavLink, Route, Routes } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import Dashboard from "@/pages/Dashboard"
import BusinessDetail from "@/pages/BusinessDetail"
import Analyze from "@/pages/Analyze"
import Methodology from "@/pages/Methodology"

const NAV = [
  { to: "/", label: "Portfolio", end: true },
  { to: "/analyze", label: "Analyze", end: false },
  { to: "/methodology", label: "How it works", end: false },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="10.5" stroke="hsl(var(--primary))" strokeWidth="2.4" />
        <circle cx="13" cy="13" r="3.6" fill="hsl(var(--primary))" />
        <path d="M13 2.5 A10.5 10.5 0 0 1 22.6 8.9" stroke="hsl(var(--accent-foreground))" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight">Evernine</span>
    </Link>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-30 h-[60px] border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-6 px-[26px]">
        <Logo />
        <nav className="flex gap-[3px] rounded-[11px] border bg-secondary/60 p-[3px]">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3.5 py-[7px] text-[13px] transition-all",
                  isActive
                    ? "bg-card font-semibold text-foreground shadow-sm"
                    : "font-medium text-subtle hover:text-foreground"
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-[9px] border bg-card px-2.5 py-1.5 text-[12.5px] text-subtle sm:flex">
            <span className="size-[7px] rounded-full bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.16)]" />
            Live scoring
          </div>
          <ThemeToggle />
          <div className="flex size-[34px] items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--accent-foreground))] text-[13px] font-semibold text-primary-foreground">
            EV
          </div>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/business/:id" element={<BusinessDetail />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </div>
  )
}
