import { useEffect, useState, type FormEvent } from 'react'
import { createIncomeSource, deleteIncomeSource, listIncomeSources, updateIncomeSource } from './api'
import { PERIODICIDADE_OPTIONS, type IncomeSource, type IncomeType } from './types'

export function IncomePage() {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  function startEdit(source: IncomeSource) {
    setEditingId(source.id)
    setNome(source.nome)
    setTipo(source.tipo)
    setPeriodicidade(source.periodicidade ?? PERIODICIDADE_OPTIONS[0])
    setValorEsperado(source.valor_esperado != null ? String(source.valor_esperado) : '')
  }

  function cancelEdit() {
    setEditingId(null)
    setNome('')
    setTipo('fixa')
    setPeriodicidade(PERIODICIDADE_OPTIONS[0])
    setValorEsperado('')
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
      await deleteIncomeSource(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="income-page">
      <h2>Fontes de renda</h2>

      <form onSubmit={handleSubmit} className="inline-form">
        <input
          type="text"
          placeholder="Nome (ex: Salário CLT)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as IncomeType)}>
          <option value="fixa">Fixa</option>
          <option value="variavel">Variável</option>
        </select>
        <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
          {PERIODICIDADE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {tipo === 'fixa' && (
          <input
            type="number"
            placeholder="Valor mensal esperado (R$)"
            value={valorEsperado}
            onChange={(e) => setValorEsperado(e.target.value)}
            min="0"
            step="0.01"
            required
          />
        )}
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
      ) : sources.length === 0 ? (
        <p>Nenhuma fonte de renda cadastrada ainda.</p>
      ) : (
        <ul className="item-list">
          {sources.map((source) => (
            <li key={source.id}>
              <span>
                {source.nome}{' '}
                <em>
                  ({source.tipo === 'fixa' ? 'Fixa' : 'Variável'}
                  {source.periodicidade ? `, ${source.periodicidade}` : ''}
                  {source.valor_esperado != null
                    ? `, R$ ${source.valor_esperado.toFixed(2)}/mês`
                    : ''}
                  )
                </em>
              </span>
              <span className="item-actions">
                <button type="button" onClick={() => startEdit(source)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(source.id)}>
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
