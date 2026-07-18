import { useState } from 'react'
import './App.css'
import { useAuth } from './features/auth/useAuth'
import { AuthForm } from './features/auth/AuthForm'
import { AccountsPage } from './features/accounts/AccountsPage'
import { IncomePage } from './features/income/IncomePage'

const TABS = [
  { key: 'accounts', label: 'Contas' },
  { key: 'income', label: 'Rendas' },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const { session, loading, signOut } = useAuth()
  const [tab, setTab] = useState<TabKey>('accounts')

  if (loading) {
    return (
      <main>
        <p>Carregando...</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main>
        <AuthForm />
      </main>
    )
  }

  return (
    <main>
      <header className="app-header">
        <h1>App Financeiro</h1>
        <div>
          <span>{session.user.email}</span>
          <button type="button" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'accounts' && <AccountsPage />}
      {tab === 'income' && <IncomePage />}
    </main>
  )
}

export default App
