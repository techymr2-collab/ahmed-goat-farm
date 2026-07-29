import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  PawPrint,
  Syringe,
  HeartHandshake,
  Scale,
  Wallet,
  IndianRupee,
  LogOut,
  Menu,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/goats', label: 'Goats', icon: PawPrint },
  { to: '/health', label: 'Health & Vaccination', icon: Syringe },
  { to: '/breeding', label: 'Breeding', icon: HeartHandshake },
  { to: '/weight', label: 'Weight Tracking', icon: Scale },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/sales', label: 'Sales', icon: IndianRupee },
]

function SidebarContent({ onNavigate }) {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-white">
          AG
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-foreground">Ahmed Goat Farm</p>
          <p className="truncate text-xs text-muted-foreground">Herd management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4">
        {user && (
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                isActive ? 'bg-muted' : 'hover:bg-muted'
              }`
            }
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={15} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{profile?.full_name || 'Your profile'}</p>
              <p className="truncate text-xs text-muted-foreground" title={user.email}>
                {user.email}
              </p>
            </div>
          </NavLink>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-destructive"
        >
          <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="font-heading text-sm font-semibold text-foreground">Ahmed Goat Farm</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
