import './App.css'
import { useAuth } from './features/auth/useAuth'
import { AuthForm } from './features/auth/AuthForm'

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
      <h1>App Financeiro</h1>
      <p>Logado como {session.user.email}</p>
      <button type="button" onClick={signOut}>
        Sair
      </button>
    </main>
  )
}

export default App
