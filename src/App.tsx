import './App.css'
import { useAuth } from './features/auth/useAuth'
import { AuthForm } from './features/auth/AuthForm'
import { AccountsPage } from './features/accounts/AccountsPage'

function App() {
  const { session, loading, signOut } = useAuth()

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

      <AccountsPage />
    </main>
  )
}

export default App
