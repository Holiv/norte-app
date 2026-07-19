import { useEffect, useState, type FormEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getBudgetRule, setReservaMinima } from './api'
import { useTheme } from '../../lib/useTheme'
import { Button, Card, Field, Input } from '../../components/ui'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [reservaMinima, setReservaMinimaValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const rule = await getBudgetRule()
      setReservaMinimaValue(rule ? String(rule.reserva_minima) : '0')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      await setReservaMinima(Number(reservaMinima))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-ink">Configurações</h2>

      <Card className="max-w-md">
        <h3 className="mb-3 text-sm font-semibold text-ink">Tema</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-primary-muted text-primary'
                : 'bg-surface-2 text-ink-muted hover:text-ink'
            }`}
          >
            <Moon size={16} />
            Escuro
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-primary-muted text-primary'
                : 'bg-surface-2 text-ink-muted hover:text-ink'
            }`}
          >
            <Sun size={16} />
            Claro
          </button>
        </div>
      </Card>

      <Card className="max-w-md">
        <h3 className="mb-3 text-sm font-semibold text-ink">Guarda mínima do mês</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field
            label="Valor (R$)"
            hint="Quanto você quer garantir que sobra/vai pra investimento este mês, no mínimo. Vale a partir de agora — ajuste sempre que quiser."
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={reservaMinima}
              onChange={(e) => {
                setReservaMinimaValue(e.target.value)
                setSaved(false)
              }}
              disabled={loading}
              required
            />
          </Field>

          {saved && <p className="text-sm text-primary">Salvo.</p>}
          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
