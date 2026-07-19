import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, TrendingUp } from 'lucide-react'
import {
  createIncomeSource,
  deleteIncomeSource,
  listIncomeSources,
  updateIncomeSource,
} from './api'
import { PERIODICIDADE_OPTIONS, type IncomeSource, type IncomeType } from './types'
import { Badge, Button, Card, Field, Input, Modal, Select } from '../../components/ui'

export function IncomePage() {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<IncomeType>('fixa')
  const [periodicidade, setPeriodicidade] = useState<string>(PERIODICIDADE_OPTIONS[0])
  const [valorEsperado, setValorEsperado] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setSources(await listIncomeSources())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setNome('')
    setTipo('fixa')
    setPeriodicidade(PERIODICIDADE_OPTIONS[0])
    setValorEsperado('')
    setModalOpen(true)
  }

  function openEdit(source: IncomeSource) {
    setEditingId(source.id)
    setNome(source.nome)
    setTipo(source.tipo)
    setPeriodicidade(source.periodicidade ?? PERIODICIDADE_OPTIONS[0])
    setValorEsperado(source.valor_esperado != null ? String(source.valor_esperado) : '')
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const input = {
        nome,
        tipo,
        periodicidade,
        valor_esperado: tipo === 'fixa' ? Number(valorEsperado) : null,
      }
      if (editingId) {
        await updateIncomeSource(editingId, input)
      } else {
        await createIncomeSource(input)
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
      await deleteIncomeSource(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Rendas</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Nova fonte
        </Button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : sources.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma fonte de renda cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sources.map((source) => (
            <Card key={source.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{source.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={source.tipo === 'fixa' ? 'primary' : 'neutral'}>
                      {source.tipo === 'fixa' ? 'Fixa' : 'Variável'}
                    </Badge>
                    {source.valor_esperado != null && (
                      <span className="text-xs text-ink-muted">
                        R$ {source.valor_esperado.toFixed(2)}/mês
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(source)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(source.id)}
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
        title={editingId ? 'Editar fonte de renda' : 'Nova fonte de renda'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input
              placeholder="Ex: Salário CLT"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as IncomeType)}>
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
            </Select>
          </Field>
          <Field label="Periodicidade">
            <Select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
              {PERIODICIDADE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          {tipo === 'fixa' && (
            <Field
              label="Valor mensal esperado (R$)"
              hint="Sempre o equivalente mensal, mesmo que receba em outra periodicidade"
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={valorEsperado}
                onChange={(e) => setValorEsperado(e.target.value)}
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
    </div>
  )
}
