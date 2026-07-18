import { useEffect, useState, type FormEvent } from 'react'
import { getBudgetRule, setReservaMinima } from './api'

export function SettingsPage() {
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
    <section className="settings-page">
      <h2>Configurações</h2>

      <form onSubmit={handleSubmit} className="debt-form">
        <label>
          Guarda mínima do mês (R$)
          <input
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
        </label>
        <p className="page-hint">
          Quanto você quer garantir que sobra/vai pra investimento este mês, no mínimo. Vale a
          partir de agora — ajuste sempre que quiser.
        </p>

        <div className="debt-form-actions">
          <button type="submit" disabled={submitting || loading}>
            Salvar
          </button>
        </div>
      </form>

      {saved && <p className="form-success">Salvo.</p>}
      {error && <p className="form-error">{error}</p>}
    </section>
  )
}
