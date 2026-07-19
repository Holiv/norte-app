import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import {
  createFixedExpense,
  deleteFixedExpense,
  listFixedExpenses,
  updateFixedExpense,
} from './api'
import type { FixedExpense } from './types'
import { Button, Card, Field, Input, Modal } from '../../components/ui'

export function FixedExpensesPage() {
  const [items, setItems] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
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

  function openCreate() {
    setEditingId(null)
    setNome('')
    setValorEsperado('')
    setModalOpen(true)
  }

  function openEdit(item: FixedExpense) {
    setEditingId(item.id)
    setNome(item.nome)
    setValorEsperado(String(item.valor_esperado))
    setModalOpen(true)
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
      setModalOpen(false)
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Contas fixas</h2>
          <p className="mt-1 max-w-md text-sm text-ink-muted">
            Contas recorrentes (aluguel, internet, etc.). O valor esperado entra no "livre do
            mês" desde o dia 1 — se vincular a transação real, o cálculo passa a usar o valor
            lançado no lugar do esperado.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="shrink-0">
          <Plus size={16} />
          Nova conta fixa
        </Button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma conta fixa cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Repeat size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{item.nome}</p>
                  <p className="text-xs text-ink-muted">
                    R$ {item.valor_esperado.toFixed(2)}/mês
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-negative"
                  aria-label="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar conta fixa' : 'Nova conta fixa'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input
              placeholder="Ex: Aluguel"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Valor mensal esperado (R$)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={valorEsperado}
              onChange={(e) => setValorEsperado(e.target.value)}
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
