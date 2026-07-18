import { supabase } from '../../lib/supabaseClient'
import type { BudgetRule } from './types'

export async function getBudgetRule(): Promise<BudgetRule | null> {
  const { data, error } = await supabase.from('budget_rules').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function setReservaMinima(reservaMinima: number): Promise<BudgetRule> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('budget_rules')
    .upsert(
      { user_id: userData.user.id, reserva_minima: reservaMinima, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}
