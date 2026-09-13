import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PawPrint,
  Syringe,
  HeartHandshake,
  Scale,
  Milk,
  Wallet,
  IndianRupee,
  FileBarChart,
  LogOut,
  Menu,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from './ConfirmDialog'
import Brand, { FARM_NAME } from './Brand'

const NAV_GROUPS = [
  { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    title: 'Herd',
    items: [
      { to: '/goats', label: 'Goats', icon: PawPrint },
      { to: '/health', label: 'Health & Vaccination', icon: Syringe },
      { to: '/breeding', label: 'Breeding', icon: HeartHandshake },
      { to: '/weight', label: 'Weight Tracking', icon: Scale },
      { to: '/milk', label: 'Milk Production', icon: Milk },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/expenses', label: 'Expenses', icon: Wallet },
      { to: '/sales', label: 'Sales', icon: IndianRupee },
      { to: '/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
]

function SidebarContent({ onNavigate }) {
  const { user, profile, signOut } = useAuth()
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary text-white shadow-sm' : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4">
        {user && (
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-muted' : 'hover:bg-muted'}`
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
          onClick={() => setSignOutConfirmOpen(true)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-destructive"
        >
          <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          Sign out
        </button>
      </div>

      <ConfirmDialog
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={() => {
          setSignOutConfirmOpen(false)
          signOut()
        }}
        title="Sign out?"
        description="You'll need to sign in again to access the dashboard."
        confirmLabel="Sign out"
        danger={false}
      />
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Start each page at the top rather than keeping the previous page's scroll.
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="truncate font-heading text-sm font-semibold text-foreground">{FARM_NAME}</span>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
