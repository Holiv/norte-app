// Motor de reprojeção de metas (CP4, item 10 do arquitetura-app-financas.md).
// Função pura: recebe dados já buscados, não acessa rede/Supabase — testável isolada.
//
// Taxa mensal derivada da anual por composição: i = (1+taxa_anual)^(1/12) - 1 (nunca anual/12).
//
// Dois modos:
// - 'prazo': usuário fixa prazo_meses e valor_alvo -> calcula o aporte mensal necessário.
//   PMT = [V − A·(1+i)ⁿ]·i / [(1+i)ⁿ − 1]
// - 'aporte': usuário fixa aporte_mensal (ritmo fixo) e valor_alvo -> calcula o prazo necessário.
//   n = ln[(V·i + PMT)/(A·i + PMT)] / ln(1+i)
//
// "Extras" (lump sums) entram no valorAcumulado (A) mas nunca alteram o ritmo assumido
// (aporteMensal) — só antecipam o prazo. O app nunca assume repetição de extras.

export interface GoalReprojectionInput {
  valorAlvo: number
  taxaRetornoAnual: number // fração decimal
  valorAcumulado: number // soma de todos os aportes (fixo + extra) até agora
  modo: 'prazo' | 'aporte'
  prazoMeses?: number // usado quando modo === 'prazo'
  aporteMensal?: number // usado quando modo === 'aporte'
}

export interface GoalReprojectionResult {
  taxaMensal: number
  aporteNecessario?: number // presente quando modo === 'prazo'
  prazoNecessarioMeses?: number // presente quando modo === 'aporte'
}

function taxaMensal(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1
}

export function calcularReprojecaoMeta(input: GoalReprojectionInput): GoalReprojectionResult {
  const i = taxaMensal(input.taxaRetornoAnual)
  const A = input.valorAcumulado
  const V = input.valorAlvo

  if (input.modo === 'prazo') {
    const n = input.prazoMeses ?? 0
    if (i === 0) {
      const aporteNecessario = n > 0 ? (V - A) / n : V - A
      return { taxaMensal: i, aporteNecessario }
    }
    const fatorN = Math.pow(1 + i, n)
    const aporteNecessario = ((V - A * fatorN) * i) / (fatorN - 1)
    return { taxaMensal: i, aporteNecessario }
  }

  const PMT = input.aporteMensal ?? 0
  if (A >= V) {
    return { taxaMensal: i, prazoNecessarioMeses: 0 }
  }
  if (i === 0) {
    const prazoNecessarioMeses = PMT > 0 ? (V - A) / PMT : Infinity
    return { taxaMensal: i, prazoNecessarioMeses }
  }
  const prazoNecessarioMeses = Math.log((V * i + PMT) / (A * i + PMT)) / Math.log(1 + i)
  return { taxaMensal: i, prazoNecessarioMeses }
}
