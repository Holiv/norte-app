import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function AuthForm() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setSubmitting(false)
    if (authError) {
      setError(authError.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>{mode === 'signIn' ? 'Entrar' : 'Criar conta'}</h1>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>

      <label>
        Senha
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
        />
      </label>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Aguarde...' : mode === 'signIn' ? 'Entrar' : 'Criar conta'}
      </button>

      <button
        type="button"
        className="auth-toggle"
        onClick={() => {
          setError(null)
          setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
        }}
      >
        {mode === 'signIn' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
      </button>
    </form>
  )
}
