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
import { AppShell } from './components/layout/AppShell'
import type { TabKey } from './components/layout/nav-items'

function App() {
  const { session, loading, signOut } = useAuth()
  const [tab, setTab] = useState<TabKey>('dashboard')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink-muted">
        Carregando...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <AuthForm />
      </div>
    )
  }

  return (
    <AppShell
      activeTab={tab}
      onTabChange={setTab}
      userEmail={session.user.email ?? ''}
      onSignOut={signOut}
    >
      {tab === 'dashboard' && <DashboardPage />}
      {tab === 'transactions' && <TransactionsPage />}
      {tab === 'accounts' && <AccountsPage />}
      {tab === 'income' && <IncomePage />}
      {tab === 'debts' && <DebtsPage />}
      {tab === 'fixedExpenses' && <FixedExpensesPage />}
      {tab === 'settings' && <SettingsPage />}
    </AppShell>
  )
}

export default App
