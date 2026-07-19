import { supabase } from '../../lib/supabaseClient'
import { calcularLivreDoMes, type LivreDoMesResult } from '../../lib/calc/livreDoMes'

export async function fetchLivreDoMes(): Promise<LivreDoMesResult> {
  const [incomeRes, txRes, debtsRes, fixedRes, budgetRes] = await Promise.all([
    supabase.from('income_sources').select('id, tipo, valor_esperado'),
    supabase
      .from('transactions')
      .select('direcao, valor, data, income_source_id, fixed_expense_id'),
    supabase.from('debts').select('valor_parcela, data_vencimento'),
    supabase.from('fixed_expenses').select('id, nome, valor_esperado'),
    supabase.from('budget_rules').select('reserva_minima').maybeSingle(),
  ])

  if (incomeRes.error) throw incomeRes.error
  if (txRes.error) throw txRes.error
  if (debtsRes.error) throw debtsRes.error
  if (fixedRes.error) throw fixedRes.error
  if (budgetRes.error) throw budgetRes.error

  return calcularLivreDoMes({
    incomeSources: incomeRes.data,
    transactions: txRes.data,
    debts: debtsRes.data,
    fixedExpenses: fixedRes.data,
    reservaMinima: budgetRes.data?.reserva_minima ?? 0,
  })
}
