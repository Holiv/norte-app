// Motor "livre do mês" (CP3, item 1 do arquitetura-app-financas.md).
// Função pura: recebe dados já buscados, não acessa rede/Supabase — testável isolada.
//
// livre = rendaFixa + rendaVariavelRecebida - dividasAtivas - contasFixas - guardaMinima
//         - aportesInvestimentoBruto - aportesMetas
//
// Regras (decisões registradas em arquitetura-app-financas.md):
// - Renda fixa: sempre conta o valor_esperado da fonte (não depende de transação lançada).
// - Renda variável: só conta transações de entrada do mês vinculadas a uma fonte do tipo
//   'variavel'. Entradas vinculadas a fonte 'fixa' não somam de novo (já contadas acima).
// - Dívida "ativa" no mês: hoje <= data_vencimento (data prevista de quitação final).
// - Conta fixa: por padrão usa valor_esperado; se houver transação de saída do mês vinculada
//   a ela (fixed_expense_id), usa a soma real lançada no lugar do esperado.
// - Investimento/meta (Fase 3): só desconta o que foi de fato REGISTRADO no mês (nunca o
//   "planejado"). Aportes de previdência nunca entram aqui — já saíram no bruto->líquido
//   antes de chegar no app, contá-los de novo seria descontar duas vezes.

export interface IncomeSourceCalcInput {
  id: string
  tipo: 'fixa' | 'variavel'
  valor_esperado: number | null
}

export interface TransactionCalcInput {
  direcao: 'entrada' | 'saida'
  valor: number
  data: string // 'YYYY-MM-DD'
  income_source_id: string | null
  fixed_expense_id: string | null
}

export interface DebtCalcInput {
  valor_parcela: number
  data_vencimento: string // 'YYYY-MM-DD'
}

export interface FixedExpenseCalcInput {
  id: string
  nome: string
  valor_esperado: number
}

export interface InvestmentContributionCalcInput {
  valor: number
  data: string // 'YYYY-MM-DD'
  investmentTipo: 'previdencia' | 'bruto'
}

export interface GoalContributionCalcInput {
  valor: number
  data: string // 'YYYY-MM-DD'
}

export interface LivreDoMesInput {
  incomeSources: IncomeSourceCalcInput[]
  transactions: TransactionCalcInput[]
  debts: DebtCalcInput[]
  fixedExpenses: FixedExpenseCalcInput[]
  reservaMinima: number
  investmentContributions?: InvestmentContributionCalcInput[]
  goalContributions?: GoalContributionCalcInput[]
  referenceDate?: Date
}

export interface FixedExpenseDetalhe {
  id: string
  nome: string
  esperado: number
  real: number | null
  usado: number
}

export interface LivreDoMesResult {
  rendaFixa: number
  rendaVariavelRecebida: number
  rendaTotal: number
  dividasAtivas: number
  contasFixas: number
  guardaMinima: number
  aportesInvestimentoBruto: number
  aportesMetas: number
  livre: number
  detalheContasFixas: FixedExpenseDetalhe[]
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function mesmoMes(dataISO: string, referenceDate: Date): boolean {
  return dataISO.slice(0, 7) === isoDate(referenceDate).slice(0, 7)
}

export function calcularLivreDoMes(input: LivreDoMesInput): LivreDoMesResult {
  const referenceDate = input.referenceDate ?? new Date()
  const hojeISO = isoDate(referenceDate)

  const rendaFixa = input.incomeSources
    .filter((s) => s.tipo === 'fixa')
    .reduce((sum, s) => sum + (s.valor_esperado ?? 0), 0)

  const fontesVariaveisIds = new Set(
    input.incomeSources.filter((s) => s.tipo === 'variavel').map((s) => s.id),
  )

  const transacoesDoMes = input.transactions.filter((tx) => mesmoMes(tx.data, referenceDate))

  const rendaVariavelRecebida = transacoesDoMes
    .filter(
      (tx) => tx.direcao === 'entrada' && tx.income_source_id != null && fontesVariaveisIds.has(tx.income_source_id),
    )
    .reduce((sum, tx) => sum + tx.valor, 0)

  const dividasAtivas = input.debts
    .filter((d) => hojeISO <= d.data_vencimento)
    .reduce((sum, d) => sum + d.valor_parcela, 0)

  const detalheContasFixas: FixedExpenseDetalhe[] = input.fixedExpenses.map((fe) => {
    const lancamentos = transacoesDoMes.filter(
      (tx) => tx.direcao === 'saida' && tx.fixed_expense_id === fe.id,
    )
    const real = lancamentos.length > 0 ? lancamentos.reduce((sum, tx) => sum + tx.valor, 0) : null
    return {
      id: fe.id,
      nome: fe.nome,
      esperado: fe.valor_esperado,
      real,
      usado: real ?? fe.valor_esperado,
    }
  })

  const contasFixas = detalheContasFixas.reduce((sum, d) => sum + d.usado, 0)

  const aportesInvestimentoBruto = (input.investmentContributions ?? [])
    .filter((c) => c.investmentTipo === 'bruto' && mesmoMes(c.data, referenceDate))
    .reduce((sum, c) => sum + c.valor, 0)

  const aportesMetas = (input.goalContributions ?? [])
    .filter((c) => mesmoMes(c.data, referenceDate))
    .reduce((sum, c) => sum + c.valor, 0)

  const rendaTotal = rendaFixa + rendaVariavelRecebida
  const guardaMinima = input.reservaMinima
  const livre =
    rendaTotal - dividasAtivas - contasFixas - guardaMinima - aportesInvestimentoBruto - aportesMetas

  return {
    rendaFixa,
    rendaVariavelRecebida,
    rendaTotal,
    dividasAtivas,
    contasFixas,
    guardaMinima,
    aportesInvestimentoBruto,
    aportesMetas,
    livre,
    detalheContasFixas,
  }
}
