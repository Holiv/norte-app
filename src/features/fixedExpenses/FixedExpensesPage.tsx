import { useEffect, useState, type FormEvent } from 'react'
import {
  createFixedExpense,
  deleteFixedExpense,
  listFixedExpenses,
  updateFixedExpense,
} from './api'
import type { FixedExpense } from './types'

export function FixedExpensesPage() {
  const [items, setItems] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [valorEsperado, setValorEsperado] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setItems(await listFixedExpenses())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function startEdit(item: FixedExpense) {
    setEditingId(item.id)
    setNome(item.nome)
    setValorEsperado(String(item.valor_esperado))
  }

  function cancelEdit() {
    setEditingId(null)
    setNome('')
    setValorEsperado('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const input = { nome, valor_esperado: Number(valorEsperado) }
      if (editingId) {
        await updateFixedExpense(editingId, input)
      } else {
        await createFixedExpense(input)
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
      await deleteFixedExpense(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="fixed-expenses-page">
      <h2>Contas fixas</h2>
      <p className="page-hint">
        Contas recorrentes (aluguel, internet, etc.). O valor esperado entra no cálculo do
        "livre do mês" desde o dia 1 — se você vincular a transação real do mês a essa conta
        fixa, o cálculo passa a usar o valor real no lugar do esperado.
      </p>

      <form onSubmit={handleSubmit} className="inline-form">
        <input
          type="text"
          placeholder="Nome (ex: Aluguel)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Valor mensal esperado (R$)"
          value={valorEsperado}
          onChange={(e) => setValorEsperado(e.target.value)}
          min="0"
          step="0.01"
          required
        />
        <button type="submit" disabled={submitting}>
          {editingId ? 'Salvar' : 'Adicionar'}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : items.length === 0 ? (
        <p>Nenhuma conta fixa cadastrada ainda.</p>
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>
                {item.nome} <em>(R$ {item.valor_esperado.toFixed(2)}/mês)</em>
              </span>
              <span className="item-actions">
                <button type="button" onClick={() => startEdit(item)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(item.id)}>
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
