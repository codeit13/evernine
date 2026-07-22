import { Link, NavLink, Route, Routes } from "react-router-dom"
import { Activity, LayoutDashboard, FlaskConical, BookOpen } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import Dashboard from "@/pages/Dashboard"
import BusinessDetail from "@/pages/BusinessDetail"
import Analyze from "@/pages/Analyze"
import Methodology from "@/pages/Methodology"

const NAV = [
  { to: "/", label: "Portfolio", icon: LayoutDashboard, end: true },
  { to: "/analyze", label: "Analyze", icon: FlaskConical, end: false },
  { to: "/methodology", label: "How it works", icon: BookOpen, end: false },
]

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </span>
          Evernine
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen app-bg">
      <Header />
      <main className="container px-4 py-6 sm:px-6 sm:py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/business/:id" element={<BusinessDetail />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </main>
      <footer className="border-t py-6">
        <div className="container px-4 text-center text-xs text-muted-foreground sm:px-6">
          Evernine · Confidence-aware business health intelligence
        </div>
      </footer>
    </div>
  )
}
