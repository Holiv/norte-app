import { useEffect, useState, type FormEvent } from 'react'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { createDebt, deleteDebt, listDebts, updateDebt } from './api'
import type { Debt } from './types'
import { Button, Card, Field, Input, Modal } from '../../components/ui'

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
  const [modalOpen, setModalOpen] = useState(false)
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

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(debt: Debt) {
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
    setModalOpen(true)
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
      await deleteDebt(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Dívidas</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Nova dívida
        </Button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : debts.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma dívida cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {debts.map((debt) => (
            <Card key={debt.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                    <CreditCard size={18} />
                  </div>
                  <p className="text-sm font-medium text-ink">{debt.nome}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(debt)}
                    className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(debt.id)}
                    className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-negative"
                    aria-label="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <InfoItem label="Saldo devedor" value={`R$ ${debt.saldo_devedor.toFixed(2)}`} />
                <InfoItem label="Parcela" value={`R$ ${debt.valor_parcela.toFixed(2)}`} />
                <InfoItem label="Taxa" value={`${(debt.taxa_juros_anual * 100).toFixed(2)}% a.a.`} />
                <InfoItem label="Prazo" value={`${debt.prazo_meses}x`} />
                <InfoItem label="Quitação prevista" value={debt.data_vencimento} className="col-span-2" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar dívida' : 'Nova dívida'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input
              placeholder="Ex: Financiamento do carro"
              value={form.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              required
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor principal (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorPrincipal}
                onChange={(e) => updateField('valorPrincipal', e.target.value)}
                required
              />
            </Field>
            <Field label="Saldo devedor (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.saldoDevedor}
                onChange={(e) => updateField('saldoDevedor', e.target.value)}
                required
              />
            </Field>
            <Field label="Taxa de juros (% a.a.)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.taxaJurosAnualPct}
                onChange={(e) => updateField('taxaJurosAnualPct', e.target.value)}
                required
              />
            </Field>
            <Field label="Valor da parcela (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorParcela}
                onChange={(e) => updateField('valorParcela', e.target.value)}
                required
              />
            </Field>
            <Field label="Prazo (meses)">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.prazoMeses}
                onChange={(e) => updateField('prazoMeses', e.target.value)}
                required
              />
            </Field>
            <Field label="Quitação prevista">
              <Input
                type="date"
                value={form.dataVencimento}
                onChange={(e) => updateField('dataVencimento', e.target.value)}
                required
              />
            </Field>
          </div>

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

function InfoItem({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-ink-muted">{label}</p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  )
}
