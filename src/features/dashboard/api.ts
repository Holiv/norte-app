import { supabase } from '../../lib/supabaseClient'
import { calcularLivreDoMes, type LivreDoMesResult } from '../../lib/calc/livreDoMes'

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
