// Sugestão de gastos por categoria (CP3, item 11 do arquitetura-app-financas.md).
// Função pura: recebe dados já buscados, não acessa rede/Supabase — testável isolada.
//
// Base: média histórica de gasto discricionário por categoria (últimos N meses,
// default 3), excluindo transações vinculadas a conta fixa (já contadas em
// "contas fixas" do livre do mês). Distribui o livre do mês atual
// proporcionalmente a essa média. Categoria sem histórico no período fica de
// fora da sugestão.

export interface SpendingTransactionCalcInput {
  categoryId: string
  valor: number
  data: string // 'YYYY-MM-DD'
  fixedExpenseId: string | null
}

export interface SpendingCategoryCalcInput {
  id: string
  nome: string
}

export interface SpendingSuggestionInput {
  transactions: SpendingTransactionCalcInput[]
  categories: SpendingCategoryCalcInput[]
  livreDoMes: number
  monthsWindow?: number
  referenceDate?: Date
}

export interface SpendingCategorySuggestion {
  categoryId: string
  nome: string
  mediaHistorica: number
  sugestao: number
}

export interface SpendingSuggestionResult {
  categorias: SpendingCategorySuggestion[]
}

function mesesAnteriores(referenceDate: Date, n: number): Set<string> {
  const meses = new Set<string>()
  for (let i = 1; i <= n; i++) {
    const d = new Date(referenceDate)
    d.setUTCMonth(d.getUTCMonth() - i)
    meses.add(d.toISOString().slice(0, 7))
  }
  return meses
}

export function calcularSugestaoDeGastos(input: SpendingSuggestionInput): SpendingSuggestionResult {
  const referenceDate = input.referenceDate ?? new Date()
  const n = input.monthsWindow ?? 3
  const janela = mesesAnteriores(referenceDate, n)

  const gastosDiscricionarios = input.transactions.filter(
    (tx) => tx.fixedExpenseId == null && janela.has(tx.data.slice(0, 7)),
  )

  const somaPorCategoria = new Map<string, number>()
  for (const tx of gastosDiscricionarios) {
    somaPorCategoria.set(tx.categoryId, (somaPorCategoria.get(tx.categoryId) ?? 0) + tx.valor)
  }

  let totalMedia = 0
  const mediaPorCategoria = new Map<string, number>()
  for (const [categoryId, soma] of somaPorCategoria) {
    const media = soma / n
    mediaPorCategoria.set(categoryId, media)
    totalMedia += media
  }

  if (totalMedia <= 0 || input.livreDoMes <= 0) {
    return { categorias: [] }
  }

  const categorias: SpendingCategorySuggestion[] = []
  for (const [categoryId, media] of mediaPorCategoria) {
    const categoria = input.categories.find((c) => c.id === categoryId)
    if (!categoria) continue
    categorias.push({
      categoryId,
      nome: categoria.nome,
      mediaHistorica: media,
      sugestao: (media / totalMedia) * input.livreDoMes,
    })
  }

  categorias.sort((a, b) => b.sugestao - a.sugestao)
  return { categorias }
}
