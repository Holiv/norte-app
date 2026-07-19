import { useEffect, useState } from 'react'
import { fetchLivreDoMes } from './api'
import type { LivreDoMesResult } from '../../lib/calc/livreDoMes'

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesAtualLabel(): string {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function DashboardPage() {
  const [result, setResult] = useState<LivreDoMesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setResult(await fetchLivreDoMes())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="dashboard-page">
      <h2>Dashboard</h2>
      <p className="page-hint">Livre do mês — {mesAtualLabel()}</p>

      {loading && <p>Carregando...</p>}
      {error && <p className="form-error">{error}</p>}

      {result && (
        <>
          <div className="livre-do-mes-card">
            <span className={result.livre >= 0 ? 'livre-valor positivo' : 'livre-valor negativo'}>
              {formatBRL(result.livre)}
            </span>
            <button type="button" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          </div>

          {expanded && (
            <div className="livre-do-mes-detalhe">
              <div className="detalhe-linha">
                <span>Renda fixa</span>
                <span>{formatBRL(result.rendaFixa)}</span>
              </div>
              <div className="detalhe-linha">
                <span>Renda variável recebida</span>
                <span>{formatBRL(result.rendaVariavelRecebida)}</span>
              </div>
              <div className="detalhe-linha detalhe-subtotal">
                <span>Renda total</span>
                <span>{formatBRL(result.rendaTotal)}</span>
              </div>
              <div className="detalhe-linha">
                <span>Dívidas ativas</span>
                <span>− {formatBRL(result.dividasAtivas)}</span>
              </div>
              <div className="detalhe-linha">
                <span>Contas fixas</span>
                <span>− {formatBRL(result.contasFixas)}</span>
              </div>
              {result.detalheContasFixas.length > 0 && (
                <ul className="detalhe-contas-fixas">
                  {result.detalheContasFixas.map((d) => (
                    <li key={d.id}>
                      {d.nome}: {formatBRL(d.usado)}
                      {d.real != null ? ' (lançado)' : ' (esperado)'}
                    </li>
                  ))}
                </ul>
              )}
              <div className="detalhe-linha">
                <span>Guarda mínima</span>
                <span>− {formatBRL(result.guardaMinima)}</span>
              </div>
              <div className="detalhe-linha detalhe-total">
                <span>Livre do mês</span>
                <span>{formatBRL(result.livre)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
