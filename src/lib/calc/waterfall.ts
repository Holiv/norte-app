// Motor de alocação waterfall (CP4, item 9 do arquitetura-app-financas.md).
// Função pura, 100% consultiva: sugere como usar o livre do mês atual, mas
// não desconta nada sozinho — só quando o usuário registra o aporte de
// verdade (via Investimentos/Metas) é que o livre do mês muda de fato.
//
// Cascata: quita dívida cara (taxa > melhor retorno de investimento
// disponível) rankeada por taxa decrescente, para quando a taxa da próxima
// dívida cai abaixo do retorno do investimento bruto; a sobra vai pro
// investimento bruto (maior retorno). Guarda mínima e previdência não
// entram aqui — já foram protegidas antes de chegar no livre do mês.

export interface WaterfallDebtInput {
  id: string
  nome: string
  taxaJurosAnual: number
  saldoDevedor: number
}

export interface WaterfallInput {
  livreDoMes: number
  taxaRetornoInvestimentoBruto: number | null // null = sem investimento bruto configurado
  dividas: WaterfallDebtInput[]
}

export interface WaterfallDebtSuggestion {
  id: string
  nome: string
  taxaJurosAnual: number
  valorSugerido: number
}

export interface WaterfallResult {
  quitacaoExtraSugerida: WaterfallDebtSuggestion[]
  investimentoBrutoSugerido: number
  restanteNaoAlocado: number // > 0 só quando não há investimento bruto configurado
}

export function calcularWaterfall(input: WaterfallInput): WaterfallResult {
  if (input.livreDoMes <= 0) {
    return { quitacaoExtraSugerida: [], investimentoBrutoSugerido: 0, restanteNaoAlocado: 0 }
  }

  const taxaCorte = input.taxaRetornoInvestimentoBruto ?? -Infinity
  const dividasCaras = [...input.dividas]
    .filter((d) => d.taxaJurosAnual > taxaCorte)
    .sort((a, b) => b.taxaJurosAnual - a.taxaJurosAnual)

  let restante = input.livreDoMes
  const quitacaoExtraSugerida: WaterfallDebtSuggestion[] = []

  for (const divida of dividasCaras) {
    if (restante <= 0) break
    const valorSugerido = Math.min(restante, divida.saldoDevedor)
    if (valorSugerido > 0) {
      quitacaoExtraSugerida.push({
        id: divida.id,
        nome: divida.nome,
        taxaJurosAnual: divida.taxaJurosAnual,
        valorSugerido,
      })
      restante -= valorSugerido
    }
  }

  const investimentoBrutoSugerido = input.taxaRetornoInvestimentoBruto != null ? restante : 0
  const restanteNaoAlocado = input.taxaRetornoInvestimentoBruto != null ? 0 : restante

  return { quitacaoExtraSugerida, investimentoBrutoSugerido, restanteNaoAlocado }
}
