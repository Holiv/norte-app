import { supabase } from '../../lib/supabaseClient'
import { calcularLivreDoMes, type LivreDoMesResult } from '../../lib/calc/livreDoMes'
import { calcularWaterfall, type WaterfallResult } from '../../lib/calc/waterfall'
import { calcularSugestaoDeGastos, type SpendingSuggestionResult } from '../../lib/calc/spendingSuggestion'

export async function fetchLivreDoMes(): Promise<LivreDoMesResult> {
  const [incomeRes, txRes, debtsRes, fixedRes, budgetRes, investContribRes, goalContribRes] =
    await Promise.all([
      supabase.from('income_sources').select('id, tipo, valor_esperado'),
      supabase
        .from('transactions')
        .select('direcao, valor, data, income_source_id, fixed_expense_id'),
      supabase.from('debts').select('valor_parcela, data_vencimento'),
      supabase.from('fixed_expenses').select('id, nome, valor_esperado'),
      supabase.from('budget_rules').select('reserva_minima').maybeSingle(),
      supabase.from('investment_contributions').select('valor, data, investments(tipo)'),
      supabase.from('goal_contributions').select('valor, data'),
    ])

  if (incomeRes.error) throw incomeRes.error
  if (txRes.error) throw txRes.error
  if (debtsRes.error) throw debtsRes.error
  if (fixedRes.error) throw fixedRes.error
  if (budgetRes.error) throw budgetRes.error
  if (investContribRes.error) throw investContribRes.error
  if (goalContribRes.error) throw goalContribRes.error

  return calcularLivreDoMes({
    incomeSources: incomeRes.data,
    transactions: txRes.data,
    debts: debtsRes.data,
    fixedExpenses: fixedRes.data,
    reservaMinima: budgetRes.data?.reserva_minima ?? 0,
    investmentContributions: investContribRes.data.map((c) => ({
      valor: c.valor,
      data: c.data,
      investmentTipo: (c.investments as unknown as { tipo: 'previdencia' | 'bruto' }).tipo,
    })),
    goalContributions: goalContribRes.data,
  })
}

export async function fetchWaterfallSuggestion(livreDoMes: number): Promise<WaterfallResult> {
  const hojeISO = new Date().toISOString().slice(0, 10)

  const [debtsRes, investRes] = await Promise.all([
    supabase.from('debts').select('id, nome, taxa_juros_anual, saldo_devedor, data_vencimento'),
    supabase.from('investments').select('taxa_retorno_anual').eq('tipo', 'bruto'),
  ])

  if (debtsRes.error) throw debtsRes.error
  if (investRes.error) throw investRes.error

  const taxaRetornoInvestimentoBruto =
    investRes.data.length > 0 ? Math.max(...investRes.data.map((i) => i.taxa_retorno_anual)) : null

  const dividasAtivas = debtsRes.data.filter(
    (d) => hojeISO <= d.data_vencimento && d.saldo_devedor > 0,
  )

  return calcularWaterfall({
    livreDoMes,
    taxaRetornoInvestimentoBruto,
    dividas: dividasAtivas.map((d) => ({
      id: d.id,
      nome: d.nome,
      taxaJurosAnual: d.taxa_juros_anual,
      saldoDevedor: d.saldo_devedor,
    })),
  })
}

export async function fetchSpendingSuggestion(livreDoMes: number): Promise<SpendingSuggestionResult> {
  const [txRes, catRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('category_id, valor, data, fixed_expense_id')
      .eq('direcao', 'saida'),
    supabase.from('categories').select('id, nome').eq('tipo', 'despesa'),
  ])

  if (txRes.error) throw txRes.error
  if (catRes.error) throw catRes.error

  return calcularSugestaoDeGastos({
    transactions: txRes.data.map((tx) => ({
      categoryId: tx.category_id,
      valor: tx.valor,
      data: tx.data,
      fixedExpenseId: tx.fixed_expense_id,
    })),
    categories: catRes.data,
    livreDoMes,
  })
}
