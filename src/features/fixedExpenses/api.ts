import { supabase } from '../../lib/supabaseClient'
import type { FixedExpense } from './types'

export interface FixedExpenseInput {
  nome: string
  valor_esperado: number
}

export async function listFixedExpenses(): Promise<FixedExpense[]> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createFixedExpense(input: FixedExpenseInput): Promise<FixedExpense> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFixedExpense(
  id: string,
  input: FixedExpenseInput,
): Promise<FixedExpense> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
  if (error) throw error
}
