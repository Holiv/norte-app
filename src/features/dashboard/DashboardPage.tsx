import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { fetchLivreDoMes } from './api'
import type { LivreDoMesResult } from '../../lib/calc/livreDoMes'
import { Card, Button, Badge } from '../../components/ui'

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesAtualLabel(): string {
  const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
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

  const positivo = (result?.livre ?? 0) >= 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Dashboard</h2>
        <p className="text-sm text-ink-muted">{mesAtualLabel()}</p>
      </div>

      {loading && <p className="text-sm text-ink-muted">Carregando...</p>}
      {error && <p className="text-sm text-negative">{error}</p>}

      {result && (
        <Card padding={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="mb-1 text-sm text-ink-muted">Livre do mês</p>
              <p className={`text-4xl font-semibold ${positivo ? 'text-primary' : 'text-negative'}`}>
                {formatBRL(result.livre)}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
              <ChevronDown
                size={16}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>

          {expanded && (
            <div className="border-t border-border">
              <div className="bg-surface-2 px-5 py-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Entradas
                </p>
                <Row label="Renda fixa" value={formatBRL(result.rendaFixa)} />
                <Row
                  label="Renda variável recebida"
                  value={formatBRL(result.rendaVariavelRecebida)}
                />
                <Row label="Renda total" value={formatBRL(result.rendaTotal)} strong />
              </div>

              <div className="border-t border-border px-5 py-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Saídas
                </p>
                <Row label="Dívidas ativas" value={`− ${formatBRL(result.dividasAtivas)}`} />
                <Row label="Contas fixas" value={`− ${formatBRL(result.contasFixas)}`} />
                {result.detalheContasFixas.length > 0 && (
                  <ul className="mb-2 ml-1 flex flex-col gap-1 border-l border-border pl-3">
                    {result.detalheContasFixas.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 py-0.5 text-xs text-ink-muted"
                      >
                        {d.nome}: {formatBRL(d.usado)}
                        <Badge tone={d.real != null ? 'primary' : 'neutral'}>
                          {d.real != null ? 'lançado' : 'esperado'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <Row label="Guarda mínima" value={`− ${formatBRL(result.guardaMinima)}`} />
              </div>

              <div
                className={`flex items-center justify-between px-5 py-4 ${
                  positivo ? 'bg-primary-muted' : 'bg-negative-muted'
                }`}
              >
                <span className="font-semibold text-ink">Livre do mês</span>
                <span className={`text-lg font-semibold ${positivo ? 'text-primary' : 'text-negative'}`}>
                  {formatBRL(result.livre)}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 text-sm ${
        strong ? 'mt-1 border-t border-border pt-2 font-medium text-ink' : 'text-ink-muted'
      }`}
    >
      <span>{label}</span>
      <span className={strong ? 'text-ink' : ''}>{value}</span>
    </div>
  )
}
