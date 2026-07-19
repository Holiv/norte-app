import { useState, type FormEvent } from 'react'
import { Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card, Field, Input } from '../../components/ui'

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
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted text-primary">
          <Wallet size={24} />
        </div>
        <h1 className="text-lg font-semibold text-ink">App Financeiro</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ink">
            {mode === 'signIn' ? 'Entrar' : 'Criar conta'}
          </h2>

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>

          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            />
          </Field>

          {error && <p className="text-sm text-negative">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Aguarde...' : mode === 'signIn' ? 'Entrar' : 'Criar conta'}
          </Button>

          <button
            type="button"
            className="text-sm text-ink-muted underline-offset-2 hover:text-primary hover:underline"
            onClick={() => {
              setError(null)
              setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
            }}
          >
            {mode === 'signIn' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
          </button>
        </form>
      </Card>
    </div>
  )
}
