import { useEffect, useState, type FormEvent } from 'react'
import { createDebt, deleteDebt, listDebts, updateDebt } from './api'
import type { Debt } from './types'

interface FormState {
  nome: string
  valorPrincipal: string
  taxaJurosAnualPct: string
  valorParcela: string
  saldoDevedor: string
  prazoMeses: string
  dataVencimento: string
}

const EMPTY_FORM: FormState = {
  nome: '',
  valorPrincipal: '',
  taxaJurosAnualPct: '',
  valorParcela: '',
  saldoDevedor: '',
  prazoMeses: '',
  dataVencimento: '',
}

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setDebts(await listDebts())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function startEdit(debt: Debt) {
    setEditingId(debt.id)
    setForm({
      nome: debt.nome,
      valorPrincipal: String(debt.valor_principal),
      taxaJurosAnualPct: String(debt.taxa_juros_anual * 100),
      valorParcela: String(debt.valor_parcela),
      saldoDevedor: String(debt.saldo_devedor),
      prazoMeses: String(debt.prazo_meses),
      dataVencimento: debt.data_vencimento,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      // Ao preencher o valor principal, pré-preenche o saldo devedor (mesmo valor)
      // se o usuário ainda não tiver mexido nele — dívida nova, nada pago ainda.
      if (key === 'valorPrincipal' && !editingId && f.saldoDevedor === '') {
        next.saldoDevedor = value
      }
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const input = {
        nome: form.nome,
        valor_principal: Number(form.valorPrincipal),
        taxa_juros_anual: Number(form.taxaJurosAnualPct) / 100,
        valor_parcela: Number(form.valorParcela),
        saldo_devedor: Number(form.saldoDevedor),
        prazo_meses: Number(form.prazoMeses),
        data_vencimento: form.dataVencimento,
      }
      if (editingId) {
        await updateDebt(editingId, input)
      } else {
        await createDebt(input)
      }
      cancelEdit()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteDebt(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="debts-page">
      <h2>Dívidas</h2>

      <form onSubmit={handleSubmit} className="debt-form">
        <label>
          Nome
          <input
            type="text"
            placeholder="Ex: Financiamento do carro"
            value={form.nome}
            onChange={(e) => updateField('nome', e.target.value)}
            required
          />
        </label>

        <div className="debt-form-grid">
          <label>
            Valor principal (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valorPrincipal}
              onChange={(e) => updateField('valorPrincipal', e.target.value)}
              required
            />
          </label>

          <label>
            Saldo devedor atual (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.saldoDevedor}
              onChange={(e) => updateField('saldoDevedor', e.target.value)}
              required
            />
          </label>

          <label>
            Taxa de juros (% a.a.)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.taxaJurosAnualPct}
              onChange={(e) => updateField('taxaJurosAnualPct', e.target.value)}
              required
            />
          </label>

          <label>
            Valor da parcela (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valorParcela}
              onChange={(e) => updateField('valorParcela', e.target.value)}
              required
            />
          </label>

          <label>
            Prazo (meses)
            <input
              type="number"
              min="1"
              step="1"
              value={form.prazoMeses}
              onChange={(e) => updateField('prazoMeses', e.target.value)}
              required
            />
          </label>

          <label>
            Quitação prevista
            <input
              type="date"
              value={form.dataVencimento}
              onChange={(e) => updateField('dataVencimento', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="debt-form-actions">
          <button type="submit" disabled={submitting}>
            {editingId ? 'Salvar' : 'Adicionar'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : debts.length === 0 ? (
        <p>Nenhuma dívida cadastrada ainda.</p>
      ) : (
        <ul className="item-list">
          {debts.map((debt) => (
            <li key={debt.id}>
              <span>
                {debt.nome}{' '}
                <em>
                  (saldo R$ {debt.saldo_devedor.toFixed(2)}, parcela R${' '}
                  {debt.valor_parcela.toFixed(2)}, {(debt.taxa_juros_anual * 100).toFixed(2)}%
                  a.a., {debt.prazo_meses}x, quitação {debt.data_vencimento})
                </em>
              </span>
              <span className="item-actions">
                <button type="button" onClick={() => startEdit(debt)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(debt.id)}>
                  Excluir
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
