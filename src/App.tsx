import { useState } from 'react'
import './App.css'
import { useAuth } from './features/auth/useAuth'
import { AuthForm } from './features/auth/AuthForm'
import { AccountsPage } from './features/accounts/AccountsPage'
import { IncomePage } from './features/income/IncomePage'
import { DebtsPage } from './features/debts/DebtsPage'
import { TransactionsPage } from './features/transactions/TransactionsPage'
import { FixedExpensesPage } from './features/fixedExpenses/FixedExpensesPage'
import { SettingsPage } from './features/budget/SettingsPage'
import { DashboardPage } from './features/dashboard/DashboardPage'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'transactions', label: 'Transações' },
  { key: 'accounts', label: 'Contas' },
  { key: 'income', label: 'Rendas' },
  { key: 'debts', label: 'Dívidas' },
  { key: 'fixedExpenses', label: 'Contas fixas' },
  { key: 'settings', label: 'Configurações' },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const { session, loading, signOut } = useAuth()
  const [tab, setTab] = useState<TabKey>('dashboard')

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

      {tab === 'dashboard' && <DashboardPage />}
      {tab === 'transactions' && <TransactionsPage />}
      {tab === 'accounts' && <AccountsPage />}
      {tab === 'income' && <IncomePage />}
      {tab === 'debts' && <DebtsPage />}
      {tab === 'fixedExpenses' && <FixedExpensesPage />}
      {tab === 'settings' && <SettingsPage />}
    </main>
  )
}

export default App
