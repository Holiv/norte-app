import { useEffect, useState, type FormEvent } from 'react'
import { PiggyBank, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react'
import {
  createInvestment,
  createInvestmentContribution,
  deleteInvestment,
  ensurePrevidenciaContribuicaoDoMes,
  listAllInvestmentContributions,
  listInvestments,
  updateInvestment,
} from './api'
import type { Investment, InvestmentContribution, InvestmentTipo } from './types'
import { Badge, Button, Card, Field, Input, Modal, Select } from '../../components/ui'

interface FormState {
  tipo: InvestmentTipo
  nome: string
  salarioBrutoMensal: string
  percentualProprioPct: string
  percentualMatchPct: string
  tetoMatchMensal: string
  aporteMensalPlanejado: string
  taxaRetornoAnualPct: string
}

const EMPTY_FORM: FormState = {
  tipo: 'bruto',
  nome: '',
  salarioBrutoMensal: '',
  percentualProprioPct: '',
  percentualMatchPct: '',
  tetoMatchMensal: '',
  aporteMensalPlanejado: '',
  taxaRetornoAnualPct: '',
}

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [contributions, setContributions] = useState<InvestmentContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [contributeFor, setContributeFor] = useState<Investment | null>(null)
  const [contribValor, setContribValor] = useState('')
  const [contribData, setContribData] = useState('')

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const list = await listInvestments()
      await Promise.all(
        list.filter((i) => i.tipo === 'previdencia').map((i) => ensurePrevidenciaContribuicaoDoMes(i)),
      )
      const [investmentsAtualizados, contribs] = await Promise.all([
        listInvestments(),
        listAllInvestmentContributions(),
      ])
      setInvestments(investmentsAtualizados)
      setContributions(contribs)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function totalAportado(investmentId: string): number {
    return contributions
      .filter((c) => c.investment_id === investmentId)
      .reduce((sum, c) => sum + c.valor, 0)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(inv: Investment) {
    setEditingId(inv.id)
    setForm({
      tipo: inv.tipo,
      nome: inv.nome,
      salarioBrutoMensal: inv.salario_bruto_mensal != null ? String(inv.salario_bruto_mensal) : '',
      percentualProprioPct:
        inv.percentual_proprio != null ? String(inv.percentual_proprio * 100) : '',
      percentualMatchPct: inv.percentual_match != null ? String(inv.percentual_match * 100) : '',
      tetoMatchMensal: inv.teto_match_mensal != null ? String(inv.teto_match_mensal) : '',
      aporteMensalPlanejado:
        inv.aporte_mensal_planejado != null ? String(inv.aporte_mensal_planejado) : '',
      taxaRetornoAnualPct: String(inv.taxa_retorno_anual * 100),
    })
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const isPrevidencia = form.tipo === 'previdencia'
      const input = {
        nome: form.nome,
        tipo: form.tipo,
        salario_bruto_mensal: isPrevidencia ? Number(form.salarioBrutoMensal) : null,
        percentual_proprio: isPrevidencia ? Number(form.percentualProprioPct) / 100 : null,
        percentual_match:
          isPrevidencia && form.percentualMatchPct ? Number(form.percentualMatchPct) / 100 : null,
        teto_match_mensal:
          isPrevidencia && form.tetoMatchMensal ? Number(form.tetoMatchMensal) : null,
        aporte_mensal_planejado: !isPrevidencia && form.aporteMensalPlanejado
          ? Number(form.aporteMensalPlanejado)
          : null,
        taxa_retorno_anual: Number(form.taxaRetornoAnualPct) / 100,
      }
      if (editingId) {
        await updateInvestment(editingId, input)
      } else {
        await createInvestment(input)
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
      await deleteInvestment(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function openContribute(inv: Investment) {
    setContributeFor(inv)
    setContribValor('')
    setContribData(new Date().toISOString().slice(0, 10))
  }

  async function handleContribute(event: FormEvent) {
    event.preventDefault()
    if (!contributeFor) return
    setError(null)
    try {
      await createInvestmentContribution({
        investment_id: contributeFor.id,
        data: contribData,
        valor: Number(contribValor),
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
        <h2 className="text-xl font-semibold text-ink">Investimentos</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Novo investimento
        </Button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : investments.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum investimento cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {investments.map((inv) => (
            <Card key={inv.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                    {inv.tipo === 'previdencia' ? <PiggyBank size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{inv.nome}</p>
                    <Badge tone={inv.tipo === 'previdencia' ? 'primary' : 'neutral'}>
                      {inv.tipo === 'previdencia' ? 'Previdência (automática)' : 'Investimento bruto'}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(inv)}
                    className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(inv.id)}
                    className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-negative"
                    aria-label="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {inv.tipo === 'previdencia' ? (
                  <>
                    <InfoItem
                      label="% do bruto (próprio)"
                      value={`${((inv.percentual_proprio ?? 0) * 100).toFixed(1)}%`}
                    />
                    <InfoItem
                      label="Match da empresa"
                      value={inv.percentual_match ? `${(inv.percentual_match * 100).toFixed(0)}%` : '—'}
                    />
                  </>
                ) : (
                  <InfoItem
                    label="Aporte mensal planejado"
                    value={
                      inv.aporte_mensal_planejado != null
                        ? formatBRL(inv.aporte_mensal_planejado)
                        : '—'
                    }
                  />
                )}
                <InfoItem
                  label="Taxa de retorno"
                  value={`${(inv.taxa_retorno_anual * 100).toFixed(2)}% a.a.`}
                />
                <InfoItem
                  label="Total aportado até agora"
                  value={formatBRL(totalAportado(inv.id))}
                  className="col-span-2"
                />
              </div>

              {inv.tipo === 'bruto' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => openContribute(inv)}
                >
                  Registrar aporte
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar investimento' : 'Novo investimento'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Tipo">
            <Select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as InvestmentTipo }))}
            >
              <option value="bruto">Investimento bruto (Tesouro, ETFs etc.)</option>
              <option value="previdencia">Previdência privada (automática)</option>
            </Select>
          </Field>

          <Field label="Nome">
            <Input
              placeholder={form.tipo === 'previdencia' ? 'Ex: Previdência Corporativa' : 'Ex: ETFs internacionais'}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
              autoFocus
            />
          </Field>

          {form.tipo === 'previdencia' ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Salário bruto mensal (R$)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salarioBrutoMensal}
                  onChange={(e) => setForm((f) => ({ ...f, salarioBrutoMensal: e.target.value }))}
                  required
                />
              </Field>
              <Field label="% do bruto (aporte próprio)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.percentualProprioPct}
                  onChange={(e) => setForm((f) => ({ ...f, percentualProprioPct: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Match da empresa (%)" hint="Ex: 100 = empresa iguala seu aporte">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.percentualMatchPct}
                  onChange={(e) => setForm((f) => ({ ...f, percentualMatchPct: e.target.value }))}
                />
              </Field>
              <Field label="Teto de match mensal (R$, opcional)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tetoMatchMensal}
                  onChange={(e) => setForm((f) => ({ ...f, tetoMatchMensal: e.target.value }))}
                />
              </Field>
              <div className="col-span-2">
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
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Aporte mensal planejado (R$, opcional)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.aporteMensalPlanejado}
                  onChange={(e) => setForm((f) => ({ ...f, aporteMensalPlanejado: e.target.value }))}
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
