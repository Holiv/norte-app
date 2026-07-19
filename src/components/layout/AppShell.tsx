import { useEffect, useState, type ReactNode } from 'react'
import { LogOut, Moon, Sun, MoreHorizontal, X } from 'lucide-react'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem, type TabKey } from './nav-items'
import { useTheme } from '../../lib/useTheme'

interface AppShellProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  userEmail: string
  onSignOut: () => void
  children: ReactNode
}

export function AppShell({ activeTab, onTabChange, userEmail, onSignOut, children }: AppShellProps) {
  const { theme, setTheme } = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!moreOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [moreOpen])

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  function selectTab(tab: TabKey) {
    onTabChange(tab)
    setMoreOpen(false)
  }

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface md:p-4">
        <div className="mb-6 px-2">
          <span className="text-lg font-semibold text-ink">App Financeiro</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={activeTab === item.key}
              onClick={() => onTabChange(item.key)}
            />
          ))}
          <div className="my-3 border-t border-border" />
          {SECONDARY_NAV.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={activeTab === item.key}
              onClick={() => onTabChange(item.key)}
            />
          ))}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 truncate px-2 text-xs text-ink-muted">{userEmail}</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <span className="text-base font-semibold text-ink">App Financeiro</span>
        <button
          type="button"
          onClick={toggleTheme}
          className="text-ink-muted"
          aria-label="Trocar tema"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      {/* Barra inferior — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden">
        {PRIMARY_NAV.map((item) => (
          <BottomNavButton
            key={item.key}
            item={item}
            active={activeTab === item.key}
            onClick={() => onTabChange(item.key)}
          />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
            SECONDARY_NAV.some((i) => i.key === activeTab) ? 'text-primary' : 'text-ink-muted'
          }`}
        >
          <MoreHorizontal size={20} />
          Mais
        </button>
      </nav>

      {/* Painel "Mais" — mobile */}
      {moreOpen && (
        <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-ink">Mais opções</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Fechar">
                <X size={20} className="text-ink-muted" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {SECONDARY_NAV.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={activeTab === item.key}
                  onClick={() => selectTab(item.key)}
                />
              ))}
              <div className="my-2 border-t border-border" />
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active
          ? 'bg-primary-muted font-medium text-primary'
          : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
      }`}
    >
      <Icon size={18} />
      {item.label}
    </button>
  )
}

function BottomNavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
        active ? 'text-primary' : 'text-ink-muted'
      }`}
    >
      <Icon size={20} />
      {item.label}
    </button>
  )
}
