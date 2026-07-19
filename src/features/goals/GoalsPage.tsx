import { useEffect, useState, type FormEvent } from 'react'
import { Target, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createGoal,
  createGoalContribution,
  deleteGoal,
  listAllGoalContributions,
  listGoals,
  updateGoal,
} from './api'
import type { Goal, GoalContribution, GoalContributionTipo, GoalModo } from './types'
import { calcularReprojecaoMeta } from '../../lib/calc/metaReprojection'
import { Badge, Button, Card, Field, Input, Modal, Select } from '../../components/ui'

interface FormState {
  nome: string
  valorAlvo: string
  modo: GoalModo
  prazoMeses: string
  aporteMensal: string
  taxaRetornoAnualPct: string
}

const EMPTY_FORM: FormState = {
  nome: '',
  valorAlvo: '',
  modo: 'prazo',
  prazoMeses: '',
  aporteMensal: '',
  taxaRetornoAnualPct: '',
}

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [contributeFor, setContributeFor] = useState<Goal | null>(null)
  const [contribValor, setContribValor] = useState('')
  const [contribData, setContribData] = useState('')
  const [contribTipo, setContribTipo] = useState<GoalContributionTipo>('fixo')

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [g, c] = await Promise.all([listGoals(), listAllGoalContributions()])
      setGoals(g)
      setContributions(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function valorAcumulado(goalId: string): number {
    return contributions.filter((c) => c.goal_id === goalId).reduce((sum, c) => sum + c.valor, 0)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditingId(goal.id)
    setForm({
      nome: goal.nome,
      valorAlvo: String(goal.valor_alvo),
      modo: goal.modo,
      prazoMeses: goal.prazo_meses != null ? String(goal.prazo_meses) : '',
      aporteMensal: goal.aporte_mensal != null ? String(goal.aporte_mensal) : '',
      taxaRetornoAnualPct: String(goal.taxa_retorno_anual * 100),
    })
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const input = {
        nome: form.nome,
        valor_alvo: Number(form.valorAlvo),
        modo: form.modo,
        prazo_meses: form.modo === 'prazo' ? Number(form.prazoMeses) : null,
        aporte_mensal: form.modo === 'aporte' ? Number(form.aporteMensal) : null,
        taxa_retorno_anual: Number(form.taxaRetornoAnualPct) / 100,
      }
      if (editingId) {
        await updateGoal(editingId, input)
      } else {
        await createGoal(input)
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
      await deleteGoal(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function openContribute(goal: Goal) {
    setContributeFor(goal)
    setContribValor('')
    setContribData(new Date().toISOString().slice(0, 10))
    setContribTipo('fixo')
  }

  async function handleContribute(event: FormEvent) {
    event.preventDefault()
    if (!contributeFor) return
    setError(null)
    try {
      await createGoalContribution({
        goal_id: contributeFor.id,
        data: contribData,
        valor: Number(contribValor),
        tipo: contribTipo,
      })
      setContributeFor(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Metas</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Nova meta
        </Button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma meta cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((goal) => {
            const acumulado = valorAcumulado(goal.id)
            const reprojecao = calcularReprojecaoMeta({
              valorAlvo: goal.valor_alvo,
              taxaRetornoAnual: goal.taxa_retorno_anual,
              valorAcumulado: acumulado,
              modo: goal.modo,
              prazoMeses: goal.prazo_meses ?? undefined,
              aporteMensal: goal.aporte_mensal ?? undefined,
            })
            const progresso = Math.min(100, (acumulado / goal.valor_alvo) * 100)

            return (
              <Card key={goal.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                      <Target size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{goal.nome}</p>
                      <Badge tone="neutral">
                        {goal.modo === 'prazo' ? 'Prazo fixo' : 'Aporte fixo'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      aria-label="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal.id)}
                      className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-negative"
                      aria-label="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progresso}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <InfoItem label="Acumulado" value={`${formatBRL(acumulado)} / ${formatBRL(goal.valor_alvo)}`} className="col-span-2" />
                  {goal.modo === 'prazo' ? (
                    <>
                      <InfoItem label="Prazo" value={`${goal.prazo_meses} meses`} />
                      <InfoItem
                        label="Aporte necessário"
                        value={formatBRL(reprojecao.aporteNecessario ?? 0)}
                      />
                    </>
                  ) : (
                    <>
                      <InfoItem label="Aporte mensal" value={formatBRL(goal.aporte_mensal ?? 0)} />
                      <InfoItem
                        label="Prazo estimado"
                        value={
                          reprojecao.prazoNecessarioMeses != null
                            ? `${reprojecao.prazoNecessarioMeses.toFixed(1)} meses`
                            : '—'
                        }
                      />
                    </>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => openContribute(goal)}
                >
                  Registrar aporte
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar meta' : 'Nova meta'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input
              placeholder="Ex: Viagem, Reserva de emergência"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor alvo (R$)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.valorAlvo}
                onChange={(e) => setForm((f) => ({ ...f, valorAlvo: e.target.value }))}
                required
              />
            </Field>
            <Field label="Taxa de retorno esperada (% a.a.)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.taxaRetornoAnualPct}
                onChange={(e) => setForm((f) => ({ ...f, taxaRetornoAnualPct: e.target.value }))}
                required
              />
            </Field>
          </div>

          <Field label="Modo" hint="Prazo fixo: você define o prazo, o app calcula o aporte. Aporte fixo: você define o aporte, o app calcula o prazo.">
            <Select
              value={form.modo}
              onChange={(e) => setForm((f) => ({ ...f, modo: e.target.value as GoalModo }))}
            >
              <option value="prazo">Prazo fixo (calcular aporte)</option>
              <option value="aporte">Aporte fixo (calcular prazo)</option>
            </Select>
          </Field>

          {form.modo === 'prazo' ? (
            <Field label="Prazo desejado (meses)">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.prazoMeses}
                onChange={(e) => setForm((f) => ({ ...f, prazoMeses: e.target.value }))}
                required
              />
            </Field>
          ) : (
            <Field label="Aporte mensal fixo (R$)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.aporteMensal}
                onChange={(e) => setForm((f) => ({ ...f, aporteMensal: e.target.value }))}
                required
              />
            </Field>
          )}

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

      <Modal
        open={contributeFor != null}
        onClose={() => setContributeFor(null)}
        title={`Registrar aporte — ${contributeFor?.nome ?? ''}`}
      >
        <form onSubmit={handleContribute} className="flex flex-col gap-4">
          <Field label="Valor (R$)">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={contribValor}
              onChange={(e) => setContribValor(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={contribData}
              onChange={(e) => setContribData(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Tipo"
            hint="Fixo: parte do ritmo assumido pra reprojeção. Extra: valor pontual que antecipa o prazo sem mudar o ritmo."
          >
            <Select
              value={contribTipo}
              onChange={(e) => setContribTipo(e.target.value as GoalContributionTipo)}
            >
              <option value="fixo">Fixo (aporte planejado do mês)</option>
              <option value="extra">Extra (valor pontual)</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setContributeFor(null)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar</Button>
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
